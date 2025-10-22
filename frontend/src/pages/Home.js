import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  useMediaQuery,
  useTheme,
  Fab
} from '@mui/material';
import {
  School,
  EmojiEvents,
  People,
  TrendingUp,
  Star,
  PlayArrow,
  KeyboardArrowDown,
  Timeline,
  Psychology
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Scroll progress tracking (can be used for future scroll-based animations)

  const [displayStats, setDisplayStats] = useState(false);

  const stats = [
    { number: '10,000+', label: 'Active Learners', icon: <People /> },
    { number: '500+', label: 'Courses Available', icon: <School /> },
    { number: '50+', label: 'Subjects Covered', icon: <Psychology /> },
    { number: '95%', label: 'Completion Rate', icon: <TrendingUp /> }
  ];

  const features = [
    {
      icon: <EmojiEvents sx={{ fontSize: 40 }} />,
      title: 'Achievement System',
      description: 'Unlock badges, earn XP, and level up as you progress through your learning journey.',
      color: '#ff9800'
    },
    {
      icon: <School sx={{ fontSize: 40 }} />,
      title: 'Interactive Learning',
      description: 'Engage with rich multimedia content, interactive quizzes, and adaptive learning paths.',
      color: '#2196f3'
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: 'Social Features',
      description: 'Compete with friends, join study groups, and climb the leaderboards together.',
      color: '#4caf50'
    },
    {
      icon: <Timeline sx={{ fontSize: 40 }} />,
      title: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed analytics and personalized insights.',
      color: '#9c27b0'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Computer Science Student',
      content: 'This platform made learning programming so much fun! The gamification elements kept me motivated.',
      avatar: 'SJ',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Mathematics Major',
      content: 'The interactive lessons and immediate feedback helped me understand complex concepts better.',
      avatar: 'MC',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Biology Student',
      content: 'Competing with friends on the leaderboard pushed me to study more consistently.',
      avatar: 'ER',
      rating: 5
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayStats(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const StatCard = ({ stat, index, delay = 0 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!displayStats) return;

      const timer = setTimeout(() => {
        const target = parseInt(stat.number.replace(/[^0-9]/g, ''));
        const increment = target / 50;
        let current = 0;

        const counter = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(counter);
          }
          setCount(Math.floor(current));
        }, 30);

        return () => clearInterval(counter);
      }, delay);

      return () => clearTimeout(timer);
    }, [stat.number, delay]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 + (index * 0.1) }}
      >
        <Card
          sx={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }
          }}
        >
          <CardContent sx={{ textAlign: 'center', p: 3 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 60,
                height: 60,
                mx: 'auto',
                mb: 2
              }}
            >
              {stat.icon}
            </Avatar>
            <Typography variant="h3" fontWeight="bold" color="primary.main" gutterBottom>
              {stat.number.includes('+') ? `${count}+` : count}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {stat.label}
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          overflow: 'hidden'
        }}
      >
        {/* Animated Background Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            overflow: 'hidden'
          }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 8 + i,
                repeat: Infinity,
                delay: i * 2
              }}
              sx={{
                top: `${20 + i * 15}%`,
                left: `${10 + i * 15}%`
              }}
            />
          ))}
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant={isSmallMobile ? "h3" : "h2"}
                  gutterBottom
                  sx={{
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    mb: 3
                  }}
                >
                  🎮 Master University Subjects with
                  <span style={{ color: '#ff9800' }}> Epic RPG Adventure</span>
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    mb: 4,
                    lineHeight: 1.6,
                    fontSize: isSmallMobile ? '1.1rem' : '1.25rem'
                  }}
                >
                  Level up your knowledge, earn XP, unlock achievements, and compete with friends in the most engaging learning platform ever created!
                </Typography>

                <Box display="flex" gap={2} flexWrap="wrap">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="contained"
                      size="large"
                      component={Link}
                      to="/signup"
                      startIcon={<PlayArrow />}
                      sx={{
                        bgcolor: '#ff9800',
                        fontSize: '1.1rem',
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 20px rgba(255,152,0,0.4)',
                        '&:hover': {
                          bgcolor: '#f57c00',
                          boxShadow: '0 6px 25px rgba(255,152,0,0.6)'
                        }
                      }}
                    >
                      🚀 Start Your Journey
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outlined"
                      size="large"
                      component={Link}
                      to="/login"
                      sx={{
                        borderColor: 'rgba(255,255,255,0.8)',
                        color: 'white',
                        fontSize: '1.1rem',
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          borderColor: '#ff9800',
                          color: '#ff9800',
                          bgcolor: 'rgba(255,152,0,0.1)'
                        }
                      }}
                    >
                      🔑 Continue Learning
                    </Button>
                  </motion.div>
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} lg={6}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      left: -20,
                      right: -20,
                      bottom: -20,
                      background: 'linear-gradient(45deg, #ff9800, #2196f3, #4caf50)',
                      borderRadius: 4,
                      opacity: 0.1,
                      zIndex: -1
                    }
                  }}
                >
                  <Card
                    sx={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box
                        sx={{
                          height: 300,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatDelay: 2
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 100,
                              height: 100,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              fontSize: '3rem'
                            }}
                          >
                            🎮
                          </Avatar>
                        </motion.div>

                        <Box position="absolute" bottom={20} left={20} right={20}>
                          <Typography variant="h6" color="white" textAlign="center" gutterBottom>
                            Interactive Learning Experience
                          </Typography>
                          <Box display="flex" justifyContent="center" gap={1}>
                            {[...Array(3)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{
                                  y: [0, -10, 0]
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: i * 0.2
                                }}
                              >
                                <Chip
                                  label={`Feature ${i + 1}`}
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    color: 'white'
                                  }}
                                />
                              </motion.div>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white'
          }}
        >
          <KeyboardArrowDown sx={{ fontSize: 40 }} />
        </motion.div>
      </Box>

      {/* Stats Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" textAlign="center" gutterBottom fontWeight="bold">
            Trusted by Learners Worldwide
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" mb={6}>
            Join our growing community of successful learners
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCard stat={stat} index={index} delay={index * 200} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" textAlign="center" gutterBottom fontWeight="bold">
              Why Choose Our Platform?
            </Typography>
            <Typography variant="h6" textAlign="center" color="text.secondary" mb={6}>
              Experience the future of education with our innovative features
            </Typography>
          </motion.div>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                        transform: 'translateY(-5px)'
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                      <Avatar
                        sx={{
                          bgcolor: feature.color,
                          width: 80,
                          height: 80,
                          mx: 'auto',
                          mb: 3
                        }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h5" gutterBottom fontWeight="bold">
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" textAlign="center" gutterBottom fontWeight="bold">
            What Our Students Say
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" mb={6}>
            Real experiences from real learners
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #667eea, #764ba2)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box display="flex" alignItems="center" mb={3}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {testimonial.avatar}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {testimonial.role}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body1" mb={2} sx={{ fontStyle: 'italic' }}>
                      "{testimonial.content}"
                    </Typography>

                    <Box display="flex" alignItems="center">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} sx={{ color: '#ff9800', fontSize: 20 }} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Box textAlign="center">
              <Typography variant="h3" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                Ready to Start Your Learning Adventure?
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 4 }}>
                Join thousands of learners and transform your education experience
              </Typography>

              <Box display="flex" gap={3} justifyContent="center" flexWrap="wrap">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to="/signup"
                    startIcon={<PlayArrow />}
                    sx={{
                      bgcolor: '#ff9800',
                      fontSize: '1.2rem',
                      px: 6,
                      py: 2,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      boxShadow: '0 6px 20px rgba(255,152,0,0.4)',
                      '&:hover': {
                        bgcolor: '#f57c00',
                        boxShadow: '0 8px 25px rgba(255,152,0,0.6)'
                      }
                    }}
                  >
                    🚀 Get Started Free
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    to="/login"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.8)',
                      color: 'white',
                      fontSize: '1.2rem',
                      px: 6,
                      py: 2,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      '&:hover': {
                        borderColor: '#ff9800',
                        color: '#ff9800',
                        bgcolor: 'rgba(255,152,0,0.1)'
                      }
                    }}
                  >
                    🔑 Login to Continue
                  </Button>
                </motion.div>
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="get started"
          component={Link}
          to="/signup"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            }
          }}
        >
          <PlayArrow />
        </Fab>
      )}
    </Box>
  );
};

export default Home;