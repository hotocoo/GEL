import React, { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  AccountCircle,
  School,
  EmojiEvents,
  Close,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Signup = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: '',
    role: 'student'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupStep, setSignupStep] = useState(1);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Password strength checker
  const getPasswordStrength = (password) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    Object.values(checks).forEach(check => {
      if (check) strength++;
    });

    return { strength, checks };
  };

  const passwordData = getPasswordStrength(form.password);

  const validateForm = () => {
    const newErrors = {};

    if (!form.username) {
      newErrors.username = 'Username is required';
    } else if (form.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordData.strength < 3) {
      newErrors.password = 'Password is too weak';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (form.avatar && !/^https?:\/\/.+/.test(form.avatar)) {
      newErrors.avatar = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
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

    setLoading(true);
    setErrors({});

    try {
      const signupData = {
        username: form.username.toLowerCase(),
        email: form.email.toLowerCase(),
        password: form.password,
        avatar: form.avatar || undefined,
        role: form.role
      };

      await axios.post('http://localhost:5000/api/v1/auth/signup', signupData);

      // Success animation
      setSignupStep(2);
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Account created successfully! Please log in.',
            email: form.email
          }
        });
      }, 2000);

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Signup failed. Please try again.';

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (strength) => {
    if (strength <= 1) return 'error';
    if (strength <= 3) return 'warning';
    return 'success';
  };

  const getStrengthText = (strength) => {
    if (strength <= 1) return 'Weak';
    if (strength <= 3) return 'Medium';
    return 'Strong';
  };

  const features = [
    { icon: <Person />, text: 'Personal Profile' },
    { icon: <EmojiEvents />, text: 'Achievement System' },
    { icon: <School />, text: 'Interactive Learning' }
  ];

  if (signupStep === 2) {
    return (
      <Container maxWidth="sm">
        <Box
          minHeight="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 4
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360, 360]
                }}
                transition={{ duration: 1 }}
              >
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              </motion.div>

              <Typography variant="h4" gutterBottom color="success.main" fontWeight="bold">
                Welcome Aboard! 🎉
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={2}>
                Your account has been created successfully!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting to login page...
              </Typography>
            </Paper>
          </motion.div>
        </Box>
      </Container>
    );
  }

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
                      Join Our Community!
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
                      Start your learning adventure today
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

              {/* Right Panel - Signup Form */}
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
                      rotate: [0, -5, 5, 0],
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
                      <Person sx={{ fontSize: 40 }} />
                    </Avatar>
                  </motion.div>

                  <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
                    Create Account
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Join thousands of learners worldwide
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
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    error={!!errors.username}
                    helperText={errors.username}
                    margin="normal"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle color="action" />
                        </InputAdornment>
                      ),
                    }}
                    disabled={loading}
                    placeholder="Choose a unique username"
                  />

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
                    placeholder="your.email@example.com"
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
                    placeholder="Create a strong password"
                  />

                  {/* Password Strength Indicator */}
                  {form.password && (
                    <Box mt={1} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" color="text.secondary">
                          Password Strength:
                        </Typography>
                        <Chip
                          label={getStrengthText(passwordData.strength)}
                          size="small"
                          color={getStrengthColor(passwordData.strength)}
                          icon={
                            passwordData.strength <= 1 ? <ErrorIcon /> :
                            passwordData.strength <= 3 ? <Warning /> :
                            <CheckCircle />
                          }
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(passwordData.strength / 5) * 100}
                        color={getStrengthColor(passwordData.strength)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
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
                            aria-label="toggle confirm password visibility"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            disabled={loading}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    disabled={loading}
                    placeholder="Confirm your password"
                  />

                  <FormControl fullWidth margin="normal" variant="outlined">
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      label="Account Type"
                      disabled={loading}
                    >
                      <MenuItem value="student">
                        <Box display="flex" alignItems="center">
                          <School sx={{ mr: 1 }} />
                          Student - Start Learning
                        </Box>
                      </MenuItem>
                      <MenuItem value="admin">
                        <Box display="flex" alignItems="center">
                          <AccountCircle sx={{ mr: 1 }} />
                          Admin - Manage Platform
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Avatar URL (Optional)"
                    name="avatar"
                    value={form.avatar}
                    onChange={handleChange}
                    error={!!errors.avatar}
                    helperText={errors.avatar || "Leave empty for default avatar"}
                    margin="normal"
                    variant="outlined"
                    disabled={loading}
                    placeholder="https://example.com/avatar.jpg"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Person />}
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
                      },
                      mt: 3
                    }}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>

                <Divider sx={{ my: 3 }}>
                  <Chip label="OR" size="small" />
                </Divider>

                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Already have an account?
                  </Typography>

                  <Button
                    fullWidth
                    variant="outlined"
                    component={motion.button}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login')}
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Sign In Instead
                  </Button>
                </Box>

                {/* Terms and Privacy */}
                <Box mt={3} textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    By creating an account, you agree to our{' '}
                    <Link href="#" color="primary" sx={{ textDecoration: 'none' }}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" color="primary" sx={{ textDecoration: 'none' }}>
                      Privacy Policy
                    </Link>
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

export default Signup;