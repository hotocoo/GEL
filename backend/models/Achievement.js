const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  xpReward: { type: Number, default: 50 },
  badge: { type: String }
});

module.exports = mongoose.model('Achievement', achievementSchema);