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
    // ❗ DeviceId must exist
    if (!deviceId) {
      return res.status(400).json({ message: "Device ID is required" });
    }

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

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    // 🔐 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const ua = req.useragent;

    // 🔍 Check device
    let existingDevice = user.devices.find(d => d.deviceId === deviceId);

    // ✅ CASE 1: Known & Authorized Device → Direct Login
    if (existingDevice && existingDevice.authorized) {
      existingDevice.lastUsed = new Date(); // update last used
      await user.save();

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

    // ⚠️ CASE 2: New or Unauthorized Device → OTP flow

    const otp = crypto.randomInt(100000, 999999).toString();

    // Remove old OTPs
    await OTP.deleteMany({ email: user.email.toLowerCase() });

    // Save OTP
    await OTP.create({
      email: user.email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // Send OTP
    await sendOtpEmail(user.email, otp);

    // ➕ Add new device if not exists
    if (!existingDevice) {
      user.devices.push({
        deviceId,
        ip: ipAddress,
        userAgent: ua?.source || "unknown",
        authorized: false,
        addedAt: new Date(),
        lastUsed: new Date(),
      });
    } else {
      // Device exists but not authorized → update info
      existingDevice.ip = ipAddress;
      existingDevice.userAgent = ua?.source || "unknown";
      existingDevice.lastUsed = new Date();
    }

    await user.save();

    return res.status(200).json({
      otpRequired: true,
      message: "New or untrusted device. OTP sent to email.",
      email: user.email,
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};