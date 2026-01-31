import express from 'express'

import {getUserStats,getAllUsersExceptMe,getAllUsers,getFollowers,getFollowing,updateUserProfile} from '../controllers/userController.js'

import auth from '../middlewares/auth.js';



const router = express.Router();


router.get("/stats/:id", auth, getUserStats);
router.get("/allusers1", auth, getAllUsersExceptMe);
router.get("/allusers2", auth, getAllUsers);
router.get("/followers/:id", auth, getFollowers);
router.get("/following/:id", auth, getFollowing);
router.post("/updateprofile", auth,updateUserProfile)




export default router
