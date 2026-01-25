// chatController.js
import multer from "multer";
import streamifier from "streamifier";
import Message from "../models/messageModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/userModel.js";
// make sure you configure transporter
import Cloudinary from "../config/cloudinary.js"; // adjust path if needed

// In-memory OTP storage
const chatPinOtpStorage = {};



// Multer buffer storage
const upload = multer();

// Chat file upload
const uploadChatFile = [
  upload.single("file"),
  async (req, res) => {
    try {
      const mimeType = req.file.mimetype;

      // Detect correct resource_type
      let resourceType = "auto";
      if (
        mimeType === "application/pdf" ||
        mimeType === "application/msword" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType.startsWith("text/")
      ) {
        resourceType = "raw";
      }

      const streamUpload = () =>
        new Promise((resolve, reject) => {
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

// Delete multiple chat messages
const deleteChatMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!messageIds || !messageIds.length) {
      return res.status(400).json({ message: "No message IDs provided" });
    }

    const result = await Message.deleteMany({ _id: { $in: messageIds } });
    res.status(200).json({
      message: `${result.deletedCount} message(s) deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting messages:", error);
    res.status(500).json({ message: "Server error while deleting messages" });
  }
};

// Get chat between two users
// Get chat between two users (paginated)
const getChat = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const sender = await User.findById(currentUserId);
    const receiver = await User.findById(targetUserId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .populate("sender", "_id name username profilePic")
      .populate("receiver", "_id name username profilePic");

    // Reverse to show oldest → newest in UI
    res.status(200).json(messages.reverse());
  } catch (err) {
    console.error("Error in /chat/:userId:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Search users
const searchUsers = async (req, res) => {
  const query = req.query.q;
  const onlineUserIds = Array.from(global.onlineUsers?.keys() || []);

  try {
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
      ],
    }).select("_id name username profilePic lastSeen");

    const enhancedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      profilePic: user.profilePic,
      lastSeen: user.lastSeen,
      isOnline: onlineUserIds.includes(user._id.toString()),
    }));

    res.status(200).json(enhancedUsers);
  } catch (err) {
    console.error("User search failed:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// Get chat list
const getChatList = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).populate("sender receiver", "name username profilePic");

    const uniqueUsers = new Map();
    messages.forEach((msg) => {
      const partner =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      if (partner && partner._id) uniqueUsers.set(partner._id.toString(), partner);
    });

    res.status(200).json(Array.from(uniqueUsers.values()));
  } catch (err) {
    console.error("Chat list error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Forward message
const forwardMessage = async (req, res) => {
  const { senderId, receiverId, message, fileUrl, fileType, isForwarded } = req.body;
  try {
    const newMsg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: message || "",
      fileUrl: fileUrl || null,
      fileType: fileType || null,
      isForwarded: isForwarded || false,
      createdAt: new Date(),
    });
    res.json(newMsg);
  } catch (err) {
    console.error("Error in /chat/forward:", err);
    res.status(500).json({ error: "Failed to forward message" });
  }
};


// Export all functions as named exports
export {
  uploadChatFile,
  deleteChatMessages,
  getChat,
  searchUsers,
  getChatList,
  forwardMessage
};
