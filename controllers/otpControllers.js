import crypto from "crypto";
import User from "../models/userModel.js";
import { blindIndex } from "../models/userModel.js";
import client from "../config/client.js";
import { sendOtpEmail } from "../utils/sendMail.js";

const otpStorage = {} // key = hash

// 📱 Send Mobile OTP (Twilio)
export const sendMobileOtp = async (req, res) => {
  let { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: "Mobile number required" });

  mobile = mobile.toString().replace(/\D/g, "").slice(-10); // keep last 10 digits

  try {
    const verification = await client.verify.v2
     .services(process.env.TWILLIO_SERVICE_SID) // FIXED TYPO: was TWILLO_SERVICE_SID
     .verifications.create({ to: `+91${mobile}`, channel: "sms" });

    res.status(200).json({ message: "OTP sent", status: verification.status });
  } catch (err) {
    console.error("OTP Send Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 📱 Verify Mobile OTP (Twilio)
export const verifyMobileOtp = async (req, res) => {
  let { mobile, otp } = req.body;
  if (!mobile ||!otp) return res.status(400).json({ error: "Mobile and OTP required" });

  mobile = mobile.toString().replace(/\D/g, "").slice(-10);

  try {
    const verificationCheck = await client.verify.v2
     .services(process.env.TWILLIO_SERVICE_SID) // FIXED: use same SID for both
     .verificationChecks.create({ to: `+91${mobile}`, code: otp });

    if (verificationCheck.status === "approved") {
      // OPTIONAL: Mark user mobile verified
      const hash = blindIndex(mobile);
      await User.findOneAndUpdate({ mobileHash: hash }, { isMobileVerified: true });
      res.json({ message: "OTP verified successfully" });
    } else {
      res.status(400).json({ error: "Invalid or expired OTP" });
    }
  } catch (err) {
    console.error("OTP Verify Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 📧 Send Email OTP - FIXED FOR ENCRYPTION
export const sendEmailOtp = async (req, res) => {
  let { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  email = email.toLowerCase().trim();
  const emailHash = blindIndex(email);

  // FIX: Use emailHash not plain email
  const user = await User.findOne({ emailHash });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.isEmailVerified) return res.status(400).json({ message: "Email is already verified" });

  const otp = crypto.randomInt(100000, 999999).toString();

  // FIX: Store by hash, not plain email
  otpStorage[emailHash] = { otp, plainEmail: email, expiresAt: Date.now() + 10 * 60 * 1000 };

  try {
    await sendOtpEmail(email, otp);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// You will also need verifyEmailOtp - adding here
export const verifyEmailOtp = async (req, res) => {
  let { email, otp } = req.body;
  if (!email ||!otp) return res.status(400).json({ error: "Email and OTP required" });

  email = email.toLowerCase().trim();
  const hash = blindIndex(email);
  const stored = otpStorage[hash];

  if (!stored || stored.otp!== otp || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  await User.findOneAndUpdate({ emailHash: hash }, { isEmailVerified: true });
  delete otpStorage[hash];

  res.json({ message: "Email verified" });
};