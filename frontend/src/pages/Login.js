import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Alert,
  Container,
  Avatar,
  IconButton,
  InputAdornment,
  Link,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Divider,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Login as LoginIcon,
  PersonAdd,
  School,
  EmojiEvents,
  Close
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const from = location.state?.from?.pathname || '/dashboard';

  // Cooldown timer effect
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check cooldown
    if (cooldown > 0) {
      setErrors({ general: `Please wait ${cooldown} seconds before trying again` });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: form.email.toLowerCase().trim(),
        password: form.password,
        rememberMe: form.rememberMe
      });

      // Store tokens
      localStorage.setItem('token', res.data.data.token);
      if (form.rememberMe) {
        localStorage.setItem('refreshToken', res.data.data.refreshToken);
      }

      setAuth({
        token: res.data.data.token,
        user: res.data.data.user
      });

      // Success animation before navigation
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials and try again.';

      setErrors({ general: errorMessage });
      setLoginAttempts(prev => prev + 1);

      // Set cooldown after multiple failed attempts
      if (loginAttempts >= 2) {
        setCooldown(30); // 30 second cooldown
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <School />, text: 'Interactive Learning' },
    { icon: <EmojiEvents />, text: 'Achievement System' },
    { icon: <Lock />, text: 'Secure Platform' }
  ];

  return (
    <Container maxWidth="md">
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        py={4}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%' }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box display="flex" minHeight={isMobile ? 'auto' : 600}>
              {/* Left Panel - Features */}
              {!isMobile && (
                <Box
                  sx={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box position="absolute" top={0} left={0} right={0} bottom={0} sx={{ opacity: 0.1 }}>
                    <div style={{
                      position: 'absolute',
                      top: '10%',
                      left: '10%',
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      animation: 'float 6s ease-in-out infinite'
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '60%',
                      right: '15%',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      animation: 'float 8s ease-in-out infinite reverse'
                    }} />
                  </Box>

                  <Box>
                    <Typography variant="h3" gutterBottom fontWeight="bold">
                      Welcome Back!
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
                      Continue your learning adventure
                    </Typography>

                    <Box>
                      {features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                        >
                          <Box display="flex" alignItems="center" mb={2}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                              {feature.icon}
                            </Avatar>
                            <Typography variant="body1">
                              {feature.text}
                            </Typography>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Right Panel - Login Form */}
              <Box
                sx={{
                  flex: 1,
                  p: isMobile ? 3 : 4,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Box textAlign="center" mb={4}>
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      <LoginIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                  </motion.div>

                  <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
                    Sign In
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Access your gamified learning dashboard
                  </Typography>
                </Box>

                <AnimatePresence>
                  {errors.general && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Alert
                        severity="error"
                        sx={{ mb: 3 }}
                        action={
                          <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => setErrors({})}
                          >
                            <Close fontSize="inherit" />
                          </IconButton>
                        }
                      >
                        {errors.general}
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    margin="normal"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color="action" />
                        </InputAdornment>
                      ),
                    }}
                    disabled={loading}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    margin="normal"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={loading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    disabled={loading}
                  />

                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1} mb={3}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="rememberMe"
                          checked={form.rememberMe}
                          onChange={handleChange}
                          disabled={loading}
                          color="primary"
                        />
                      }
                      label="Remember me"
                    />

                    <Link
                      href="#"
                      variant="body2"
                      color="primary"
                      sx={{ textDecoration: 'none' }}
                    >
                      Forgot password?
                    </Link>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || cooldown > 0}
                    startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      },
                      '&:disabled': {
                        background: 'rgba(102, 126, 234, 0.5)',
                      }
                    }}
                  >
                    {loading ? 'Signing In...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Sign In'}
                  </Button>
                </form>

                <Divider sx={{ my: 3 }}>
                  <Chip label="OR" size="small" />
                </Divider>

                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    New to our platform?
                  </Typography>

                  <Button
                    fullWidth
                    variant="outlined"
                    component={motion.button}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    startIcon={<PersonAdd />}
                    onClick={() => navigate('/signup')}
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Create New Account
                  </Button>
                </Box>

                {/* Demo Credentials Info */}
                <Box mt={3} p={2} bgcolor="rgba(102, 126, 234, 0.05)" borderRadius={2}>
                  <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                    <strong>Demo:</strong> Use any email/password to test the platform
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default Login;