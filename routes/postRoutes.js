import express from 'express'
import auth from '../middlewares/auth.js'
import {getAllPosts,
  likePost,
  unlikePost,
  commentPost,
  deletePost,
  getPublicPosts} from '../controllers/postController.js'
import {blockGuest} from '../controllers/blockGuest.js';

const router = express.Router();

router.get("/allposts", auth, getAllPosts);
router.put("/like/:postid", auth, blockGuest, likePost);
router.put("/unlike/:postid", auth, blockGuest, unlikePost);
router.post("/comment/:postid", auth, blockGuest, commentPost);
router.delete("/delete-post/:id", auth, blockGuest, deletePost);
router.get("/public-posts", getPublicPosts);

export default router
