import express from "express";
const app = express();
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
  /* options */
});

const rooms: Record<string, string[]> = {};

const EmailsWithSocketIds: Map<string, string> = new Map();

io.on("connection", (socket) => {
  socket.on(
    "join-room",
    ({ roomId, email }: { roomId: string; email: string }) => {
      if (!rooms[roomId]) {
        rooms[roomId] = [];
      }

      if (rooms[roomId].includes(email)) return;

      if (rooms[roomId].length > 0) socket.emit("existing-user", rooms[roomId]);

      socket.join(roomId);
      rooms[roomId].push(email);
      EmailsWithSocketIds.set(email, socket.id);
      console.log(rooms[roomId]);
      socket.to(roomId).emit("user-joined", { email });
    }
  );

  socket.on("create-offer", ({ to, offer, from }) => {
    const otherPersonSocketId = EmailsWithSocketIds.get(to);
    if (otherPersonSocketId)
      socket.to(otherPersonSocketId).emit("offer-received", { offer, from });
  });
  socket.on("create-answer", ({ to, answer, from }) => {
    const otherPersonSocketId = EmailsWithSocketIds.get(to);
    if (otherPersonSocketId)
      socket.to(otherPersonSocketId).emit("answer-received", { answer, from });
  });

  socket.on("ice-candidate", ({ to, candidate, from }) => {
    const otherPersonSocketId = EmailsWithSocketIds.get(to);
    if (otherPersonSocketId)
      socket
        .to(otherPersonSocketId)
        .emit("ice-candidate-received", { candidate, from });
  });

  socket.on("disconnect", () => {
    // Find the email associated with this socket
    let email: string | undefined;
    for (const [e, socketId] of EmailsWithSocketIds.entries()) {
      if (socketId === socket.id) {
        email = e;
        break;
      }
    }

    if (!email) return; // exit if not found

    EmailsWithSocketIds.delete(email);

    // Remove user from all rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;
      const index = room.indexOf(email);
      if (index !== -1) {
        room.splice(index, 1);
        socket.to(roomId).emit("user-left", { email });
        if (room.length === 0) {
          delete rooms[roomId]; // cleanup empty room
        }
      }
    }

    console.log(`User disconnected: ${email}`);
    console.log("Current rooms:", rooms);
    console.log(
      "EmailsWithSocketIds:",
      Array.from(EmailsWithSocketIds.entries())
    );
  });
});
const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  console.log("Server is running on " + port);
});
