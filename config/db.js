// db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const db = await mongoose.connect(process.env.MONGO_URL);
    console.log(`✅ Database connected: ${process.env.MONGO_URL}`);
    return db;
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB
