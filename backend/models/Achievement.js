const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Achievement title is required'],
    trim: true,
    maxlength: [100, 'Achievement title cannot exceed 100 characters'],
    minlength: [3, 'Achievement title must be at least 3 characters long']
  },
  description: {
    type: String,
    required: [true, 'Achievement description is required'],
    trim: true,
    maxlength: [500, 'Achievement description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: {
      values: ['learning', 'streak', 'social', 'completion', 'mastery', 'exploration', 'speed', 'perfection'],
      message: 'Category must be one of: learning, streak, social, completion, mastery, exploration, speed, perfection'
    },
    required: [true, 'Achievement category is required']
  },
  type: {
    type: String,
    enum: {
      values: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      message: 'Achievement type must be bronze, silver, gold, platinum, or diamond'
    },
    default: 'bronze'
  },
  xpReward: {
    type: Number,
    default: 50,
    min: [0, 'XP reward cannot be negative'],
    max: [1000, 'XP reward cannot exceed 1,000']
  },
  badge: {
    type: String,
    required: [true, 'Badge icon is required'],
    trim: true,
    maxlength: [255, 'Badge URL cannot exceed 255 characters']
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [100, 'Icon name cannot exceed 100 characters']
  },
  color: {
    type: String,
    default: '#FFD700',
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code']
  },
  criteria: {
    type: {
      type: String,
      enum: {
        values: ['lessons_completed', 'streak_days', 'courses_finished', 'perfect_scores', 'time_spent', 'subjects_mastered', 'friends_referred', 'achievements_unlocked'],
        message: 'Criteria type must be valid'
      },
      required: true
    },
    target: {
      type: Number,
      min: [1, 'Target must be at least 1'],
      required: true
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters']
    }
  },
  rarity: {
    type: String,
    enum: {
      values: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      message: 'Rarity must be common, uncommon, rare, epic, or legendary'
    },
    default: 'common'
  },
  points: {
    type: Number,
    default: 10,
    min: [0, 'Points cannot be negative'],
    max: [100, 'Points cannot exceed 100']
  },
  secret: {
    type: Boolean,
    default: false
  },
  hidden: {
    type: Boolean,
    default: false
  },
  prerequisite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  },
  rewards: {
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Reward title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Reward description cannot exceed 300 characters']
    },
    cosmetic: {
      avatar_frame: {
        type: String,
        trim: true,
        maxlength: [255, 'Avatar frame URL cannot exceed 255 characters']
      },
      profile_theme: {
        type: String,
        trim: true,
        maxlength: [100, 'Profile theme cannot exceed 100 characters']
      }
    }
  },
  stats: {
    unlockedCount: {
      type: Number,
      default: 0,
      min: [0, 'Unlocked count cannot be negative']
    },
    unlockRate: {
      type: Number,
      default: 0,
      min: [0, 'Unlock rate cannot be negative'],
      max: [100, 'Unlock rate cannot exceed 100']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Achievement creator is required']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
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

// Indexes for better performance
achievementSchema.index({ category: 1, type: 1 });
achievementSchema.index({ rarity: 1 });
achievementSchema.index({ isActive: 1, hidden: 1 });
achievementSchema.index({ title: 'text', description: 'text' });
achievementSchema.index({ createdAt: -1 });
achievementSchema.index({ 'criteria.type': 1, 'criteria.target': 1 });

// Virtual for difficulty level based on criteria
achievementSchema.virtual('difficultyLevel').get(function() {
  if (!this.criteria || !this.criteria.target) return 1;
  
  const target = this.criteria.target;
  if (target <= 5) return 1;
  if (target <= 15) return 2;
  if (target <= 30) return 3;
  if (target <= 50) return 4;
  return 5;
});

// Virtual for estimated time to complete (in days)
achievementSchema.virtual('estimatedDaysToComplete').get(function() {
  if (!this.criteria || !this.criteria.target) return 1;
  
  const target = this.criteria.target;
  switch (this.criteria.type) {
    case 'lessons_completed':
      return Math.ceil(target / 2); // Assuming 2 lessons per day
    case 'streak_days':
      return target;
    case 'courses_finished':
      return Math.ceil(target * 7); // Assuming 1 course per week
    case 'perfect_scores':
      return Math.ceil(target / 3); // Assuming 3 perfect scores per day
    default:
      return Math.ceil(target / 7);
  }
});

// Pre-save middleware
achievementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get achievements by category
achievementSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ category, isActive: true, hidden: false })
    .sort({ type: 1, xpReward: -1 })
    .limit(limit)
    .lean();
};

// Static method to get secret achievements
achievementSchema.statics.getSecretAchievements = function() {
  return this.find({ secret: true, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to search achievements
achievementSchema.statics.searchAchievements = function(query, options = {}) {
  const { category, rarity, limit = 20 } = options;
  
  let searchQuery = { isActive: true, hidden: false };
  
  if (query && query.trim()) {
    searchQuery.$text = { $search: query };
  }
  
  if (category) searchQuery.category = category;
  if (rarity) searchQuery.rarity = rarity;

  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, xpReward: -1 })
    .limit(limit)
    .lean();
};

// Instance method to check if achievement is unlocked for user
achievementSchema.methods.isUnlockedForUser = function(userProgress) {
  if (!this.criteria || !userProgress) return false;
  
  const { type, target, subject } = this.criteria;
  let currentProgress = 0;
  
  switch (type) {
    case 'lessons_completed':
      currentProgress = userProgress.lessonsCompleted || 0;
      break;
    case 'streak_days':
      currentProgress = userProgress.streak || 0;
      break;
    case 'courses_finished':
      currentProgress = userProgress.coursesCompleted || 0;
      break;
    case 'perfect_scores':
      currentProgress = userProgress.perfectScores || 0;
      break;
    case 'time_spent':
      currentProgress = userProgress.totalTimeSpent || 0;
      break;
    case 'subjects_mastered':
      currentProgress = userProgress.subjectsMastered || 0;
      break;
    default:
      return false;
  }
  
  return currentProgress >= target;
};

// Instance method to unlock achievement for user
achievementSchema.methods.unlockForUser = function(user) {
  if (user.achievements.includes(this._id)) {
    return Promise.resolve(user); // Already unlocked
  }
  
  user.achievements.push(this._id);
  user.xp += this.xpReward;
  user.totalXp += this.xpReward;
  
  // Update achievement stats
  this.stats.unlockedCount += 1;
  
  return Promise.all([
    user.save(),
    this.save()
  ]);
};

module.exports = mongoose.model('Achievement', achievementSchema);