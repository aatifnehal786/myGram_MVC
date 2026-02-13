import crypto from "crypto";
import User from "../models/userModel.js";

import client from "../config/client.js"; // assume you export Twilio client
import { sendOtpEmail } from "../utils/sendMail.js";

const otpStorage = {}

// 📱 Send Mobile OTP (Twilio)
export const sendMobileOtp = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: "Mobile number required" });

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILLO_SERVICE_SID)
      .verifications.create({ to: `+91${mobile}`, channel: "sms" });

    res.json({ message: "OTP sent", status: verification.status });
  } catch (err) {
    console.error("OTP Send Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 📱 Verify Mobile OTP (Twilio)
export const verifyMobileOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp)
    return res.status(400).json({ error: "Mobile and OTP required" });

  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: `+91${mobile}`, code: otp });

    if (verificationCheck.status === "approved") {
      res.json({ message: "OTP verified successfully" });
    } else {
      res.status(400).json({ error: "Invalid or expired OTP" });
    }
  } catch (err) {
    console.error("OTP Verify Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 📧 Send Email OTP
export const sendEmailOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = crypto.randomInt(100000, 999999).toString();
  otpStorage[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });
  if(user.isEmailVerified) return res.status(400).json({ message: "Email is already verified" });
  try {
   await sendOtpEmail(email,otp)

    res.json({ message: "OTP sent successfully",data:email });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// 📧 Verify Email OTP
export const verifyEmailOtp = async (req, res) => {
  const email = req.body.email?.toLowerCase();
  const otp = req.body.otp?.toString();

  const storedData = otpStorage[email];
  if (!storedData || storedData.otp !== otp || storedData.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  

  try {
    await User.updateOne({ email }, { isEmailVerified: true });
    delete otpStorage[email];

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};
