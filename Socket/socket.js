import { Server } from "socket.io";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

function socketHandler(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://mygram247.netlify.app"
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // userId -> Set(socketId)
  global.onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    /* =========================
       USER JOIN
    ========================== */
    socket.on("join", async (userId) => {
      socket.userId = userId;

      if (!global.onlineUsers.has(userId)) {
        global.onlineUsers.set(userId, new Set());
      }
      global.onlineUsers.get(userId).add(socket.id);

      await User.findByIdAndUpdate(userId, { isOnline: true });

      io.emit("user-online", { userId });
      io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
    });

    /* =========================
       CHAT OPEN (IMPORTANT)
    ========================== */
    socket.on("chatOpen", ({ chattingWith }) => {
      socket.chattingWith = chattingWith;
    });

    socket.on("chatClose", () => {
      socket.chattingWith = null;
    });


    /* =========================
       SEND MESSAGE
    ========================== */
    socket.on(
      "sendMessage",
      async ({ senderId, receiverId, message, fileUrl, fileType, isForwarded }) => {
        try {
          const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            message,
            fileUrl,
            fileType,
            isForwarded,
            isDelivered: global.onlineUsers.has(receiverId),
            isSeen: false,
          });

          const sendToSockets = (userId, event, payload) => {
            const sockets = global.onlineUsers.get(userId);
            if (sockets) {
              sockets.forEach((sockId) => {
                io.to(sockId).emit(event, payload);
              });
            }
          };

          // Send message to sender & receiver
          sendToSockets(senderId, "receiveMessage", newMessage);
          sendToSockets(receiverId, "receiveMessage", newMessage);

          // 🔔 Send notification ONLY if chat not open
          const receiverSockets = global.onlineUsers.get(receiverId);

          if (receiverSockets) {
            receiverSockets.forEach((sockId) => {
              const sock = io.sockets.sockets.get(sockId);
              if (!sock) return;

              // 🚫 Suppress ONLY if chat is actively open
              if (sock.chattingWith === senderId) return;

              io.to(sockId).emit("newNotification", {
                senderId,
                text: message || "New message",
                messageId: newMessage._id,
              });
            });
          }

        } catch (err) {
          console.error("Send message error:", err);
        }
      }
    );

    /* =========================
       MARK MESSAGES AS SEEN
    ========================== */
    socket.on("markSeen", async ({ userId, otherUserId }) => {
      await Message.updateMany(
        { sender: otherUserId, receiver: userId, isSeen: false },
        { isSeen: true, seenAt: new Date() }
      );

      const senderSockets = global.onlineUsers.get(otherUserId);
      if (senderSockets) {
        senderSockets.forEach((sockId) => {
          io.to(sockId).emit("messagesSeen", { userId });
        });
      }
    });

    /* =========================
       TYPING INDICATOR
    ========================== */
    socket.on("typing", ({ senderId, receiverId }) => {
      const sockets = global.onlineUsers.get(receiverId);
      if (sockets) {
        sockets.forEach((sockId) =>
          io.to(sockId).emit("typing", senderId)
        );
      }
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
      const sockets = global.onlineUsers.get(receiverId);
      if (sockets) {
        sockets.forEach((sockId) =>
          io.to(sockId).emit("stopTyping", senderId)
        );
      }
    });

    /* =========================
       DISCONNECT
    ========================== */
    socket.on("disconnect", async () => {
      for (let [userId, socketSet] of global.onlineUsers.entries()) {
        socketSet.delete(socket.id);

        if (socketSet.size === 0) {
          global.onlineUsers.delete(userId);

          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
          });

          io.emit("user-offline", { userId, lastSeen });
        }
      }

      io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
      console.log("Socket disconnected:", socket.id);
    });
  });
}

export default socketHandler;
