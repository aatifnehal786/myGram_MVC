import { Server } from "socket.io";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import handleVideoCallEvents from "../utils/video-call-events.js";

import Conversation from "../models/coversationModal.js";

const findOrCreateConversation = async (
  senderId,
  receiverId
) => {
  let conversation = await Conversation.findOne({
    participants: {
      $all: [senderId, receiverId],
    },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      unreadCounts: {
        [senderId]: 0,
        [receiverId]: 0,
      },
    });
  }

  return conversation;
};
function socketHandler(server) {
  const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://mygram247.netlify.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },

  // 🔥 IMPORTANT FIX FOR RENDER
  transports: ["websocket", "polling"],
  allowEIO3: true,
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

      console.log("JOIN EVENT");
      console.log("socket.id =", socket.id);
      console.log("socket.userId =", socket.userId);

      if (!global.onlineUsers.has(userId)) {
        global.onlineUsers.set(userId, new Set());
      }
      global.onlineUsers.get(userId).add(socket.id);

      await User.findByIdAndUpdate(userId, { isOnline: true });

      // 🔔 Notify others ONLY
      socket.broadcast.emit("user-online", { userId });
    });

    /* =========================
       ONLINE USERS SNAPSHOT
    ========================== */
    socket.on("get-online-users", () => {
      socket.emit(
        "online-users",
        Array.from(global.onlineUsers.keys())
      );
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

    // =========================== delete message for me =========================
    /* =========================
 


    /* =========================
       SEND MESSAGE
    ========================== */


    socket.on(
      "sendMessage",
      async ({ senderId, receiverId, message,fileType,fileUrl,isForwarded  }) => {
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

          const conversation = await findOrCreateConversation(
            senderId,
            receiverId
          );

          const receiverSockets = global.onlineUsers.get(receiverId);
           const senderUser = await User.findById(senderId)
                .select("username profilePic");

          let chatOpen = false;

          if (receiverSockets) {
            receiverSockets.forEach((sockId) => {
              const sock = io.sockets.sockets.get(sockId);

              if (sock?.chattingWith === senderId) {
                chatOpen = true;
              }
            });
          }

          if (!chatOpen) {
            const currentUnread =
              conversation.unreadCounts.get(receiverId) || 0;

            conversation.unreadCounts.set(
              receiverId,
              currentUnread + 1
            );
          }

          conversation.lastMessage = newMessage._id;

          await conversation.save();

          const sendToSockets = (userId, event, payload) => {
            const sockets = global.onlineUsers.get(userId);
            if (sockets) {
              sockets.forEach((sockId) => {
                io.to(sockId).emit(event, payload);
              });
            }
          };
          sendToSockets(receiverId, "unreadCountUpdated", {
            senderId,
            unreadCount:
              conversation.unreadCounts.get(receiverId) || 0,
          });
          // Send message to sender & receiver
          sendToSockets(senderId, "receiveMessage", newMessage);
          sendToSockets(receiverId, "receiveMessage", {
            ...newMessage.toObject(),
            unreadCount:
              conversation.unreadCounts.get(receiverId),
          });

          // 🔔 Send notification ONLY if chat not open
          // const receiverSockets = global.onlineUsers.get(receiverId);

          if (receiverSockets) {
            receiverSockets.forEach((sockId) => {
              const sock = io.sockets.sockets.get(sockId);
              if (!sock) return;

              // 🚫 Suppress ONLY if chat is actively open
              if (sock.chattingWith === senderId) return;
             

              io.to(sockId).emit("newNotification", {
                senderId,
                senderName: senderUser.username,
                senderProfilePic: senderUser.profilePic,
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
    {
      sender: otherUserId,
      receiver: userId,
      isSeen: false,
    },
    {
      isSeen: true,
      seenAt: new Date(),
    }
  );

  const conversation =
    await Conversation.findOne({
      participants: {
        $all: [userId, otherUserId],
      },
    });

  if (conversation) {
    conversation.unreadCounts.set(userId, 0);

    await conversation.save();
  }

  const userSockets =
    global.onlineUsers.get(userId);

  if (userSockets) {
    userSockets.forEach((sockId) => {
      io.to(sockId).emit(
        "unreadCountUpdated",
        {
          senderId: otherUserId,
          unreadCount: 0,
        }
      );
    });
  }

  const senderSockets =
    global.onlineUsers.get(otherUserId);

  if (senderSockets) {
    senderSockets.forEach((sockId) => {
      io.to(sockId).emit("messagesSeen", {
        userId,
      });
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

     // Handle video call events
        handleVideoCallEvents(socket, io, global.onlineUsers)


    // Handle Reactions
     socket.on("react-message", async ({ messageId, emoji, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existing = message.reactions.find(
        (r) =>
          r.user.toString() === userId &&
          r.emoji === emoji
      );

      if (existing) {
        // ❌ Remove reaction
        message.reactions = message.reactions.filter(
          (r) =>
            !(
              r.user.toString() === userId &&
              r.emoji === emoji
            )
        );
      } else {
        // ✅ Add reaction
        message.reactions.push({ user: userId, emoji });
      }

      await message.save();

      // 🔥 Emit to BOTH users
         sendToSockets(
           message.sender.toString(),
           "message-reaction",
           {
             messageId,
             reactions: message.reactions,
           }
         );

         sendToSockets(
           message.receiver.toString(),
           "message-reaction",
           {
             messageId,
             reactions: message.reactions,
           }
         );

       } catch (err) {
         console.error("Reaction socket error:", err);
       }
     });

    /* =========================
       DISCONNECT
    ========================== */
    socket.on("disconnect", async () => {
  const userId = socket.userId;
  if (!userId) return;

  const socketSet = global.onlineUsers.get(userId);
  if (!socketSet) return;

  // Remove only this socket
  socketSet.delete(socket.id);

  // If user has no active sockets → offline
  if (socketSet.size === 0) {
    global.onlineUsers.delete(userId);

    const lastSeen = new Date();

    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen,
    });

    // 🔔 Notify OTHER users only
    socket.broadcast.emit("user-offline", {
      userId,
      lastSeen,
    });
  }

  console.log("Socket disconnected:", socket.id);
})
})

return io;

}

export default socketHandler;

