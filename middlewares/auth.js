import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const verifiedToken = async (req, res, next) => {
    const authHeader = req.header("Authorization");
    console.log("Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Missing or malformed token",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // ==========================
        // Guest Login
        // ==========================
        if (decoded.isGuest) {
            req.user = {
                _id: decoded.id,
                username: decoded.fullName || "Guest User",
                fullName: decoded.fullName || "Guest User",
                role: "guest",
                isGuest: true,
            };

            return next();
        }

        // ==========================
        // Normal User Login
        // ==========================
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                error: "Invalid token",
            });
        }

        // ==========================
        // Device Verification
        // ==========================
        const currentDeviceId = req.headers["x-device-id"];

        const device = user.devices.find((d) => d.deviceId === currentDeviceId);

        if (!device || !device.authorized) {
            return res.status(403).json({
                error: "Device removed or unauthorized. Please login again.",
            });
        }

        req.user = user;

        next();

    } catch (err) {
        console.error("JWT verification error:", err.message);

        return res.status(401).json({
            error: "Invalid token",
        });
    }
};

export default verifiedToken;