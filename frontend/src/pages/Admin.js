import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, TextField, Grid, Card, CardContent, Alert, MenuItem, Select, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Admin = () => {
  const { auth } = useAuth();
  const [analytics, setAnalytics] = useState({});
  const [courseForm, setCourseForm] = useState({ title: '', description: '', subject: '', category: 'computer-science', difficulty: 'beginner' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [seedMessage, setSeedMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.user?.role === 'admin') {
      adminAPI.getAnalytics()
        .then(res => setAnalytics(res?.data || {}))
        .catch(() => setAnalytics({}));
    }
  }, [auth]);

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await adminAPI.getAllCourses(); // Verify admin access
      // Use courses endpoint for creation
      const api = (await import('../utils/api')).default;
      await api.post('/courses', courseForm);
      setSuccess('Course created successfully!');
      setCourseForm({ title: '', description: '', subject: '', category: 'computer-science', difficulty: 'beginner' });
    } catch (err) {
      setError(err.message || 'Error creating course');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    setError('');
    try {
      const api = (await import('../utils/api')).default;
      await api.post('/seed');
      setSeedMessage('Sample data created successfully!');
      // Refresh analytics
      const res = await adminAPI.getAnalytics();
      setAnalytics(res?.data || {});
    } catch (err) {
      setError(err.message || 'Error seeding data');
    } finally {
      setLoading(false);
    }
  };

  if (auth.user?.role !== 'admin') return <Alert severity="error">Access Denied - Admin privileges required</Alert>;

  return (
    <Box mt={5}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Typography variant="h2" gutterBottom sx={{ color: '#3f51b5', fontWeight: 'bold' }}>
          🛠️ Admin Panel
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" gutterBottom>📊 Analytics</Typography>
                  <Typography variant="h6">Total Users: {analytics.totalUsers ?? '—'}</Typography>
                  <Typography variant="h6">Total Courses: {analytics.totalCourses ?? '—'}</Typography>
                  <Typography variant="h6">Total Lessons: {analytics.totalLessons ?? '—'}</Typography>
                  <Typography variant="h6">Active Users (7d): {analytics.activeUsers ?? '—'}</Typography>
                  <Button
                    variant="contained"
                    onClick={handleSeed}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                    sx={{
                      mt: 2,
                      bgcolor: '#ff9800',
                      '&:hover': { bgcolor: '#e65100' }
                    }}
                  >
                    🌱 Seed Sample Data
                  </Button>
                  {seedMessage && <Alert severity="success" sx={{ mt: 1 }}>{seedMessage}</Alert>}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" gutterBottom>➕ Create Course</Typography>
                  <form onSubmit={handleCourseSubmit}>
                    <TextField
                      name="title"
                      label="Title"
                      fullWidth
                      required
                      margin="normal"
                      variant="outlined"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                    />
                    <TextField
                      name="description"
                      label="Description"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      multiline
                      rows={2}
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    />
                    <TextField
                      name="subject"
                      label="Subject"
                      fullWidth
                      required
                      margin="normal"
                      variant="outlined"
                      value={courseForm.subject}
                      onChange={(e) => setCourseForm({...courseForm, subject: e.target.value})}
                    />
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={courseForm.category}
                        label="Category"
                        onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                      >
                        {['computer-science', 'mathematics', 'physics', 'biology', 'chemistry', 'history', 'literature', 'languages', 'engineering', 'business', 'arts', 'other'].map(cat => (
                          <MenuItem key={cat} value={cat}>{cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Difficulty</InputLabel>
                      <Select
                        value={courseForm.difficulty}
                        label="Difficulty"
                        onChange={(e) => setCourseForm({...courseForm, difficulty: e.target.value})}
                      >
                        <MenuItem value="beginner">Beginner</MenuItem>
                        <MenuItem value="intermediate">Intermediate</MenuItem>
                        <MenuItem value="advanced">Advanced</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={16} /> : null}
                      sx={{ mt: 2, bgcolor: '#3f51b5', '&:hover': { bgcolor: '#303f9f' } }}
                    >
                      Create Course
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
};

export default Admin;