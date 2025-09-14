import express from "express";
import {
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailOtp,
  verifyEmailOtp,
} from "../controllers/otpControllers.js";

const router = express.Router();

// 📱 Mobile OTP
router.post("/send-otp", sendMobileOtp);
router.post("/verify-otp", verifyMobileOtp);

// 📧 Email OTP
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);

export default router;
