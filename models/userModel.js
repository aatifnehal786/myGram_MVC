// models/userModel.js
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex'); // 64 hex chars

const encrypt = (text) => {
  if(!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let enc = cipher.update(String(text), "utf8", "hex");
  enc += cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc}`;
};

const decrypt = (payload) => {
  if(!payload || !payload.includes(":")) return payload;
  try {
    const [ivHex, tagHex, enc] = payload.split(":");
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    let dec = decipher.update(enc, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch { return payload; }
};

export const blindIndex = (val) => crypto.createHmac('sha256', KEY).update(String(val).toLowerCase().trim()).digest('hex');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  emailHash: { type: String, required: true, unique: true, index: true },
  mobile: { type: String, required: true },
  mobileHash: { type: String, required: true, unique: true, index: true },
  profilePic: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  password: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  // hash password only once - check if already hashed
  if(this.isModified("password") && !this.password.startsWith("$2a$")) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if(this.isModified("email")) {
    this.emailHash = blindIndex(this.email);
    this.email = encrypt(this.email.toLowerCase());
  }
  if(this.isModified("mobile")) {
    this.mobileHash = blindIndex(this.mobile);
    this.mobile = encrypt(this.mobile);
  }
  next();
});

const decryptUser = (doc) => {
  if(!doc) return;
  if(doc.email) doc.email = decrypt(doc.email);
  if(doc.mobile) doc.mobile = decrypt(doc.mobile);
};
userSchema.post(/^find/, function(docs) {
  if(Array.isArray(docs)) docs.forEach(decryptUser);
  else decryptUser(docs);
});

const User = mongoose.model("users", userSchema);
export default User;