
import dns from 'node:dns/promises'
dns.setServers(["8.8.8.8","1.1.1.1"])
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from 'cors'
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
import useragent from 'express-useragent'
import socketHandler from "./Socket/socket.js";
import statusRoutes from './routes/statusRoutes.js'

connectDB();

const app = express();
const server = http.createServer(app);


app.use(cors({
  origin: ["https://mygram247.netlify.app", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Create limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too many requests, please try again after 1 minute'
  },
  keyGenerator: (req, res) => {
    return ipKeyGenerator(req.ip);
  }
});

 // Apply to all routes
app.use(limiter)

// app.options("*", cors());
app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(useragent.express());

// attach socket.io
// socketHandler(server);
// Handling Cors



const io = socketHandler(server);

// ✅ Now it's defined
app.set("io", io);

app.set("trust proxy", 1);

// auth Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", followRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/user", userRoutes);
app.use("/api/status",statusRoutes);



const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
