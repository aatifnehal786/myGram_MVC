import { Server } from "socket.io";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import handleVideoCallEvents from "../utils/video-call-events.js";
import Conversation from "../models/coversationModal.js";

const findOrCreateConversation = async (senderId, receiverId) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      unreadCounts: { [senderId]: 0, [receiverId]: 0 },
    });
  }
  return conversation;
};

function socketHandler(server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "https://mygram247.netlify.app"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
  });

  global.onlineUsers = new Map();

  // Helper - GLOBAL, usable everywhere
  const sendToSockets = (userId, event, payload) => {
    const sockets = global.onlineUsers.get(userId);
    if (sockets) {
      sockets.forEach((sockId) => {
        io.to(sockId).emit(event, payload);
      });
    }
  };

  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    socket.on("join", async (userId) => {
      socket.userId = userId;
      if (!global.onlineUsers.has(userId)) {
        global.onlineUsers.set(userId, new Set());
      }
      global.onlineUsers.get(userId).add(socket.id);
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // FIX 1: Send full list to the user who just joined
      socket.emit("online-users", Array.from(global.onlineUsers.keys()));
      socket.emit("online-users-list", Array.from(global.onlineUsers.keys()));
      
      // FIX 2: Notify others
      socket.broadcast.emit("user-online", { userId });
    });

    socket.on("get-online-users", () => {
      socket.emit("online-users", Array.from(global.onlineUsers.keys()));
      socket.emit("online-users-list", Array.from(global.onlineUsers.keys()));
    });

    socket.on("chatOpen", ({ chattingWith }) => {
      socket.chattingWith = chattingWith;
    });

    socket.on("chatClose", () => {
      socket.chattingWith = null;
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message, fileType, fileUrl, isForwarded }) => {
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

        const conversation = await findOrCreateConversation(senderId, receiverId);
        const receiverSockets = global.onlineUsers.get(receiverId);
        const senderUser = await User.findById(senderId).select("username profilePic profilePicture");

        let chatOpen = false;
        if (receiverSockets) {
          receiverSockets.forEach((sockId) => {
            const sock = io.sockets.sockets.get(sockId);
            if (sock?.chattingWith === senderId) chatOpen = true;
          });
        }

        if (!chatOpen) {
          const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
          conversation.unreadCounts.set(receiverId, currentUnread + 1);
        }
        conversation.lastMessage = newMessage._id;
        await conversation.save();

        sendToSockets(receiverId, "unreadCountUpdated", {
          senderId,
          unreadCount: conversation.unreadCounts.get(receiverId) || 0,
        });

        sendToSockets(senderId, "receiveMessage", newMessage);
        sendToSockets(receiverId, "receiveMessage", {
          ...newMessage.toObject(),
          unreadCount: conversation.unreadCounts.get(receiverId),
        });

        if (receiverSockets) {
          receiverSockets.forEach((sockId) => {
            const sock = io.sockets.sockets.get(sockId);
            if (!sock || sock.chattingWith === senderId) return;
            io.to(sockId).emit("newNotification", {
              senderId,
              senderName: senderUser.username,
              senderProfilePic: senderUser.profilePic || senderUser.profilePicture,
              text: message || "New message",
              messageId: newMessage._id,
            });
          });
        }
      } catch (err) {
        console.error("Send message error:", err);
      }
    });

    socket.on("markSeen", async ({ userId, otherUserId }) => {
      await Message.updateMany({ sender: otherUserId, receiver: userId, isSeen: false }, { isSeen: true, seenAt: new Date() });
      const conversation = await Conversation.findOne({ participants: { $all: [userId, otherUserId] } });
      if (conversation) {
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
      }
      sendToSockets(userId, "unreadCountUpdated", { senderId: otherUserId, unreadCount: 0 });
      sendToSockets(otherUserId, "messagesSeen", { userId });
    });

    socket.on("typing", ({ senderId, receiverId }) => {
      sendToSockets(receiverId, "typing", senderId);
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
      sendToSockets(receiverId, "stopTyping", senderId);
    });

    handleVideoCallEvents(socket, io, global.onlineUsers);

    socket.on("react-message", async ({ messageId, emoji, userId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        const existing = message.reactions.find((r) => r.user.toString() === userId && r.emoji === emoji);
        if (existing) {
          message.reactions = message.reactions.filter((r) => !(r.user.toString() === userId && r.emoji === emoji));
        } else {
          message.reactions.push({ user: userId, emoji });
        }
        await message.save();
        // Now sendToSockets works because it's global
        sendToSockets(message.sender.toString(), "message-reaction", { messageId, reactions: message.reactions });
        sendToSockets(message.receiver.toString(), "message-reaction", { messageId, reactions: message.reactions });
      } catch (err) {
        console.error("Reaction socket error:", err);
      }
    });

    socket.on("disconnect", async () => {
      const userId = socket.userId;
      if (!userId) return;
      const socketSet = global.onlineUsers.get(userId);
      if (!socketSet) return;
      socketSet.delete(socket.id);
      if (socketSet.size === 0) {
        global.onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        socket.broadcast.emit("user-offline", { userId, lastSeen });
        io.emit("online-users-list", Array.from(global.onlineUsers.keys()));
        io.emit("online-users", Array.from(global.onlineUsers.keys()));
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

export default socketHandler;