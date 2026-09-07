import { Server } from "socket.io";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import Conversation from "../models/coversationModal.js";
import handleVideoCallEvents from "../utils/video-call-events.js";

const socketHandler = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "https://mygram247.netlify.app", "http://localhost:8081"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
  });

  global.onlineUsers = new Map();
  
  // FIX 1: On server restart, make everyone offline
  User.updateMany({}, { isOnline: false }).then(() => console.log("Reset online status"));

  io.on("connection", (socket) => {
    socket.on("join", async (userId) => {
      const uid = userId.toString(); // FIX 2: always string
      socket.userId = uid;
      socket.join(uid);
      
      if (!global.onlineUsers.has(uid)) global.onlineUsers.set(uid, new Set());
      global.onlineUsers.get(uid).add(socket.id);
      
      await User.findByIdAndUpdate(uid, { isOnline: true, lastSeen: null });
      
      io.emit("online-users", Array.from(global.onlineUsers.keys()));
      socket.broadcast.emit("user-online", { userId: uid });
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

    socket.on("typing", ({ senderId, receiverId }) => io.to(receiverId.toString()).emit("typing", senderId.toString()));
    socket.on("stopTyping", ({ senderId, receiverId }) => io.to(receiverId.toString()).emit("stopTyping", senderId.toString()));
    socket.on("chatOpen", ({ chattingWith }) => { socket.chattingWith = chattingWith?.toString(); });
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
        io.emit("user-offline", { userId, lastSeen: new Date() });
        io.emit("online-users", Array.from(global.onlineUsers.keys())); // FIX 3: emit to ALL
      }
    });
  });

  return io;
};

export default socketHandler;




     

