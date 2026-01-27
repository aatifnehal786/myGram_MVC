import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from 'cors'
import connectDB from "./config/db.js";
import http from 'http'

import authRoutes from './routes/authRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import deviceRoutes from './routes/deviceRoutes.js'
import followRoutes from './routes/followRoutes.js'
import otpRoutes from './routes/otpRoutes.js'
import passwordRoutes from './routes/passwordRoutes.js'
import postRoutes from './routes/postRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import userRoutes from './routes/userRoutes.js'
import useragent from 'express-useragent'
import createPosts from './routes/createPosts.js'
import socketHandler from "./Socket/socket.js";

connectDB();

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(useragent.express());


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// attach socket.io
socketHandler(server);
// Handling Cors

app.use(cors({
  origin: ["https://mygram247.netlify.app", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));


// auth Routes
app.use("/api/auth", authRoutes);
app.use("/api", deviceRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", followRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/user", userRoutes);
app.use("/api/create-posts",createPosts)
// mount
app.use("/api/otp", otpRoutes);


const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
