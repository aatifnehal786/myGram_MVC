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

    socket.on("join", async (userId) => {
      if (!global.onlineUsers.has(userId)) global.onlineUsers.set(userId, new Set());
      global.onlineUsers.get(userId).add(socket.id);

       // Mark user online in DB optional
  await User.findByIdAndUpdate(userId, { isOnline: true });

  // 🔥 Notify all clients that this user is online
  io.emit("user-online", { userId });

      io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message, fileUrl, fileType, isForwarded }) => {
  try {
    const newMsg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message,
      fileUrl,
      fileType,
      isForwarded,
      isDelivered: global.onlineUsers.has(receiverId)
    });

    const sendToUserSockets = (userId, msg) => {
      const sockets = global.onlineUsers.get(userId);
      if (sockets) sockets.forEach(sockId => io.to(sockId).emit("receiveMessage", msg));
    };

    sendToUserSockets(senderId, newMsg);
    sendToUserSockets(receiverId, newMsg);

  } catch (err) {
    console.error("Error sending:", err);
  }
});


// mark chats as seen

socket.on("markSeen", async ({ userId, otherUserId }) => {
  await Message.updateMany(
    { sender: otherUserId, receiver: userId, isSeen: false },
    { isSeen: true, seenAt: new Date() }
  );

  // notify sender about seen
  const sockets = global.onlineUsers.get(otherUserId);
  if (sockets) sockets.forEach(id => io.to(id).emit("messagesSeen", { userId }));
});


// typing indicator Event Call

socket.on("typing", ({ senderId, receiverId }) => {
  const sockets = global.onlineUsers.get(receiverId);
  if (sockets) sockets.forEach(id => io.to(id).emit("typing", senderId));
});

socket.on("stopTyping", ({ senderId, receiverId }) => {
  const sockets = global.onlineUsers.get(receiverId);
  if (sockets) sockets.forEach(id => io.to(id).emit("stopTyping", senderId));
});


    socket.on("disconnect", async () => {
  for (let [userId, socketSet] of global.onlineUsers.entries()) {
    socketSet.delete(socket.id);

    // If user has ZERO sockets → They are offline
    if (socketSet.size === 0) {
      global.onlineUsers.delete(userId);

      const lastSeen = new Date();

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen
      });

      // 🔥 Notify everyone the user is offline
      io.emit("user-offline", { userId, lastSeen });
    }
  }

  io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
  console.log("Socket disconnected:", socket.id);
});

  });
}

export default socketHandler
