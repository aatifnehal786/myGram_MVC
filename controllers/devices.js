import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
 // centralize OTP storage

import OTP from "../models/otpModels.js";

export const verifyDeviceOtp = async (req, res) => {
  const { email, otp, deviceId } = req.body;

  if (!email || !otp || !deviceId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // ✅ Find OTP in DB
    const otpDoc = await OTP.findOne({ email: email.toLowerCase() });
    if (!otpDoc || otpDoc.otp !== String(otp) || otpDoc.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ OTP is valid → authorize device
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ua = req.useragent;

    const existingDevice = user.devices.find(d => d.deviceId === deviceId);

    if (existingDevice) {
      existingDevice.ip = req.ip;
      existingDevice.userAgent = ua.source;
      existingDevice.authorized = true;
      existingDevice.addedAt = new Date();
    } else {
      user.devices.push({
        deviceId,
        ip: req.ip,
        userAgent: ua.source,
        authorized: true,
        addedAt: new Date(),
      });
    }

    await user.save();

    // ✅ Delete OTP after use
    await OTP.deleteOne({ _id: otpDoc._id });

    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      message: "Device verified & login successful",
      userid: user._id,
      name: user.username,
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ✅ Get all devices
export const getDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("devices");
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log(user.devices);
    res.json({ devices: user.devices });
  } catch (err) {
    console.error("Fetch devices error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Remove one device
export const removeDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.user._id);
    console.log(req.user._id)
    if (!user) return res.status(404).json({ message: "User not found" });

    const originalLength = user.devices.length;
    user.devices = user.devices.filter((d) => d.deviceId !== deviceId);

    // if (user.devices.length === originalLength) {
    //   return res.status(404).json({ message: "Device not found" });
    // }

    await user.save();
    res.json({ message: "Device removed", devices: user.devices });
  } catch (err) {
    console.error("Remove device error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Remove all other devices except current
export const removeOtherDevices = async (req, res) => {
  try {
    const { currentDeviceId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.devices = user.devices.filter((d) => d.deviceId === currentDeviceId);
    await user.save();

    res.json({ message: "Removed all other devices", devices: user.devices });
  } catch (err) {
    console.error("Remove other devices error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
