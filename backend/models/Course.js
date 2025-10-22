const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters'],
    minlength: [3, 'Course title must be at least 3 characters long']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Course description cannot exceed 2000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Course subject is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: {
      values: ['computer-science', 'mathematics', 'physics', 'biology', 'chemistry', 'history', 'literature', 'languages', 'engineering', 'business', 'arts', 'other'],
      message: 'Please select a valid category'
    },
    required: [true, 'Course category is required']
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
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: []
  }],
  totalLessons: {
    type: Number,
    default: 0,
    min: [0, 'Total lessons cannot be negative']
  },
  xpReward: {
    type: Number,
    default: 100,
    min: [0, 'XP reward cannot be negative'],
    max: [10000, 'XP reward cannot exceed 10,000']
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: [1, 'Estimated duration must be at least 1 minute'],
    max: [10000, 'Estimated duration cannot exceed 10,000 minutes']
  },
  prerequisites: [{
    type: String,
    trim: true,
    maxlength: [200, 'Prerequisite cannot exceed 200 characters']
  }],
  learningObjectives: [{
    type: String,
    trim: true,
    maxlength: [300, 'Learning objective cannot exceed 300 characters']
  }],
  thumbnail: {
    type: String,
    trim: true,
    maxlength: [255, 'Thumbnail URL cannot exceed 255 characters']
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: 'Status must be draft, published, or archived'
    },
    default: 'draft'
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
  enrollmentCount: {
    type: Number,
    default: 0,
    min: [0, 'Enrollment count cannot be negative']
  },
  completionRate: {
    type: Number,
    default: 0,
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Course creator is required']
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'reviewer'],
      default: 'editor'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
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

// Optimized indexes for better performance

// Text search index with weights for better relevance
courseSchema.index({
  title: 'text',
  description: 'text',
  subject: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    subject: 8,
    description: 5,
    tags: 3
  },
  background: true
});

// Compound indexes for common query patterns
courseSchema.index({ subject: 1, category: 1, status: 1 }); // Subject/category filtering
courseSchema.index({ category: 1, difficulty: 1 }); // Category/difficulty filtering
courseSchema.index({ status: 1, featured: -1, rating: -1 }); // Featured/popular courses
courseSchema.index({ status: 1, enrollmentCount: -1 }); // Popular courses
courseSchema.index({ status: 1, createdAt: -1 }); // Recent courses
courseSchema.index({ createdBy: 1, status: 1 }); // User's courses
courseSchema.index({ status: 1, rating: -1 }); // High-rated courses

// Partial indexes for published courses only (most common queries)
courseSchema.index(
  { featured: -1, enrollmentCount: -1 },
  {
    partialFilterExpression: { status: 'published' }
  }
);

courseSchema.index(
  { rating: -1, enrollmentCount: -1 },
  {
    partialFilterExpression: { status: 'published' }
  }
);

courseSchema.index(
  { subject: 1, category: 1, difficulty: 1 },
  {
    partialFilterExpression: { status: 'published' }
  }
);

// Geospatial index for future location-based features (if needed)
courseSchema.index({ location: '2dsphere' });

// Virtual for completion percentage
courseSchema.virtual('completionPercentage').get(function() {
  if (this.totalLessons === 0) return 0;
  return Math.round((this.lessons.length / this.totalLessons) * 100);
});

// Virtual for average time per lesson (in minutes)
courseSchema.virtual('avgTimePerLesson').get(function() {
  if (this.totalLessons === 0 || !this.estimatedDuration) return 0;
  return Math.round(this.estimatedDuration / this.totalLessons);
});

// Pre-save middleware to update lesson count
courseSchema.pre('save', function(next) {
  if (this.lessons && Array.isArray(this.lessons)) {
    this.totalLessons = this.lessons.length;
  }
  this.updatedAt = new Date();
  next();
});

// Static method to get popular courses
courseSchema.statics.getPopularCourses = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ enrollmentCount: -1, rating: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Static method to get featured courses
courseSchema.statics.getFeaturedCourses = function(limit = 10) {
  return this.find({ status: 'published', featured: true })
    .sort({ rating: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Static method to search courses
courseSchema.statics.searchCourses = function(query, options = {}) {
  const {
    subject,
    category,
    difficulty,
    limit = 20,
    skip = 0
  } = options;

  let searchQuery = { status: 'published' };
  
  if (query && query.trim()) {
    searchQuery.$text = { $search: query };
  }
  
  if (subject) searchQuery.subject = new RegExp(subject, 'i');
  if (category) searchQuery.category = category;
  if (difficulty) searchQuery.difficulty = difficulty;

  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, rating: -1 })
    .limit(limit)
    .skip(skip)
    .populate('createdBy', 'username avatar')
    .lean();
};

// Instance method to add lesson
courseSchema.methods.addLesson = function(lessonId) {
  if (!this.lessons.includes(lessonId)) {
    this.lessons.push(lessonId);
    this.totalLessons = this.lessons.length;
  }
  return this.save();
};

// Instance method to remove lesson
courseSchema.methods.removeLesson = function(lessonId) {
  const index = this.lessons.indexOf(lessonId);
  if (index > -1) {
    this.lessons.splice(index, 1);
    this.totalLessons = this.lessons.length;
  }
  return this.save();
};

module.exports = mongoose.model('Course', courseSchema);