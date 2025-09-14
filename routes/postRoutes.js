import express from 'express'
import auth from '../middlewares/auth.js'
import {getAllPosts,
  likePost,
  unlikePost,
  commentPost,
  deletePost,
  getPublicPosts} from '../controllers/postController.js'

const router = express.Router();

router.get("/allposts", auth, getAllPosts);
router.put("/like/:postid", auth, likePost);
router.put("/unlike/:postid", auth, unlikePost);
router.post("/comment/:postid", auth, commentPost);
router.delete("/delete-post/:id", auth, deletePost);
router.get("/public-posts", getPublicPosts);

export default router
