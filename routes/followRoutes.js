import express from 'express';
import auth from '../middlewares/auth.js'
import { followUser, unfollowUser, followStatus, getFollowers } from '../controllers/followControllers.js'
import { blockGuest } from '../controllers/blockGuest.js';

const router = express.Router();

router.put("/follow/:targetUserId", auth, blockGuest, followUser);
router.put("/unfollow/:targetUserId", auth, blockGuest, unfollowUser);
router.get("/follow-status/:targetUserId", auth, blockGuest, followStatus);
router.get("/followers/:userId", auth, blockGuest, getFollowers); // <-- ONLY HERE, not in userRoutes

export default router