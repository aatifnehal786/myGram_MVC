import User from "../models/userModel.js";
import { blindIndex } from "../models/userModel.js"; // export it from model file, or import from utils

export const signup = async (req, res) => {
  let { username, email, password, mobile } = req.body;
  try {
    email = email.toLowerCase().trim();
    
    // Check with blind indexes
    const oldUser = await User.findOne({ 
      $or: [
        { emailHash: blindIndex(email) },
        { mobileHash: blindIndex(mobile) },
        { username }
      ]
    });
    if(oldUser) {
      if(oldUser.username === username) return res.status(403).json({ message: "Username already exists" });
      return res.status(403).json({ message: "User already registered with email or mobile" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(401).json({ message: "Password must contain uppercase, lowercase, number, and special char" });
    }

    // DON'T hash here - model will hash
    const user = await User.create({ username, email, password, mobile });

    res.status(201).json({ user, message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    if(err.code === 11000) return res.status(403).json({ message: "Duplicate email/mobile/username" });
    res.status(500).json({ message: "Server error" });
  }
};