const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['daily', 'weekly', 'achievement'], default: 'daily' },
  requirements: { type: String },
  xpReward: { type: Number, default: 20 }
});

module.exports = mongoose.model('Quest', questSchema);