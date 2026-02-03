import  express from 'express';
import auth from '../middlewares/auth.js'
import {followUser,unfollowUser,
  followStatus,
  getFollowers,sendFollowRequest,getFollowRequests,acceptFollowRequest,rejectFollowRequest} from '../controllers/followControllers.js'

const router = express.Router();

router.put("/follow/:targetUserId", auth, followUser);
router.put("/unfollow/:targetUserId", auth, unfollowUser);
router.get("/follow-status/:targetUserId", auth, followStatus);
router.get("/followers/:userId", auth, getFollowers);
router.post("/follow/request/:userId", auth, sendFollowRequest);
router.get("/follow/requests", auth, getFollowRequests);
router.post("/follow/accept/:senderId", auth, acceptFollowRequest);
router.post("/follow/reject/:senderId", auth, rejectFollowRequest);

export default router
