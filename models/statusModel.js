import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  mediaUrl: { type: String }, // DON'T encrypt - Cloudinary URL
  mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
  text: { type: String }, // WILL encrypt
  bgColor: { type: String, default: '#000000' },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
});

// Auto-delete after 24h
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Encrypt text before save
statusSchema.pre("save", function(next) {
  if (this.isModified("text") && this.text) {
    this.text = encrypt(this.text);
  }
  next();
});

// Decrypt after find - so frontend gets plain text
const decryptText = (doc) => {
  if (doc?.text) doc.text = decrypt(doc.text);
};

statusSchema.post("find", function(docs) {
  docs.forEach(decryptText);
});
statusSchema.post("findOne", function(doc) {
  decryptText(doc);
});
statusSchema.post("findOneAndUpdate", function(doc) {
  decryptText(doc);
});

export default mongoose.model('Status', statusSchema);