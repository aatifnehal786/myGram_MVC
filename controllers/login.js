import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import { sendOtpEmail } from "../utils/sendMail.js";

import OTP from "../models/otpModels.js";


export const login = async (req, res) => {
  const { loginId, password, deviceId } = req.body;
  const ipAddress = req.ip;

  try {
    const user = await User.findOne({
      $or: [{ email: loginId }, { username: loginId }, { mobile: loginId }],
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.isEmailVerified)
      return res.status(403).json({ message: "Email not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    const ua = req.useragent;

    const existingDevice = user.devices.find(d => d.deviceId === deviceId);

    if (existingDevice && existingDevice.authorized) {
      const token = jwt.sign(
        { email: user.email, id: user._id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        token,
        message: "Login successful",
        userid: user._id,
        name: user.username,
      });
    }

    // ⚠️ New device or unauthorized device → send OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Remove old OTP if exists
    await OTP.deleteMany({ email: user.email.toLowerCase() });

    // Save OTP in DB
    const otpDoc = await OTP.create({
      email: user.email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });

    await sendOtpEmail(user.email, otp);

    // Add device if not exists
    if (!existingDevice) {
      user.devices.push({
        deviceId,
        ip: ipAddress,
        userAgent: ua.source,
        authorized: false,
        addedAt: new Date(),
        lastUsed: new Date(),
      });
      await user.save();
    }

    res.status(200).json({
      otpRequired: true,
      message: "New device detected. OTP sent to email.",
      email: user.email,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

