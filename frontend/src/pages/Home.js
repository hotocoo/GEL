import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Box textAlign="center" mt={5}>
      <Typography variant="h3">Welcome to Gamified Learning Platform</Typography>
      <Typography variant="h5">Master University Subjects with RPG Adventure</Typography>
      <Button variant="contained" component={Link} to="/signup">Get Started</Button>
    </Box>
  );
};

export default Home;