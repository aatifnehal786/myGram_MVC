import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export const guestLogin = async (req, res) => {
    const { fullName } = req.body;
    try {
        const guestId = uuidv4();

        const token = jwt.sign( 
            {
                id: guestId,
                fullName: fullName || "Guest User", // ADD THIS
                role: "guest",
                isGuest: true,
                isVerified: true // ADD THIS
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            success: true,
            message: "Guest login successful",
            token,
            user: {
                _id: guestId,
                username: fullName || "Guest User",
                fullName: fullName || "Guest User",
                profilePic: "",
                isGuest: true,
                isVerified: true // ADD THIS
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};