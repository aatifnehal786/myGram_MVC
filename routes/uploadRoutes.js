import express from "express";
import auth from "../middlewares/auth.js";
import { upload, uploadProfilePic } from "../middlewares/cloudinary_middleware.js";
import { updateProfilePicController } from "../controllers/uploadProfilePic.js";
import { createPost } from "../controllers/createPostsController.js";
import { blockGuest } from "../controllers/blockGuest.js";

const router = express.Router();

// ✅ Profile
router.post("/profile", auth, blockGuest, uploadProfilePic.single("profilePic"), updateProfilePicController);

// ✅ Create Post - FIXED name: "media"
router.post("/create", auth, blockGuest, upload.fields([
  { name: "media", maxCount: 1 }, // was "image" - BUG
  { name: "backgroundMusic", maxCount: 1 }
]), createPost);

export default router;