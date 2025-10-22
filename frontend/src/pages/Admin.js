import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, TextField, Grid } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const { auth } = useAuth();
  const [analytics, setAnalytics] = useState({});
  const [courseForm, setCourseForm] = useState({ title: '', description: '', subject: '', difficulty: 'beginner' });

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
      alert('Course created');
    } catch (error) {
      alert('Error creating course');
    }
  };

  if (auth.user?.role !== 'admin') return <Typography>Access denied</Typography>;

  return (
    <Box mt={5}>
      <Typography variant="h4">Admin Panel</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography>Total Users: {analytics.totalUsers}</Typography>
          <Typography>Total Courses: {analytics.totalCourses}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h5">Create Course</Typography>
          <form onSubmit={handleCourseSubmit}>
            <TextField name="title" label="Title" fullWidth margin="normal" onChange={(e) => setCourseForm({...courseForm, title: e.target.value})} />
            <TextField name="description" label="Description" fullWidth margin="normal" onChange={(e) => setCourseForm({...courseForm, description: e.target.value})} />
            <TextField name="subject" label="Subject" fullWidth margin="normal" onChange={(e) => setCourseForm({...courseForm, subject: e.target.value})} />
            <Button type="submit" variant="contained">Create</Button>
          </form>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Admin;