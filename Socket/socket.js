import { Server } from "socket.io";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import Conversation from "../models/coversationModal.js";
import handleVideoCallEvents from "../utils/video-call-events.js";
import { decrypt } from "../utils/encryption.js"; // ADD THIS

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

const messageRateLimits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_MSG = 10;

function socketHandler(server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "https://mygram247.netlify.app","http://localhost:8081"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
  });

  global.onlineUsers = new Map();

  io.on("connection", (socket) => {
    socket.on("join", async (userId) => {
      socket.userId = userId;
      socket.join(userId);
      if (!global.onlineUsers.has(userId)) global.onlineUsers.set(userId, new Set());
      global.onlineUsers.get(userId).add(socket.id);
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit("online-users", Array.from(global.onlineUsers.keys()));
      socket.broadcast.emit("user-online", { userId });
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message, fileType, fileUrl, isForwarded }) => {
      try {
        // --- Rate limit (your code) ---
        const now = Date.now();
        if (!messageRateLimits.has(senderId)) messageRateLimits.set(senderId, []);
        let timestamps = messageRateLimits.get(senderId).filter(t => now - t < WINDOW_MS);
        if (timestamps.length >= MAX_MSG) {
          socket.emit("rate-limit-error", { message: `Only ${MAX_MSG}/min allowed` });
          return;
        }
        timestamps.push(now);
        messageRateLimits.set(senderId, timestamps);

        // 1. Save - model pre-save will ENCRYPT automatically
        const newMessageDoc = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message, // plain in, encrypted stored
          fileUrl,
          fileType,
          isForwarded,
          isDelivered: global.onlineUsers.has(receiverId),
          isSeen: false,
        });

        // 2. Create a DECRYPTED version for emitting - THIS IS THE FIX
        // newMessageDoc.message is encrypted right now, so decrypt it for sockets
        const plainMessageObj = newMessageDoc.toObject();
        plainMessageObj.message = decrypt(plainMessageObj.message) || message; // fallback to original plain

        const conversation = await findOrCreateConversation(senderId, receiverId);
        const receiverSockets = global.onlineUsers.get(receiverId);
        const senderUser = await User.findById(senderId).select("username profilePic");

        let chatOpen = false;
        if (receiverSockets) {
          for (const sockId of receiverSockets) {
            const sock = io.sockets.sockets.get(sockId);
            if (sock?.chattingWith === senderId) { chatOpen = true; break; }
          }
        }

        if (!chatOpen) {
          const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
          conversation.unreadCounts.set(receiverId, currentUnread + 1);
        }
        conversation.lastMessage = newMessageDoc._id;
        await conversation.save();

        // 3. Emit PLAIN version
        socket.emit("receiveMessage", plainMessageObj);
        socket.to(senderId).emit("receiveMessage", plainMessageObj);

        io.to(receiverId).emit("receiveMessage", {
          ...plainMessageObj,
          unreadCount: conversation.unreadCounts.get(receiverId) || 0,
        });

        io.to(receiverId).emit("unreadCountUpdated", {
          senderId,
          unreadCount: conversation.unreadCounts.get(receiverId) || 0,
        });

        // Notification - send plain preview
        if (receiverSockets) {
          for (const sockId of receiverSockets) {
            const sock = io.sockets.sockets.get(sockId);
            if (!sock || sock.chattingWith === senderId) continue;
            io.to(sockId).emit("newNotification", {
              senderId,
              senderName: senderUser.username,
              senderProfilePic: senderUser.profilePic,
              text: plainMessageObj.message || "New file",
              messageId: newMessageDoc._id,
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

    socket.on("typing", ({ senderId, receiverId }) => io.to(receiverId).emit("typing", senderId));
    socket.on("stopTyping", ({ senderId, receiverId }) => io.to(receiverId).emit("stopTyping", senderId));
    socket.on("chatOpen", ({ chattingWith }) => { socket.chattingWith = chattingWith; });
    socket.on("chatClose", () => { socket.chattingWith = null; });

    handleVideoCallEvents(socket, io, global.onlineUsers);

    socket.on("react-message", async ({ messageId, emoji, userId }) => {
      const message = await Message.findById(messageId);
      if (!message) return;
      const existing = message.reactions.find(r => r.user.toString() === userId && r.emoji === emoji);
      if (existing) {
        message.reactions = message.reactions.filter(r => !(r.user.toString() === userId && r.emoji === emoji));
      } else {
        message.reactions.push({ user: userId, emoji });
      }
      await message.save();
      // reactions don't need encryption
      io.to(message.sender.toString()).emit("message-reaction", { messageId, reactions: message.reactions });
      io.to(message.receiver.toString()).emit("message-reaction", { messageId, reactions: message.reactions });
    });

    socket.on("disconnect", async () => {
      const userId = socket.userId;
      if (!userId) return;
      const set = global.onlineUsers.get(userId);
      if (!set) return;
      set.delete(socket.id);
      socket.leave(userId);
      if (set.size === 0) {
        global.onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user-offline", { userId, lastSeen: new Date() });
        io.emit("online-users", Array.from(global.onlineUsers.keys()));
      }
    });
  });
  return io;
}

export default socketHandler;