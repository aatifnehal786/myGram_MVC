import express from "express";
import { createPost } from "../controllers/createPostsController.js";
import auth from "../middlewares/auth.js";
import { upload } from "../middlewares/cloudinary_middleware.js";  // ⬅ use your Cloudinary storage

const router = express.Router();

/**
 * Route: POST /api/posts
 * Desc: Create a new post (with image/video + optional background music for images)
 * Access: Protected
 */


router.post(
  "/create",

  auth,

  (req, res, next) => {
    upload.fields([
      { name: "media", maxCount: 1 },
      { name: "backgroundMusic", maxCount: 1 },
    ])(req, res, (err) => {

      // MULTER/CLOUDINARY ERROR
      if (err) {
        console.error("UPLOAD ERROR:", err);

        return res.status(400).json({
          success: false,

          error:
            err.message ||
            "Upload failed",
        });
      }

      next();
    });
  },

  createPost
);







export default router;
