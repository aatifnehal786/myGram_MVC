import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true }, // ✅ lowercase 'users'
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
  text: { type: String },
  bgColor: { type: String, default: '#000000' },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }], // ✅ lowercase 'users'
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
});

statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Status', statusSchema);