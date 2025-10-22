import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Paper, Alert } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', avatar: '', role: 'student' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/signup', form);
      navigate('/login');
    } catch (error) {
      if (error.response && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Signup failed: Please check your details');
      }
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper elevation={3} sx={{ p: 4, width: 400 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Typography variant="h4" textAlign="center" gutterBottom sx={{ color: '#3f51b5' }}>
            📝 Signup
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField name="username" label="Username" fullWidth margin="normal" variant="outlined" value={form.username} onChange={handleChange} />
            <TextField name="email" label="Email" fullWidth margin="normal" variant="outlined" value={form.email} onChange={handleChange} />
            <TextField name="password" label="Password" type="password" fullWidth margin="normal" variant="outlined" value={form.password} onChange={handleChange} />
            <TextField name="avatar" label="Avatar URL (optional)" fullWidth margin="normal" variant="outlined" value={form.avatar} onChange={handleChange} />
            <TextField name="role" label="Role" select fullWidth margin="normal" variant="outlined" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </TextField>
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, bgcolor: '#3f51b5' }}>Signup</Button>
          </form>
        </motion.div>
      </Paper>
    </Box>
  );
};

export default Signup;