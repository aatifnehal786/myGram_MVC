import bcrypt from "bcryptjs";
import crypto from 'crypto'
import User from '../models/userModel.js'
import { sendOtpEmail } from "../utils/sendMail.js";

let otpStorage = {};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not registered" });

  const otp = crypto.randomInt(100000, 999999).toString();
  otpStorage[email] = { otp, expiresAt: Date.now() +  10* 60 * 1000 };

   try {
   await sendOtpEmail(email,otp)

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

const resetPassword = async (req, res) => {
  const { email, newPass, otp } = req.body;
  const storedData = otpStorage[email];

  if (!storedData || storedData.otp !== otp || storedData.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

      const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPass)) {
    return res.status(401).json({
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isSame = await bcrypt.compare(newPass, user.password);
    if (isSame) return res.status(400).json({ error: "New password cannot be same" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPass, salt);
    await user.save();

    delete otpStorage[email];
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Some problem occurred" });
  }
};



export {forgotPassword,resetPassword}