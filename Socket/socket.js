import { Server } from "socket.io";
import User from '../models/userModel.js'
import Message from "../models/messageModel.js";

function socketHandler(server) {
  const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173","https://mygram247.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});


  global.onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);

    socket.on("join", (userId) => {
      if (!global.onlineUsers.has(userId)) global.onlineUsers.set(userId, new Set());
      global.onlineUsers.get(userId).add(socket.id);
      io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message, fileUrl, fileType, isForwarded }) => {
      try {
        const newMsg = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message: message || "",
          fileUrl: fileUrl || null,
          fileType: fileType || null,
          isForwarded: isForwarded || false,
          createdAt: new Date()
        });

        const sendToUserSockets = (userId, msg) => {
          const sockets = global.onlineUsers.get(userId);
          if (sockets) sockets.forEach(sockId => io.to(sockId).emit("receiveMessage", msg));
        };

        sendToUserSockets(senderId, newMsg);
        sendToUserSockets(receiverId, newMsg);
      } catch (err) {
        console.error("Error in sendMessage:", err);
      }
    });

    socket.on("disconnect", async () => {
      for (let [userId, socketSet] of global.onlineUsers.entries()) {
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          global.onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        }
      }
      io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
      console.log("Socket disconnected:", socket.id);
    });
  });
}

export default socketHandler
