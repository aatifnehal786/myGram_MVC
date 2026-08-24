// chatController.js
import multer from "multer";
import streamifier from "streamifier";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Cloudinary from "../config/cloudinary.js";
import { decrypt } from "../utils/encryption.js";

const upload = multer();

// Chat file upload - DON'T encrypt fileUrl
const uploadChatFile = [
  upload.single("file"), async (req, res) => {
    try {
      const mimeType = req.file.mimetype;
      let resourceType = "auto";
      if (["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mimeType) || mimeType.startsWith("text/")) {
        resourceType = "raw";
      }
      const streamUpload = () => new Promise((resolve, reject) => {
        const stream = Cloudinary.uploader.upload_stream(
          { resource_type: resourceType, folder: "chat_files", type: "upload" },
          (error, result) => (result ? resolve(result) : reject(error))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      const result = await streamUpload();
      res.json({ fileUrl: result.secure_url, fileType: mimeType });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
];

const deleteChatMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!messageIds?.length) return res.status(400).json({ message: "No IDs" });
    // Only allow sender to hard delete, or add auth check
    const result = await Message.deleteMany({ _id: { $in: messageIds }, sender: req.user._id });
    res.status(200).json({ message: `${result.deletedCount} deleted` });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get chat - with encryption handling
const getChat = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId },
      ],
      deletedFor: { $ne: currentUserId }, // FIX: hide deletedForMe
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "username profilePic")
      .populate("receiver", "username profilePic");

    // post hook already decrypted, but to be safe for aggregation bypass:
    // messages are plain here
    res.status(200).json(messages.reverse());
  } catch (err) {
    console.error("Error in /chat/:userId:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const searchUsers = async (req, res) => {
  const query = req.query.q;
  if(!query) return res.json([]);
  const onlineUserIds = Array.from(global.onlineUsers?.keys() || []);
  try {
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
      ],
    }).select("username profilePic lastSeen"); // safe whitelist

    const enhanced = users.map(u => ({
      _id: u._id,
      username: u.username,
      profilePic: u.profilePic,
      lastSeen: u.lastSeen,
      isOnline: onlineUserIds.includes(u._id.toString()),
    }));
    res.status(200).json(enhanced);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getChatList = async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
      deletedFor: { $ne: userId },
      isDeleted: { $ne: true }
    })
      .populate("sender receiver", "username profilePic")
      .select("sender receiver message fileUrl fileType createdAt isDeleted deletedFor")
      .sort({ createdAt: -1 });

    // Build unique chat partners with last message (already decrypted via post hook)
    const uniqueUsers = new Map();
    messages.forEach((msg) => {
      const partner = msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;
      if (partner && !uniqueUsers.has(partner._id.toString())) {
        uniqueUsers.set(partner._id.toString(), {
          ...partner.toObject(),
          lastMessage: msg.message || (msg.fileUrl ? "📎 File" : ""),
          lastMessageAt: msg.createdAt
        });
      }
    });
    res.status(200).json(Array.from(uniqueUsers.values()));
  } catch (err) {
    console.error("Chat list error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Forward - FIXED for encryption
const forwardMessage = async (req, res) => {
  const { senderId, receiverId, message, fileUrl, fileType, isForwarded } = req.body;
  try {
    // Save - model encrypts message automatically
    const newMsgDoc = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: message || "",
      fileUrl: fileUrl || null,
      fileType: fileType || null,
      isForwarded: true,
    });

    // Decrypt for emitting
    const plainObj = newMsgDoc.toObject();
    plainObj.message = decrypt(plainObj.message) || message || "";

    const io = req.app.get("io");
    const sendTo = (userId, payload) => {
      const sockets = global.onlineUsers.get(userId?.toString());
      if (sockets) sockets.forEach(id => io.to(id).emit("receiveMessage", payload));
    };
    sendTo(receiverId, plainObj);
    sendTo(senderId, plainObj);
    
    res.json(plainObj);
  } catch (err) {
    console.error("Error forward:", err);
    res.status(500).json({ error: "Failed to forward" });
  }
};

const deleteForMe = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;
  try {
    await Message.updateOne({ _id: messageId }, { $addToSet: { deletedFor: userId } });
    const sockets = global.onlineUsers.get(userId.toString());
    if (sockets) sockets.forEach(sockId => req.app.get("io").to(sockId).emit("messageDeletedForMe", { messageId }));
    res.json({ message: "Deleted for me" });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
};

const deleteMultipleForMe = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user._id;
  if (!messageIds?.length) return res.status(400).json({ error: "No messages" });
  try {
    await Message.updateMany({ _id: { $in: messageIds } }, { $addToSet: { deletedFor: userId } });
    const sockets = global.onlineUsers.get(userId.toString());
    if (sockets) sockets.forEach(sockId => req.app.get("io").to(sockId).emit("messagesDeletedForMe", { messageIds }));
    res.json({ message: `${messageIds.length} deleted` });
  } catch (err) {
    res.status(500).json({ error: "Bulk delete failed" });
  }
};

const deleteForEveryone = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;
  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Not found" });
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only sender can delete" });
    }
    message.isDeleted = true;
    message.message = ""; // will be encrypted as empty
    message.fileUrl = null;
    message.fileType = null;
    await message.save();

    const sendToSockets = (uid, event, payload) => {
      const sockets = global.onlineUsers.get(uid?.toString());
      if (sockets) sockets.forEach(sockId => req.app.get("io").to(sockId).emit(event, payload));
    };
    sendToSockets(message.sender, "messageDeleted", { messageId });
    sendToSockets(message.receiver, "messageDeleted", { messageId });

    res.json({ message: "Deleted for everyone" });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
};

export {
  uploadChatFile,
  deleteChatMessages,
  getChat,
  searchUsers,
  getChatList,
  forwardMessage,
  deleteForMe,
  deleteForEveryone,
  deleteMultipleForMe
};