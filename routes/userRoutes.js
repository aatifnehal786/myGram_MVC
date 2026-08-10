import express from 'express'

import {getUserStats,getAllUsersExceptMe,getAllUsers,getFollowers,getFollowing,updateUserProfile,getAllUsersStats} from '../controllers/userController.js'

import auth from '../middlewares/auth.js';
import {blockGuest} from '../controllers/blockGuest.js'


const router = express.Router();


router.get("/stats/:id",blockGuest, auth, getUserStats);
router.get("/allusers1", auth, getAllUsersExceptMe);
router.get("/allusers2", auth, getAllUsers);
router.get("/allusersstats", auth, getAllUsersStats);
router.get("/followers/:id", auth,blockGuest, getFollowers);
router.get("/following/:id", auth,blockGuest, getFollowing);
router.put("/updateprofile", auth,blockGuest, updateUserProfile)




export default router
