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
const getChat = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const sender = await User.findById(currentUserId);
    const receiver = await User.findById(targetUserId);

    if (!sender || !receiver)
      return res.status(404).json({ error: "User not found" });

   const messages = await Message.find({
  $or: [
    { sender: currentUserId, receiver: targetUserId },
    { sender: targetUserId, receiver: currentUserId },
  ],
})
  .sort({ createdAt: 1 })
  .populate("sender", "_id name username profilePic")
  .populate("receiver", "_id name username profilePic");


    res.status(200).json(messages);
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

// Chat PIN functions
const setChatPin = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!/^\d{4}$/.test(pin))
      return res.status(400).json({ msg: "PIN must be 4 digits" });

    const hashedPin = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(userId, { chatPin: hashedPin });

    res.json({ msg: "Chat PIN set successfully" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

const verifyChatPin = async (req, res) => {
  const { userId, pin } = req.body;
  const user = await User.findById(userId);
  if (!user || !user.chatPin) return res.status(404).json({ message: "PIN not set" });

  const isMatch = await bcrypt.compare(pin, user.chatPin);
  if (!isMatch) return res.status(400).json({ message: "Invalid PIN" });

  res.json({ message: "PIN verified successfully" });
};

const checkChatPin = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({
      hasPin: !!user.chatPin,
      msg: user.chatPin ? "Chat PIN already set" : "No PIN set yet",
    });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

// OTP for forgot PIN
const forgotChatPin = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not registered with this email" });

  const otp = crypto.randomInt(100000, 999999).toString();
  chatPinOtpStorage[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000, userId: user._id };

  try {
    await transporter.sendMail({
      from: `"MyGram Chat PIN Recovery" <${process.env.MY_GMAIL}>`,
      to: email,
      subject: "Your Chat PIN OTP",
      text: `Your OTP to reset your chat PIN is ${otp}. It will expire in 5 minutes.`,
    });
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

const resetChatPin = async (req, res) => {
  const { email, otp, newPin } = req.body;
  const record = chatPinOtpStorage[email];
  if (!record) return res.status(400).json({ message: "No OTP requested for this email" });
  if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
  if (Date.now() > record.expiresAt) return res.status(400).json({ message: "OTP expired" });

  const user = await User.findOne({ email });
  const hashedPin = await bcrypt.hash(newPin.toString(), 10);
  user.chatPin = hashedPin;
  await user.save();
  delete chatPinOtpStorage[email];
  res.json({ message: "Chat PIN reset successfully" });
};

const removeChatPin = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.chatPin = null;
    await user.save();
    res.json({ message: "Chat lock removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error removing chat lock", error: err.message });
  }
};

// Export all functions as named exports
export {
  uploadChatFile,
  deleteChatMessages,
  getChat,
  searchUsers,
  getChatList,
  forwardMessage,
  setChatPin,
  verifyChatPin,
  checkChatPin,
  forgotChatPin,
  resetChatPin,
  removeChatPin
};
