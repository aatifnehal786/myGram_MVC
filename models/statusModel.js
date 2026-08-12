import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String }, // image/video
  mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
  text: { type: String }, // for text status
  bgColor: { type: String, default: '#000000' }, // for text status
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours
});

// Auto delete after 24hr
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Status', statusSchema);