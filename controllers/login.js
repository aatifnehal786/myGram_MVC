import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { blindIndex } from "../models/userModel.js";

export const login = async (req, res) => {
  const { loginId, password } = req.body;
  try {
    const normalizedId = loginId.toLowerCase().trim();
    
    // Search using blind index for encrypted fields
    const user = await User.findOne({
      $or: [
        { emailHash: blindIndex(normalizedId) },
        { mobileHash: blindIndex(loginId) }, // mobile blindIndex also uses toLowerCase, safe
        { username: loginId }, // username is NOT encrypted
      ],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // 3. Check email verification
    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Email not verified. Please verify your email." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    // NEVER put email in JWT - it's sensitive. Put id and username
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      userid: user._id,
      name: user.username,
      email: user.email, // this will be auto-decrypted by post hook
      profilePic: user.profilePic,
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};