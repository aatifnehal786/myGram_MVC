import dns from 'node:dns/promises'
dns.setServers(["8.8.8.8","1.1.1.1"])

import "dotenv/config"; 

// --- SECURITY CHECK AT BOOT ---
if (!process.env.FIELD_ENCRYPTION_KEY || process.env.FIELD_ENCRYPTION_KEY.length !== 64) {
  console.error("❌ FATAL: FIELD_ENCRYPTION_KEY must be 64 hex chars. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}
if (!process.env.JWT_SECRET_KEY) {
  console.error("❌ FATAL: JWT_SECRET_KEY missing");
  process.exit(1);
}

import express from "express";
import cors from 'cors'
import helmet from 'helmet' // ADD THIS
import connectDB from "./config/db.js";
import http from 'http'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import followRoutes from './routes/followRoutes.js'
import passwordRoutes from './routes/passwordRoutes.js'
import postRoutes from './routes/postRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import userRoutes from './routes/userRoutes.js'
import otpRoutes from './routes/otpRoutes.js'
import useragent from 'express-useragent'
import socketHandler from "./Socket/socket.js";
import statusRoutes from './routes/statusRoutes.js'

await connectDB();

const app = express();
const server = http.createServer(app);

// 1. Trust proxy MUST be first for rate limiter + secure cookies
app.set("trust proxy", 1);

// 2. Helmet - sets 15+ security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for S3 images / video
  contentSecurityPolicy: false, // allow netlify frontend
}));

app.use(cors({
  origin: ["https://mygram247.netlify.app", "http://localhost:5173","http://localhost:8081"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));

// 3. Rate limiter - after trust proxy
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // increased from 20 - 20 is too low for chat polling + posts
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, error: 'Too many requests, slow down' },
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 login attempts per 15 min
  message: { status: 429, error: 'Too many login attempts, try after 15 min' },
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

app.use(limiter); // global
app.use("/api/auth", authLimiter); // extra strict for auth

app.use(express.json({ limit: "10mb" })); // FIX: only once, 50mb is too big for DDoS
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(useragent.express());

// 4. Socket
const io = socketHandler(server);
app.set("io", io);

// 5. Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", followRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/user", userRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/otp", otpRoutes);

// Health check
app.get("/", (req, res) => res.send("myGram API running with encryption ✅"));

// Global error handler - don't leak encryption errors
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate field" });
  }
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} with encryption enabled`));