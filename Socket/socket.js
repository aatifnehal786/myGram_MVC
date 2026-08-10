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

  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    socket.on("join", async (userId) => {
      socket.userId = userId;
      socket.join(userId); // JOIN ROOM - critical fix

      if (!global.onlineUsers.has(userId)) {
        global.onlineUsers.set(userId, new Set());
      }
      global.onlineUsers.get(userId).add(socket.id);

      await User.findByIdAndUpdate(userId, { isOnline: true });

      // Send full list to new user
      io.to(userId).emit("online-users", Array.from(global.onlineUsers.keys()));
      io.to(userId).emit("online-users-list", Array.from(global.onlineUsers.keys()));

      // Notify others
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
          for (const sockId of receiverSockets) {
            const sock = io.sockets.sockets.get(sockId);
            if (sock?.chattingWith === senderId) {
              chatOpen = true;
              break;
            }
          }
        }

        if (!chatOpen) {
          const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
          conversation.unreadCounts.set(receiverId, currentUnread + 1);
        }
        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // FIX FOR DUPLICATE:
        // 1. Sender - emit only to this one socket, not to all his devices/tabs
        socket.emit("receiveMessage", newMessage);

        // 2. Sender's other tabs - sync them
        socket.to(senderId).emit("receiveMessage", newMessage);

        // 3. Receiver - send to his room (once, not per socket)
        io.to(receiverId).emit("receiveMessage", {
         ...newMessage.toObject(),
          unreadCount: conversation.unreadCounts.get(receiverId) || 0,
        });

        io.to(receiverId).emit("unreadCountUpdated", {
          senderId,
          unreadCount: conversation.unreadCounts.get(receiverId) || 0,
        });

        // Notifications
        if (receiverSockets) {
          for (const sockId of receiverSockets) {
            const sock = io.sockets.sockets.get(sockId);
            if (!sock || sock.chattingWith === senderId) continue;
            io.to(sockId).emit("newNotification", {
              senderId,
              senderName: senderUser.username,
              senderProfilePic: senderUser.profilePic || senderUser.profilePicture,
              text: message || "New message",
              messageId: newMessage._id,
            });
          }
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
      io.to(userId).emit("unreadCountUpdated", { senderId: otherUserId, unreadCount: 0 });
      io.to(otherUserId).emit("messagesSeen", { userId });
    });

    socket.on("typing", ({ senderId, receiverId }) => {
      io.to(receiverId).emit("typing", senderId);
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
      io.to(receiverId).emit("stopTyping", senderId);
    });

    handleVideoCallEvents(socket, io, global.onlineUsers);

    socket.on("react-message", async ({ messageId, emoji, userId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        const existing = message.reactions.find((r) => r.user.toString() === userId && r.emoji === emoji);
        if (existing) {
          message.reactions = message.reactions.filter((r) =>!(r.user.toString() === userId && r.emoji === emoji));
        } else {
          message.reactions.push({ user: userId, emoji });
        }
        await message.save();
        io.to(message.sender.toString()).emit("message-reaction", { messageId, reactions: message.reactions });
        io.to(message.receiver.toString()).emit("message-reaction", { messageId, reactions: message.reactions });
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
      socket.leave(userId);

      if (socketSet.size === 0) {
        global.onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user-offline", { userId, lastSeen: new Date() });
        io.emit("online-users", Array.from(global.onlineUsers.keys()));
        io.emit("online-users-list", Array.from(global.onlineUsers.keys()));
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

export default socketHandler;