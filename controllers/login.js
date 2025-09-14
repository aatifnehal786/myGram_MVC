import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import { sendOtpEmail } from "../utils/sendMail.js";

const otpStorage = {}

export const login = async (req, res) => {
  const { loginId, password, deviceId } = req.body;
  const ipAddress = req.ip;

  try {
    // 🔍 Find user
    const user = await User.findOne({
      $or: [{ email: loginId }, { username: loginId }, { mobile: loginId }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.isEmailVerified)
      return res.status(403).json({ message: "Email not verified" });

    // ✅ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    const ua = req.useragent; // requires useragent middleware

    // 🔎 Check device
    const existingDevice = user.devices.find((d) => d.deviceId === deviceId);

    if (existingDevice) {
      if (existingDevice.authorized) {
        // 🔑 Normal login
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
      } else {
        // ⚠️ Device not authorized → send OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        otpStorage[user.email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

        await sendOtpEmail(user.email, otp);

        return res.status(200).json({
          otpRequired: true,
          message: "New device detected. OTP sent to email.",
          email: user.email,
        });
      }
    } else {
      // 🆕 Add new device + send OTP
      user.devices.push({
        deviceId,
        ip: ipAddress,
        userAgent: ua.source,
        authorized: false,
        addedAt: new Date(),
        lastUsed: new Date(),
      });
      await user.save();

      const otp = crypto.randomInt(100000, 999999).toString();
      otpStorage[user.email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

      await sendOtpEmail(user.email, otp);

      return res.status(200).json({
        otpRequired: true,
        message: "New device detected. OTP sent to email.",
        email: user.email,
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
