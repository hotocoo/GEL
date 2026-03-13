const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'admin'],
      message: 'Role must be either student or admin'
    },
    default: 'student'
  },
  avatar: {
    type: String,
    default: 'default-avatar.png',
    maxlength: [255, 'Avatar URL cannot exceed 255 characters']
  },
  level: {
    type: Number,
    default: 1,
    min: [1, 'Level must be at least 1'],
    max: [1000, 'Level cannot exceed 1000']
  },
  xp: {
    type: Number,
    default: 0,
    min: [0, 'XP cannot be negative']
  },
  totalXp: {
    type: Number,
    default: 0,
    min: [0, 'Total XP cannot be negative']
  },
  streak: {
    type: Number,
    default: 0,
    min: [0, 'Streak cannot be negative']
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: [0, 'Longest streak cannot be negative']
  },
  badges: [{
    type: String,
    maxlength: [50, 'Badge name cannot exceed 50 characters']
  }],
  achievements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    default: []
  }],
  progress: [{
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters']
    },
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Course name cannot exceed 100 characters']
    },
    lessonsCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Lessons completed cannot be negative']
    },
    totalLessons: {
      type: Number,
      default: 0,
      min: [0, 'Total lessons cannot be negative']
    },
    score: {
      type: Number,
      default: 0,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100']
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    soundEffects: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en',
      maxlength: [10, 'Language code cannot exceed 10 characters']
    }
  },
  stats: {
    totalLessonsCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Total lessons completed cannot be negative']
    },
    totalQuizzesPassed: {
      type: Number,
      default: 0,
      min: [0, 'Total quizzes passed cannot be negative']
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
      min: [0, 'Total time spent cannot be negative']
    },
    averageScore: {
      type: Number,
      default: 0,
      min: [0, 'Average score cannot be negative'],
      max: [100, 'Average score cannot exceed 100']
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common query patterns (username and email are already indexed via unique:true)
userSchema.index({ level: -1, totalXp: -1 }); // For leaderboards - optimized
userSchema.index({ totalXp: -1 }); // XP leaderboard
userSchema.index({ createdAt: -1 }); // Recent users
userSchema.index({ lastLogin: -1 }); // Active users
userSchema.index({ 'progress.subject': 1, 'progress.course': 1 }); // Progress queries
userSchema.index({ role: 1, isActive: 1 }); // Admin/active user queries
userSchema.index({ level: -1, streak: -1 }); // Gamification leaderboards
userSchema.index({ 'stats.totalLessonsCompleted': -1 }); // Progress leaderboards
userSchema.index({ emailVerified: 1, createdAt: -1 }); // Email verification queries

// Partial index for password reset tokens (only when they exist)
userSchema.index(
  { resetPasswordToken: 1 },
  {
    partialFilterExpression: { resetPasswordToken: { $exists: true } },
    sparse: true
  }
);


// TTL index for password reset tokens (expire after 1 hour)
userSchema.index(
  { resetPasswordExpires: 1 },
  { expireAfterSeconds: 0 }
);

// TTL index for email verification tokens (expire after 24 hours)
userSchema.index(
  { emailVerificationToken: 1 },
  {
    partialFilterExpression: { emailVerificationToken: { $exists: true } },
    expireAfterSeconds: 86400 // 24 hours
  }
);

// Virtual for XP to next level (XP needed within current level to advance)
userSchema.virtual('xpToNextLevel').get(function() {
  return 100; // Each level requires 100 XP
});

// Virtual for level progress percentage (within current level)
userSchema.virtual('levelProgress').get(function() {
  return this.xp; // xp is already 0-99 within current level
});

// Pre-save middleware to update updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add XP and handle level up
userSchema.methods.addXP = function(xpAmount) {
  this.totalXp += xpAmount;
  
  // Level = floor(totalXp / 100) + 1
  const newLevel = Math.floor(this.totalXp / 100) + 1;
  const leveledUp = newLevel > this.level;
  if (leveledUp) {
    this.level = newLevel;
  }
  // xp is current XP within the current level
  this.xp = this.totalXp % 100;
  
  return this.save().then(saved => ({ user: saved, leveledUp, newLevel }));
};

// Method to update streak
userSchema.methods.updateStreak = function() {
  const today = new Date();
  const lastLoginDate = new Date(this.lastLogin);
  const daysDiff = Math.floor((today - lastLoginDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) {
    // Consecutive day
    this.streak += 1;
    if (this.streak > this.longestStreak) {
      this.longestStreak = this.streak;
    }
  } else if (daysDiff > 1) {
    // Streak broken
    this.streak = 1;
  }
  // daysDiff === 0 means same day login, keep streak unchanged
  
  this.lastLogin = today;
  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ level: -1, totalXp: -1 })
    .limit(limit)
    .select('username level xp avatar')
    .lean();
};

module.exports = mongoose.model('User', userSchema);