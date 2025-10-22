import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, TextField, Grid, Card, CardContent, Alert } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Admin = () => {
  const { auth } = useAuth();
  const [analytics, setAnalytics] = useState({});
  const [courseForm, setCourseForm] = useState({ title: '', description: '', subject: '', difficulty: 'beginner' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [seedMessage, setSeedMessage] = useState('');

  useEffect(() => {
    if (auth.user?.role === 'admin') {
      axios.get('http://localhost:5000/api/admin/analytics')
        .then(res => setAnalytics(res.data));
    }
  }, [auth]);

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/courses', courseForm);
      setSuccess('Course created successfully!');
      setCourseForm({ title: '', description: '', subject: '', difficulty: 'beginner' });
    } catch (error) {
      setError('Error creating course');
    }
  };

  const handleSeed = async () => {
    try {
      await axios.post('http://localhost:5000/api/seed');
      setSeedMessage('Sample data created!');
    } catch (error) {
      setError('Error seeding data');
    }
  };

  if (auth.user?.role !== 'admin') return <Alert severity="error">Access Denied</Alert>;

  return (
    <Box mt={5}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Typography variant="h2" gutterBottom sx={{ color: '#3f51b5', fontWeight: 'bold' }}>
          🛠️ Admin Panel
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Card sx={{ bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4">📊 Analytics</Typography>
                  <Typography variant="h6">Total Users: {analytics.totalUsers}</Typography>
                  <Typography variant="h6">Total Courses: {analytics.totalCourses}</Typography>
                  <Button
                    variant="contained"
                    onClick={handleSeed}
                    sx={{
                      mt: 2,
                      bgcolor: '#ff9800',
                      boxShadow: '0 4px 15px rgba(255,152,0,0.4)',
                    }}
                  >
                    🌱 Seed Sample Data
                  </Button>
                  {seedMessage && <Typography sx={{ mt: 1, color: '#4caf50', fontWeight: 'bold' }}>{seedMessage}</Typography>}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Card sx={{ bgcolor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4">➕ Create Course</Typography>
                  <form onSubmit={handleCourseSubmit}>
                    <TextField
                      name="title"
                      label="Title"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                      sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
                    />
                    <TextField
                      name="description"
                      label="Description"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                      sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
                    />
                    <TextField
                      name="subject"
                      label="Subject"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      value={courseForm.subject}
                      onChange={(e) => setCourseForm({...courseForm, subject: e.target.value})}
                      sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      sx={{
                        mt: 2,
                        bgcolor: '#ff9800',
                        boxShadow: '0 4px 15px rgba(255,152,0,0.4)',
                      }}
                    >
                      Create
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