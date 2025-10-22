const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
  videoUrl: { type: String },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    difficulty: { type: Number, default: 1 }
  }],
  keyPoints: [{ type: String }],
  xpReward: { type: Number, default: 10 }
});

module.exports = mongoose.model('Lesson', lessonSchema);