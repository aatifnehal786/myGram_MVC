import express from 'express'
import { getUserStats, getAllUsersExceptMe, getAllUsers, updateUserProfile, getAllUsersStats } from '../controllers/userController.js'
import auth from '../middlewares/auth.js';
import { blockGuest } from '../controllers/blockGuest.js'

const router = express.Router();

router.get("/stats", auth, getAllUsersStats);
router.get("/stats/:id", auth, blockGuest, getUserStats);
router.get("/allusers1", auth, getAllUsersExceptMe);
router.get("/allusers2", auth, getAllUsers);
router.put("/updateprofile", auth, blockGuest, updateUserProfile);

export default router