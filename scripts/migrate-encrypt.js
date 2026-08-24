import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent folder (myGram_MVC/.env)
dotenv.config({ path: path.join(__dirname, "../.env") });

import mongoose from "mongoose";
import crypto from "crypto";

const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
console.log("Using URI:", uri ? "found ✅" : "NOT FOUND ❌");

if(!uri) {
  console.log("Available env keys:", Object.keys(process.env).filter(k=>k.includes("MONGO")));
  throw new Error("MONGO_URL missing - make sure .env is in myGram_MVC folder");
}

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  if (text.includes(":") && text.split(":").length === 3) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

function blindIndex(text) {
  if (!text) return null;
  return crypto.createHmac("sha256", ENCRYPTION_KEY).update(text.toLowerCase().trim()).digest("hex");
}

await mongoose.connect(uri);
console.log("Connected ✅");

const db = mongoose.connection.db;

const users = await db.collection("users").find({ emailHash: { $exists: false } }).toArray();
console.log(`Found ${users.length} users to migrate`);

for (const u of users) {
  if(!u.email) continue;
  const plainEmail = u.email;
  const plainMobile = u.mobile;
  await db.collection("users").updateOne(
    { _id: u._id },
    { $set: { 
      email: encrypt(plainEmail),
      emailHash: blindIndex(plainEmail),
      mobile: plainMobile ? encrypt(plainMobile) : null,
      mobileHash: plainMobile ? blindIndex(plainMobile) : null
    }}
  );
  console.log(`Migrated: ${u.username}`);
}

console.log("✅ DONE");
await mongoose.disconnect();
process.exit(0);