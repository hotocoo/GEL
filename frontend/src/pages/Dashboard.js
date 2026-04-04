import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  useMediaQuery,
  useTheme,
  Container,
  Fab,
  Tooltip,
  LinearProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  EmojiEvents,
  Whatshot,
  School,
  TrendingUp,
  PlayArrow,
  Add,
  Leaderboard
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { coursesAPI, gamificationAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { auth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const userLevel = stats?.level || auth.user?.level || 1;
  const userXp = stats?.xp || auth.user?.xp || 0;
  const xpToNext = userLevel * 100;
  const progress = Math.min(100, Math.round((userXp / xpToNext) * 100));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesRes, statsRes] = await Promise.allSettled([
          coursesAPI.getAll({ limit: 6, status: 'published' }),
          gamificationAPI.getUserStats()
        ]);

        if (coursesRes.status === 'fulfilled') {
          setCourses(coursesRes.value?.data?.courses || []);
        } else {
          // Fallback mock data
          setCourses([
            { _id: '1', title: 'Computer Science Basics', subject: 'Computer Science', description: 'Learn the fundamentals of CS.' },
            { _id: '2', title: 'Advanced Mathematics', subject: 'Mathematics', description: 'Explore advanced mathematical concepts.' }
          ]);
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value?.data || null);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ title, value, icon, gradient, subtitle, action, onAction, ...props }) => (
    <motion.div
      whileHover={{ scale: isMobile ? 1.02 : 1.05 }}
      whileTap={{ scale: 0.98 }}
      style={{ height: '100%' }}
    >
      <Card
        {...props}
        sx={{
          height: '100%',
          background: gradient,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover::before': {
            opacity: 1,
          }
        }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant={isSmallMobile ? "h5" : "h4"} component="div" gutterBottom>
                {icon} {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {!isMobile && (
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                {icon}
              </Avatar>
            )}
          </Box>
          
          <Typography variant="h3" component="div" gutterBottom fontWeight="bold">
            {value}
          </Typography>
          
          {action && (
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={onAction}
              sx={{
                mt: 'auto',
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.3)',
                }
              }}
            >
              {action}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }} />
            <Typography>Loading your dashboard...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mt={isMobile ? 2 : 5}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
            <Box>
              <Typography
                variant={isSmallMobile ? "h4" : "h3"}
                gutterBottom
                sx={{
                  color: '#3f51b5',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                🌟 Welcome back, {auth.user?.username}!
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Ready to continue your learning journey?
              </Typography>
            </Box>
            
            {!isMobile && (
              <Tooltip title="View Leaderboard">
                <Fab
                  color="primary"
                  aria-label="leaderboard"
                  onClick={() => navigate('/leaderboard')}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    }
                  }}
                >
                  <Leaderboard />
                </Fab>
              </Tooltip>
            )}
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid item xs={12} sm={6} lg={4}>
              <StatCard
                title={`Level ${userLevel}`}
                value={`${progress}%`}
                icon={<EmojiEvents />}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                subtitle={`XP: ${userXp} / ${xpToNext}`}
                action="View Progress"
                onAction={() => navigate('/courses')}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <StatCard
                title="Current Streak"
                value={`${stats?.streak ?? auth.user?.streak ?? 0} 🔥`}
                icon={<Whatshot />}
                gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                subtitle={`Longest: ${stats?.longestStreak ?? auth.user?.longestStreak ?? 0} days`}
                action="View Achievements"
                onAction={() => navigate('/leaderboard')}
              />
            </Grid>

            <Grid item xs={12} lg={4}>
              <StatCard
                title="Courses"
                value={courses.length}
                icon={<School />}
                gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                subtitle="Available to explore"
                action="Browse Courses"
                onAction={() => navigate('/courses')}
              />
            </Grid>
          </Grid>

          {/* XP Progress Bar */}
          <Box mt={3} mb={1}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Level {userLevel} Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userXp} / {xpToNext} XP
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(102,126,234,0.15)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            />
          </Box>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box mt={4}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                  📚 Continue Learning
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<TrendingUp />}
                  onClick={() => navigate('/courses')}
                  sx={{
                    borderRadius: '20px',
                    textTransform: 'none',
                    borderColor: '#667eea',
                    color: '#667eea',
                    '&:hover': {
                      borderColor: '#764ba2',
                      backgroundColor: 'rgba(102, 126, 234, 0.04)'
                    }
                  }}
                >
                  View All
                </Button>
              </Box>

              <Grid container spacing={2}>
                {courses.slice(0, isMobile ? 2 : 3).map(course => (
                  <Grid item xs={12} sm={6} md={4} key={course._id || course.id}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        sx={{
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => navigate('/courses')}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            <Avatar sx={{ bgcolor: '#667eea', mr: 2 }}>
                              <School />
                            </Avatar>
                            <Box flexGrow={1}>
                              <Typography variant="h6" noWrap>
                                {course.title}
                              </Typography>
                              <Chip
                                label={course.subject}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                                  color: '#667eea'
                                }}
                              />
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary" mb={2}>
                            {course.description || 'Start your learning journey in this subject'}
                          </Typography>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={(e) => { e.stopPropagation(); navigate('/courses'); }}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                              }
                            }}
                          >
                            Continue Learning
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </motion.div>

          {/* Leaderboard Quick Access */}
          <Box mt={4} mb={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Leaderboard />}
              onClick={() => navigate('/leaderboard')}
              sx={{
                py: 1.5,
                borderRadius: 3,
                borderColor: '#667eea',
                color: '#667eea',
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': {
                  borderColor: '#764ba2',
                  backgroundColor: 'rgba(102, 126, 234, 0.04)'
                }
              }}
            >
              🏆 View Leaderboard
            </Button>
          </Box>

          {/* Mobile Quick Actions */}
          {isMobile && (
            <Box position="fixed" bottom={16} right={16}>
              <Fab
                color="primary"
                aria-label="browse courses"
                onClick={() => navigate('/courses')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }}
              >
                <Add />
              </Fab>
            </Box>
          )}
        </motion.div>
      </Box>
    </Container>
  );
};

export default Dashboard;