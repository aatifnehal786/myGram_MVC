import express from "express";
import auth from "../middlewares/auth.js";
import { upload } from "../middlewares/cloudinary_middleware.js";
import { uploadProfilePic } from "../middlewares/cloudinary_middleware.js";
import { uploadProfilePic as uploadProfilePicController } from "../controllers/uploadProfilePic.js";
import { createPost } from "../controllers/createPostsController.js";
import {blockGuest} from "../controllers/blockGuest.js";
const router = express.Router();

// ✅ Upload Profile Pic route
router.post("/profile",auth,blockGuest,uploadProfilePic.single("profilePic"),uploadProfilePicController);

// ✅ Create Post route
// router.post("/create",auth,blockGuest,upload.fields([{ name: "image", maxCount: 1 },{ name: "backgroundMusic", maxCount: 1 },]),createPost);

export default router;
