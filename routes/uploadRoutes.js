import express from "express";
import auth from "../middlewares/auth.js";
import { upload, uploadProfilePic } from "../middlewares/cloudinary_middleware.js";

const router = express.Router();

// Controller functions
const handleProfileUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({
      message: "Profile picture uploaded successfully",
      fileUrl: req.file.path, // or secure_url if using cloudinary
    });
  } catch (err) {
    res.status(500).json({ message: "Error uploading profile picture", error: err.message });
  }
};

const handlePostUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No media uploaded" });
    }
    res.json({
      message: "Post uploaded successfully",
      fileUrl: req.file.path,
    });
  } catch (err) {
    res.status(500).json({ message: "Error uploading post", error: err.message });
  }
};

// Routes
router.post("/profile", auth, uploadProfilePic.single("image"), handleProfileUpload);
router.post("/post", auth, upload.single("media"), handlePostUpload);

export default router;
