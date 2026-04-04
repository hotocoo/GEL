import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  Container,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Search,
  School,
  Star,
  AccessTime,
  People,
  EmojiEvents
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { coursesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const difficultyColors = {
  beginner: '#4caf50',
  intermediate: '#ff9800',
  advanced: '#f44336'
};

const CourseCard = ({ course, onEnroll, enrolledIds }) => {
  const isEnrolled = enrolledIds.has(course.id || course._id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" alignItems="flex-start" mb={2}>
            <Avatar sx={{ bgcolor: '#667eea', mr: 2, flexShrink: 0 }}>
              <School />
            </Avatar>
            <Box flexGrow={1} minWidth={0}>
              <Typography variant="h6" noWrap title={course.title}>
                {course.title}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                <Chip
                  label={course.subject}
                  size="small"
                  sx={{ bgcolor: 'rgba(102,126,234,0.1)', color: '#667eea' }}
                />
                {course.difficulty && (
                  <Chip
                    label={course.difficulty}
                    size="small"
                    sx={{
                      bgcolor: `${difficultyColors[course.difficulty]}20`,
                      color: difficultyColors[course.difficulty],
                      textTransform: 'capitalize'
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2} sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {course.description || 'No description available.'}
          </Typography>

          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            {course.xpReward > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <EmojiEvents sx={{ fontSize: 16, color: '#ff9800' }} />
                <Typography variant="caption">{course.xpReward} XP</Typography>
              </Box>
            )}
            {course.estimatedDuration > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <AccessTime sx={{ fontSize: 16, color: '#667eea' }} />
                <Typography variant="caption">{Math.round(course.estimatedDuration / 60)}h</Typography>
              </Box>
            )}
            {course.enrollmentCount > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <People sx={{ fontSize: 16, color: '#4caf50' }} />
                <Typography variant="caption">{course.enrollmentCount} enrolled</Typography>
              </Box>
            )}
            {course.rating?.average > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Star sx={{ fontSize: 16, color: '#ffc107' }} />
                <Typography variant="caption">{course.rating.average.toFixed(1)}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>

        <Box px={2} pb={2}>
          <Button
            fullWidth
            variant={isEnrolled ? 'outlined' : 'contained'}
            disabled={isEnrolled}
            onClick={() => onEnroll(course.id || course._id)}
            sx={{
              background: isEnrolled ? 'none' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: isEnrolled ? 'none' : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
              },
              textTransform: 'none'
            }}
          >
            {isEnrolled ? '✓ Enrolled' : 'Enroll Now'}
          </Button>
        </Box>
      </Card>
    </motion.div>
  );
};

const Courses = () => {
  const { auth } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [enrollError, setEnrollError] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 9,
        status: 'published',
        sortBy,
        sortOrder: 'desc'
      };
      if (debouncedSearch) params.q = debouncedSearch;
      if (difficulty) params.difficulty = difficulty;
      if (category) params.category = category;

      const res = await coursesAPI.getAll(params);
      setCourses(res?.data?.courses || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
    } catch (err) {
      setError('Failed to load courses. Please try again.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, difficulty, category, sortBy]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, difficulty, category, sortBy]);

  const handleEnroll = async (courseId) => {
    if (!auth.token) {
      setEnrollError('Please log in to enroll in courses.');
      return;
    }
    try {
      await coursesAPI.enroll(courseId);
      setEnrolledIds(prev => new Set([...prev, courseId]));
    } catch (err) {
      setEnrollError(err.message || 'Failed to enroll. Please try again.');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box mt={isMobile ? 2 : 5} mb={4}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant={isMobile ? 'h4' : 'h3'}
            gutterBottom
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            📚 Explore Courses
          </Typography>
          <Typography variant="h6" color="text.secondary" mb={4}>
            Discover subjects, earn XP, and level up your knowledge.
          </Typography>

          {/* Filters */}
          <Box
            display="flex"
            gap={2}
            flexWrap="wrap"
            mb={4}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <TextField
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                )
              }}
            />
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel>Difficulty</InputLabel>
              <Select value={difficulty} label="Difficulty" onChange={(e) => setDifficulty(e.target.value)}>
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                <MenuItem value="">All Categories</MenuItem>
                {['computer-science', 'mathematics', 'physics', 'biology', 'chemistry', 'history', 'literature', 'languages', 'engineering', 'business', 'arts'].map(cat => (
                  <MenuItem key={cat} value={cat}>{cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="createdAt">Newest</MenuItem>
                <MenuItem value="enrollmentCount">Most Popular</MenuItem>
                <MenuItem value="rating.average">Top Rated</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {enrollError && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setEnrollError('')}>
              {enrollError}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" onClick={fetchCourses}>Retry</Button>
            }>
              {error}
            </Alert>
          )}

          {/* Course Grid */}
          {loading ? (
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2} gap={2}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box flexGrow={1}>
                          <Skeleton variant="text" width="80%" />
                          <Skeleton variant="text" width="50%" />
                        </Box>
                      </Box>
                      <Skeleton variant="text" />
                      <Skeleton variant="text" />
                      <Skeleton variant="text" width="70%" />
                      <Skeleton variant="rectangular" height={36} sx={{ mt: 2, borderRadius: 1 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : courses.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No courses found
              </Typography>
              <Typography color="text.secondary">
                Try adjusting your filters or search query.
              </Typography>
              {(searchQuery || difficulty || category) && (
                <Button
                  sx={{ mt: 2 }}
                  onClick={() => { setSearchQuery(''); setDifficulty(''); setCategory(''); }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          ) : (
            <AnimatePresence mode="wait">
              <Grid container spacing={3}>
                {courses.map((course) => (
                  <Grid item xs={12} sm={6} md={4} key={course.id || course._id}>
                    <CourseCard
                      course={course}
                      onEnroll={handleEnroll}
                      enrolledIds={enrolledIds}
                    />
                  </Grid>
                ))}
              </Grid>
            </AnimatePresence>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => { setPage(val); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
          )}
        </motion.div>
      </Box>
    </Container>
  );
};

export default Courses;
