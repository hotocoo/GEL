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
  Tooltip
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  EmojiEvents,
  Whatshot,
  School,
  TrendingUp,
  PlayArrow,
  Add
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { auth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const xpToNext = (auth.user?.level || 1) * 100;
  const progress = (auth.user?.xp || 0) / xpToNext * 100;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/v1/courses');
        setCourses(response.data);
      } catch (error) {
        console.error('Error fetching courses:', error);
        // Set mock data for demo
        setCourses([
          { _id: '1', title: 'Computer Science Basics', subject: 'Computer Science' },
          { _id: '2', title: 'Advanced Mathematics', subject: 'Mathematics' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const StatCard = ({ title, value, icon, gradient, subtitle, action, ...props }) => (
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
              <Tooltip title="Quick Actions">
                <Fab
                  color="primary"
                  aria-label="add"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    }
                  }}
                >
                  <Add />
                </Fab>
              </Tooltip>
            )}
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid item xs={12} sm={6} lg={4}>
              <StatCard
                title={`Level ${auth.user?.level || 1}`}
                value={`${Math.round(progress)}%`}
                icon={<EmojiEvents />}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                subtitle={`XP: ${auth.user?.xp || 0} / ${xpToNext}`}
                action="View Progress"
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <StatCard
                title="Current Streak"
                value={`${auth.user?.streak || 0}`}
                icon={<Whatshot />}
                gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                subtitle={`${auth.user?.badges?.length || 0} badges earned`}
                action="View Achievements"
              />
            </Grid>

            <Grid item xs={12} lg={4}>
              <StatCard
                title="Subjects"
                value={courses.length}
                icon={<School />}
                gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                subtitle="Available to explore"
                action="Browse Courses"
              />
            </Grid>
          </Grid>

          {/* Course Preview Section */}
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
                  <Grid item xs={12} sm={6} md={4} key={course._id}>
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

          {/* Mobile Quick Actions */}
          {isMobile && (
            <Box position="fixed" bottom={16} right={16}>
              <Fab
                color="primary"
                aria-label="add"
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