import express from 'express'
import auth from '../middlewares/auth.js'
import { likePost, unlikePost, commentPost, deletePost, getAllPosts, getPublicPosts,deleteComment } from '../controllers/postController.js'
import { blockGuest } from '../controllers/blockGuest.js';

const router = express.Router();

router.get("/allposts", auth, getAllPosts);
router.get("/public-posts", getPublicPosts); // guest can see, no auth
router.put("/like/:postid", auth, blockGuest, likePost);
router.put("/unlike/:postid", auth, blockGuest, unlikePost);
router.post("/comment/:postid", auth, blockGuest, commentPost);
router.delete("/comment/:postid/:commentId", auth, deleteComment);
router.delete("/delete-post/:id", auth, blockGuest, deletePost);

export default router