import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

// ✅ Signup Controller
export const signup = async (req, res) => {
  let { username, email, password, mobile } = req.body;

  try {
    // Check if email already exists
    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.status(403).json({ message: "User already registered" });
    }

    // Check if username already exists
    const oldUsername = await User.findOne({ username });
    if (oldUsername) {
      return res
        .status(403)
        .json({ message: "Choose different username, already exists" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(401).json({
        message:
          "Password must contain at least one uppercase, one lowercase, one number, and one special character",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      mobile,
    });

    res.status(201).json({ user, message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
