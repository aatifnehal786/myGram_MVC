import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import { sendOtpEmail } from "../utils/sendMail.js";
import OTP from "../models/otpModels.js";

export const login = async (req, res) => {
  const { loginId, password } = req.body;
  

  try {
   

    // 🔍 Find user
    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { username: loginId },
        { mobile: loginId },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
console.log("User found:", user);
   

    // 🔐 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }
   
      const token = jwt.sign(
        { email: user.email, id: user._id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Login successful",
        token,
        userid: user._id,
        name: user.username,
        profilePic: user.profilePic || user.profilePicture, // ADD THIS
        profilePicture: user.profilePic || user.profilePicture,
      });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};