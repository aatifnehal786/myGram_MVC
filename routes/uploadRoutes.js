import express from "express";
import auth from "../middlewares/auth.js";
import { upload } from "../middlewares/cloudinary_middleware.js";
import { uploadProfilePic } from "../middlewares/cloudinary_middleware.js";
import { uploadProfilePic as uploadProfilePicController } from "../controllers/uploadProfilePic.js";
import { createPost } from "../controllers/createPostsController.js";

const router = express.Router();

// ✅ Upload Profile Pic route
router.post(
  "/profile",
  auth, // ensure user is authenticated
  uploadProfilePic.single("profilePic"),
  uploadProfilePicController
);

// ✅ Create Post route
router.post(
  "/create",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "backgroundMusic", maxCount: 1 },
  ]),

  // Multer error handler
  (err, req, res, next) => {
    if (err) {
      console.error("⚠️ Multer upload error:", err);
      return res.status(400).json({ error: err.message });
    }
    next();
  },

  // Debugging middleware
  (req, res, next) => {
    console.log("📂 Incoming files:", req.files);
    console.log("📝 Incoming body:", req.body);
    next();
  },

  createPost
);

export default router;
