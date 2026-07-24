import express from "express";
import {
  verifyDeviceOtp,
  getDevices,
  removeDevice,
  removeOtherDevices,
} from "../controllers/devices.js";
import auth from "../middlewares/auth.js";
import {blockGuest} from "../controllers/blockGuest.js";

const router = express.Router();

// ✅ Verify device OTP
router.post("/verify-device-otp", verifyDeviceOtp);

// ✅ Get all devices
router.get("/devices", auth,blockGuest, getDevices);

// ✅ Remove one device
router.delete("/devices/:deviceId", auth, blockGuest, removeDevice);

// ✅ Remove all other devices
router.delete("/devices/remove-others/:currentDeviceId", auth, blockGuest, removeOtherDevices);

export default router;
