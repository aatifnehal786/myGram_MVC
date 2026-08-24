import crypto from "crypto";
import bcrypt from "bcrypt";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex');

if(KEY.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes hex (64 chars)");

export const encrypt = (text) => {
  if(!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let enc = cipher.update(String(text), "utf8", "hex");
  enc += cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc}`;
};

export const decrypt = (payload) => {
  if(!payload || !payload.includes(":")) return payload; // already plain
  try {
    const [ivHex, tagHex, enc] = payload.split(":");
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    let dec = decipher.update(enc, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch { return payload; }
};

// deterministic hash for searching unique fields
export const blindIndex = (val) => crypto.createHmac('sha256', KEY).update(String(val).toLowerCase().trim()).digest('hex');

export const hashPassword = (p) => bcrypt.hash(p, 12);
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);