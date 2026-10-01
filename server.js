import "dotenv/config";

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js"

import Message from "./models/Messages.js";

import jwt from "jsonwebtoken";

const app = express();



// Database
connectDB();
console.log("CLIENT_URL:", process.env.CLIENT_URL);

const httpServer = createServer(app);


console.log("SOCKET CLIENT_URL:", process.env.CLIENT_URL);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});




io.on("connection", (socket) => {
  console.log("User connected:", socket.userId);
  console.log("Socket ID:", socket.id);

  // Join user's private room
  socket.join(socket.userId.toString());

  // console.log(`User joined room: ${socket.userId}`);
  // console.log("User joined room:", socket.userId.toString());
  // console.log("Socket ID:", socket.id);

  // Real-time message
  socket.on("send_message", async (data) => {
    try {
      const { receiver, content } = data;

      if (!receiver || !content?.trim()) {
        return;
      }

      const message = await Message.create({
        sender: socket.userId,
        receiver,
        content: content.trim(),
      });

      // Send message to receiver
      io.to(receiver.toString()).emit("new_message", message);

      // Also send it back to sender
      io.to(socket.userId.toString()).emit("new_message", message);

    } catch (error) {
      console.error("Socket message error:", error);
    }
  });
  

  //Real-time call  listen for coming call

socket.on("call-user", ({ to, offer }) => {
  console.log("📞 Call request received for:", to);

  const receiverRoom = io.sockets.adapter.rooms.get(to);

  console.log("Receiver room:", receiverRoom);

  io.to(to).emit("incoming-call", {
    from: socket.userId,
    offer,
  });

  console.log("✅ incoming-call emitted");
});


// ice candidate for  audio
socket.on("ice-candidate", ({ to, candidate }) => {
  console.log("🧊 ICE candidate received from:", socket.userId);
  console.log("Sending ICE candidate to:", to);

  io.to(to).emit("ice-candidate", {
    candidate,
  });
});

// real time call  listen for answer call
socket.on("answer-call", ({ to, answer }) => {
  console.log("📞 Answer received from:", socket.userId);
  console.log("Sending answer to:", to);

  io.to(to).emit("call-answered", {
    answer,
  });
});

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});





io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.userId = decoded.userId;

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    next(new Error("Invalid authentication token"));
  }
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("ChatApp Server Running");
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});