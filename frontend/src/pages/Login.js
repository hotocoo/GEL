import React, { useState } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      setAuth({ token: res.data.token, user: res.data.user });
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <Box>
      <Typography variant="h4">Login</Typography>
      <form onSubmit={handleSubmit}>
        <TextField name="email" label="Email" fullWidth margin="normal" onChange={handleChange} />
        <TextField name="password" label="Password" type="password" fullWidth margin="normal" onChange={handleChange} />
        <Button type="submit" variant="contained">Login</Button>
      </form>
    </Box>
  );
};

export default Login;