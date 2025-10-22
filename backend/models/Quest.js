const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quest title is required'],
    trim: true,
    maxlength: [150, 'Quest title cannot exceed 150 characters'],
    minlength: [5, 'Quest title must be at least 5 characters long']
  },
  description: {
    type: String,
    required: [true, 'Quest description is required'],
    trim: true,
    maxlength: [1000, 'Quest description cannot exceed 1000 characters']
  },
  story: {
    type: String,
    trim: true,
    maxlength: [2000, 'Quest story cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'monthly', 'seasonal', 'achievement', 'story', 'challenge', 'social'],
      message: 'Quest type must be daily, weekly, monthly, seasonal, achievement, story, challenge, or social'
    },
    default: 'daily'
  },
  category: {
    type: String,
    enum: {
      values: ['learning', 'social', 'exploration', 'mastery', 'speed', 'consistency', 'creativity', 'collaboration'],
      message: 'Category must be learning, social, exploration, mastery, speed, consistency, creativity, or collaboration'
    },
    required: [true, 'Quest category is required']
  },
  difficulty: {
    type: String,
    enum: {
      values: ['easy', 'medium', 'hard', 'expert'],
      message: 'Difficulty must be easy, medium, hard, or expert'
    },
    default: 'easy'
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'completed', 'expired', 'draft'],
      message: 'Status must be active, inactive, completed, expired, or draft'
    },
    default: 'active'
  },
  objectives: [{
    type: {
      type: String,
      enum: {
        values: ['lessons_completed', 'courses_finished', 'streak_maintained', 'perfect_scores', 'time_spent', 'subjects_explored', 'friends_added', 'achievements_unlocked', 'quizzes_passed', 'custom'],
        message: 'Objective type must be valid'
      },
      required: true
    },
    target: {
      type: Number,
      min: [1, 'Target must be at least 1'],
      required: true
    },
    current: {
      type: Number,
      default: 0,
      min: [0, 'Current progress cannot be negative']
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Objective description cannot exceed 200 characters']
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  rewards: {
    xp: {
      type: Number,
      default: 20,
      min: [0, 'XP reward cannot be negative'],
      max: [5000, 'XP reward cannot exceed 5,000']
    },
    achievements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }],
    items: [{
      type: {
        type: String,
        enum: {
          values: ['avatar', 'theme', 'badge', 'title', 'cosmetic'],
          message: 'Item type must be avatar, theme, badge, title, or cosmetic'
        }
      },
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Item name cannot exceed 100 characters']
      },
      value: mongoose.Schema.Types.Mixed
    }],
    bonusMultiplier: {
      type: Number,
      default: 1,
      min: [1, 'Bonus multiplier cannot be less than 1'],
      max: [10, 'Bonus multiplier cannot exceed 10']
    }
  },
  prerequisites: {
    level: {
      type: Number,
      default: 1,
      min: [1, 'Required level cannot be less than 1']
    },
    quests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quest'
    }],
    achievements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }]
  },
  timeLimit: {
    duration: {
      type: Number, // in hours
      min: [1, 'Time limit must be at least 1 hour'],
      max: [720, 'Time limit cannot exceed 720 hours (30 days)']
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    }
  },
  participants: {
    current: {
      type: Number,
      default: 0,
      min: [0, 'Current participants cannot be negative']
    },
    max: {
      type: Number,
      min: [1, 'Max participants must be at least 1']
    },
    whitelist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100']
  },
  completionRate: {
    type: Number,
    default: 0,
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  featured: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative'],
    max: [10, 'Priority cannot exceed 10']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Quest creator is required']
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
  metadata: {
    image: {
      type: String,
      trim: true,
      maxlength: [255, 'Image URL cannot exceed 255 characters']
    },
    color: {
      type: String,
      default: '#4A90E2',
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code']
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [100, 'Icon name cannot exceed 100 characters']
    }
  },
  stats: {
    totalParticipants: {
      type: Number,
      default: 0,
      min: [0, 'Total participants cannot be negative']
    },
    completionCount: {
      type: Number,
      default: 0,
      min: [0, 'Completion count cannot be negative']
    },
    averageCompletionTime: {
      type: Number, // in hours
      default: 0,
      min: [0, 'Average completion time cannot be negative']
    }
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

// Indexes for better performance
questSchema.index({ type: 1, status: 1 });
questSchema.index({ category: 1, difficulty: 1 });
questSchema.index({ featured: -1, priority: -1 });
questSchema.index({ createdAt: -1 });
questSchema.index({ 'timeLimit.endTime': 1 });
questSchema.index({ participants: { current: -1 } });
questSchema.index({ title: 'text', description: 'text' });

// Virtual for completion status
questSchema.virtual('isCompleted').get(function() {
  return this.progress >= 100;
});

// Virtual for time remaining (in milliseconds)
questSchema.virtual('timeRemaining').get(function() {
  if (!this.timeLimit || !this.timeLimit.endTime) return null;
  return Math.max(0, this.timeLimit.endTime.getTime() - Date.now());
});

// Virtual for estimated difficulty score
questSchema.virtual('estimatedDifficulty').get(function() {
  let score = 0;
  if (this.objectives) {
    score += this.objectives.length * 10;
    score += this.objectives.reduce((sum, obj) => sum + (obj.target || 0), 0);
  }
  if (this.difficulty === 'medium') score += 20;
  if (this.difficulty === 'hard') score += 40;
  if (this.difficulty === 'expert') score += 60;
  return Math.min(score, 100);
});

// Pre-save middleware
questSchema.pre('save', function(next) {
  // Update progress based on objectives
  if (this.objectives && this.objectives.length > 0) {
    const completedObjectives = this.objectives.filter(obj => obj.completed).length;
    this.progress = Math.round((completedObjectives / this.objectives.length) * 100);
  }
  
  // Update completion rate based on participants
  if (this.stats.totalParticipants > 0) {
    this.completionRate = Math.round((this.stats.completionCount / this.stats.totalParticipants) * 100);
  }
  
  this.updatedAt = new Date();
  next();
});

// Static method to get active quests
questSchema.statics.getActiveQuests = function(limit = 20) {
  return this.find({ status: 'active' })
    .sort({ featured: -1, priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Static method to get quests by type
questSchema.statics.getByType = function(type, limit = 20) {
  return this.find({ type, status: 'active' })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Static method to search quests
questSchema.statics.searchQuests = function(query, options = {}) {
  const { type, category, difficulty, limit = 20 } = options;
  
  let searchQuery = { status: 'active' };
  
  if (query && query.trim()) {
    searchQuery.$text = { $search: query };
  }
  
  if (type) searchQuery.type = type;
  if (category) searchQuery.category = category;
  if (difficulty) searchQuery.difficulty = difficulty;

  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, priority: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Instance method to check if user can participate
questSchema.methods.canUserParticipate = function(user) {
  // Check level requirement
  if (user.level < this.prerequisites.level) {
    return false;
  }
  
  // Check quest prerequisites
  if (this.prerequisites.quests && this.prerequisites.quests.length > 0) {
    const completedQuests = this.prerequisites.quests.filter(questId =>
      user.completedQuests && user.completedQuests.includes(questId)
    );
    if (completedQuests.length < this.prerequisites.quests.length) {
      return false;
    }
  }
  
  // Check achievement prerequisites
  if (this.prerequisites.achievements && this.prerequisites.achievements.length > 0) {
    const hasRequiredAchievements = this.prerequisites.achievements.every(achievementId =>
      user.achievements && user.achievements.includes(achievementId)
    );
    if (!hasRequiredAchievements) {
      return false;
    }
  }
  
  // Check participant limits
  if (this.participants.max && this.participants.current >= this.participants.max) {
    return false;
  }
  
  // Check whitelist
  if (this.participants.whitelist && this.participants.whitelist.length > 0) {
    if (!this.participants.whitelist.includes(user._id)) {
      return false;
    }
  }
  
  // Check time limit
  if (this.timeLimit && this.timeLimit.endTime) {
    if (Date.now() > this.timeLimit.endTime.getTime()) {
      return false;
    }
  }
  
  return true;
};

// Instance method to add participant
questSchema.methods.addParticipant = function(userId) {
  if (!this.participants.users) {
    this.participants.users = [];
  }
  
  if (!this.participants.users.includes(userId)) {
    this.participants.users.push(userId);
    this.participants.current = this.participants.users.length;
    this.stats.totalParticipants += 1;
  }
  
  return this.save();
};

// Instance method to update objective progress
questSchema.methods.updateObjectiveProgress = function(objectiveIndex, progress) {
  if (this.objectives[objectiveIndex]) {
    this.objectives[objectiveIndex].current = Math.min(progress, this.objectives[objectiveIndex].target);
    
    if (this.objectives[objectiveIndex].current >= this.objectives[objectiveIndex].target) {
      this.objectives[objectiveIndex].completed = true;
    }
  }
  
  return this.save();
};

// Instance method to complete quest for user
questSchema.methods.completeForUser = function(user) {
  if (this.isCompleted) {
    return Promise.resolve({ quest: this, user, alreadyCompleted: true });
  }
  
  // Mark quest as completed
  this.progress = 100;
  this.status = 'completed';
  
  // Award rewards
  user.xp += this.rewards.xp;
  user.totalXp += this.rewards.xp;
  
  // Add to user's completed quests
  if (!user.completedQuests) {
    user.completedQuests = [];
  }
  if (!user.completedQuests.includes(this._id)) {
    user.completedQuests.push(this._id);
  }
  
  // Update quest stats
  this.stats.completionCount += 1;
  
  return Promise.all([
    this.save(),
    user.save()
  ]).then(() => ({ quest: this, user, newlyCompleted: true }));
};

module.exports = mongoose.model('Quest', questSchema);