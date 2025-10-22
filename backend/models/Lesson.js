const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [200, 'Lesson title cannot exceed 200 characters'],
    minlength: [3, 'Lesson title must be at least 3 characters long']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Lesson description cannot exceed 1000 characters']
  },
  content: {
    type: String,
    maxlength: [10000, 'Lesson content cannot exceed 10,000 characters']
  },
  videoUrl: {
    type: String,
    trim: true,
    maxlength: [255, 'Video URL cannot exceed 255 characters'],
    match: [/^https?:\/\/.+/, 'Video URL must be a valid URL']
  },
  videoDuration: {
    type: Number, // in seconds
    min: [0, 'Video duration cannot be negative']
  },
  transcript: {
    type: String,
    maxlength: [50000, 'Transcript cannot exceed 50,000 characters']
  },
  questions: [{
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters']
    },
    options: [{
      type: String,
      trim: true,
      maxlength: [200, 'Option cannot exceed 200 characters']
    }],
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      trim: true,
      maxlength: [200, 'Correct answer cannot exceed 200 characters']
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: [1000, 'Explanation cannot exceed 1000 characters']
    },
    difficulty: {
      type: Number,
      default: 1,
      min: [1, 'Difficulty must be at least 1'],
      max: [5, 'Difficulty cannot exceed 5']
    },
    points: {
      type: Number,
      default: 10,
      min: [1, 'Points must be at least 1'],
      max: [100, 'Points cannot exceed 100']
    },
    type: {
      type: String,
      enum: {
        values: ['multiple-choice', 'true-false', 'short-answer', 'code'],
        message: 'Question type must be multiple-choice, true-false, short-answer, or code'
      },
      default: 'multiple-choice'
    },
    hint: {
      type: String,
      trim: true,
      maxlength: [300, 'Hint cannot exceed 300 characters']
    }
  }],
  keyPoints: [{
    type: String,
    trim: true,
    maxlength: [300, 'Key point cannot exceed 300 characters']
  }],
  learningObjectives: [{
    type: String,
    trim: true,
    maxlength: [300, 'Learning objective cannot exceed 300 characters']
  }],
  xpReward: {
    type: Number,
    default: 10,
    min: [0, 'XP reward cannot be negative'],
    max: [1000, 'XP reward cannot exceed 1,000']
  },
  estimatedTime: {
    type: Number, // in minutes
    min: [1, 'Estimated time must be at least 1 minute'],
    max: [300, 'Estimated time cannot exceed 300 minutes']
  },
  difficulty: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'advanced'],
      message: 'Difficulty must be beginner, intermediate, or advanced'
    },
    default: 'beginner'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  resources: [{
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Resource title cannot exceed 200 characters']
    },
    url: {
      type: String,
      trim: true,
      maxlength: [255, 'Resource URL cannot exceed 255 characters'],
      match: [/^https?:\/\/.+/, 'Resource URL must be a valid URL']
    },
    type: {
      type: String,
      enum: {
        values: ['article', 'video', 'book', 'website', 'pdf', 'other'],
        message: 'Resource type must be article, video, book, website, pdf, or other'
      },
      default: 'other'
    }
  }],
  interactiveElements: [{
    type: {
      type: String,
      enum: {
        values: ['quiz', 'simulation', 'interactive-diagram', 'code-editor'],
        message: 'Interactive element type must be quiz, simulation, interactive-diagram, or code-editor'
      }
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Interactive element title cannot exceed 200 characters']
    },
    content: mongoose.Schema.Types.Mixed // Flexible content for different interactive types
  }],
  order: {
    type: Number,
    min: [0, 'Order cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: 'Status must be draft, published, or archived'
    },
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },
  completionCount: {
    type: Number,
    default: 0,
    min: [0, 'Completion count cannot be negative']
  },
  averageTimeSpent: {
    type: Number, // in seconds
    default: 0,
    min: [0, 'Average time spent cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Average rating cannot be negative'],
      max: [5, 'Average rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Lesson creator is required']
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date
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
lessonSchema.index({ title: 'text', content: 'text', description: 'text' }); // Text search
lessonSchema.index({ difficulty: 1 });
lessonSchema.index({ status: 1 });
lessonSchema.index({ order: 1 });
lessonSchema.index({ createdAt: -1 });
lessonSchema.index({ views: -1 });
lessonSchema.index({ rating: -1 });
lessonSchema.index({ createdBy: 1 });

// Virtual for question count
lessonSchema.virtual('questionCount').get(function() {
  return this.questions ? this.questions.length : 0;
});

// Virtual for estimated time in seconds
lessonSchema.virtual('estimatedTimeInSeconds').get(function() {
  return this.estimatedTime ? this.estimatedTime * 60 : 0;
});

// Pre-save middleware
lessonSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get popular lessons
lessonSchema.statics.getPopularLessons = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ views: -1, rating: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Static method to search lessons
lessonSchema.statics.searchLessons = function(query, options = {}) {
  const {
    difficulty,
    limit = 20,
    skip = 0
  } = options;

  let searchQuery = { status: 'published' };
  
  if (query && query.trim()) {
    searchQuery.$text = { $search: query };
  }
  
  if (difficulty) searchQuery.difficulty = difficulty;

  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, rating: -1 })
    .limit(limit)
    .skip(skip)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Instance method to add question
lessonSchema.methods.addQuestion = function(questionData) {
  this.questions.push(questionData);
  return this.save();
};

// Instance method to increment views
lessonSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Lesson', lessonSchema);