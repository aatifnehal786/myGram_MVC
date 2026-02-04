import  express from 'express';
import auth from '../middlewares/auth.js'
import {followUser,unfollowUser,
  followStatus,
  getFollowers} from '../controllers/followControllers.js'

const router = express.Router();

router.put("/follow/:targetUserId", auth, followUser);
router.put("/unfollow/:targetUserId", auth, unfollowUser);
router.get("/follow-status/:targetUserId", auth, followStatus);
router.get("/followers/:userId", auth, getFollowers);


export default router
