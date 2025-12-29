import express from "express";
const app = express();
import http from "http";
import { Server } from "socket.io";
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
});

httpServer.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});
