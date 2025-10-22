import React, { useState } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', avatar: '' });
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/signup', form);
      navigate('/login');
    } catch (error) {
      alert('Signup failed');
    }
  };

  return (
    <Box>
      <Typography variant="h4">Signup</Typography>
      <form onSubmit={handleSubmit}>
        <TextField name="username" label="Username" fullWidth margin="normal" onChange={handleChange} />
        <TextField name="email" label="Email" fullWidth margin="normal" onChange={handleChange} />
        <TextField name="password" label="Password" type="password" fullWidth margin="normal" onChange={handleChange} />
        <TextField name="avatar" label="Avatar URL" fullWidth margin="normal" onChange={handleChange} />
        <Button type="submit" variant="contained">Signup</Button>
      </form>
    </Box>
  );
};

export default Signup;