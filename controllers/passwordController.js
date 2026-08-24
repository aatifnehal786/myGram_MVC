import bcrypt from "bcryptjs";
import crypto from 'crypto'
import User from '../models/userModel.js'
import { blindIndex } from '../models/userModel.js' // import from your model file
import { sendOtpEmail } from "../utils/sendMail.js";

let otpStorage = {}; // key = emailHash

const forgotPassword = async (req, res) => {
  let { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  email = email.toLowerCase().trim();
  const hash = blindIndex(email);

  const user = await User.findOne({ emailHash: hash });
  if (!user) return res.status(404).json({ message: "User not registered" });

  const otp = crypto.randomInt(100000, 999999).toString();

  // Store by hash, not plain email - so we don't leak email in memory
  otpStorage[hash] = {
    otp,
    plainEmail: email, // needed for sending email
    expiresAt: Date.now() + 10 * 60 * 1000
  };

  const message = await sendOtpEmail(email, otp); // send to plain email

  if(message?.code === 'unauthorized'){
    return res.status(401).json({ error: message.message });
  }
  res.status(200).json({ message: "OTP sent successfully" });
};

const resetPassword = async (req, res) => {
  let { email, newPass, otp } = req.body;
  if(!email ||!newPass ||!otp) return res.status(400).json({ error: "All fields required" });

  email = email.toLowerCase().trim();
  const hash = blindIndex(email);
  const storedData = otpStorage[hash];

  if (!storedData || storedData.otp!== otp || storedData.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPass)) {
    return res.status(401).json({
      message: "Password must contain uppercase, lowercase, number, and special char",
    });
  }

  try {
    const user = await User.findOne({ emailHash: hash });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isSame = await bcrypt.compare(newPass, user.password);
    if (isSame) return res.status(400).json({ error: "New password cannot be same as old" });

    // Don't hash manually - your User model pre-save hook does it
    // Just set plain, it will hash automatically
    user.password = newPass;
    await user.save();

    delete otpStorage[hash];
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Some problem occurred" });
  }
};

export { forgotPassword, resetPassword }