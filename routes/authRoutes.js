import express from "express";
import {login} from '../controllers/login.js'
import {signup} from '../controllers/signup.js'
import {guestLogin} from '../controllers/guestLogin.js'
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/guest-login",guestLogin);


export default router;
