import express from 'express'

import {getUserStats,getAllUsersExceptMe,getAllUsers} from '../controllers/userController.js'

import auth from '../middlewares/auth.js';



const router = express.Router();


router.get("/stats/:id", auth, getUserStats);
router.get("/allusers1", auth, getAllUsersExceptMe);
router.get("/allusers2", auth, getAllUsers);


export default router
