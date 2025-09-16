import express from "express";
import {
  verifyDeviceOtp,
  getDevices,
  removeDevice,
  removeOtherDevices,
} from "../controllers/devices.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

// ✅ Verify device OTP
router.post("/verify-device-otp", verifyDeviceOtp);

// ✅ Get all devices
router.get("/devices", auth, getDevices);

// ✅ Remove one device
router.delete("/:deviceId", auth, removeDevice);

// ✅ Remove all other devices
router.delete("/remove-others/:currentDeviceId", auth, removeOtherDevices);

export default router;
