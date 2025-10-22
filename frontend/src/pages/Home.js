import React from 'react';
import { Typography, Button, Box, Container, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container maxWidth="lg">
      <Box
        mt={10}
        p={6}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          color: 'white',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Typography variant="h1" gutterBottom sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🎮 Gamified Learning Platform
          </Typography>
          <Typography variant="h3" gutterBottom sx={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            Master University Subjects with Epic RPG Adventure
          </Typography>
          <Typography variant="h5" mb={4} sx={{ opacity: 0.9 }}>
            Level up your knowledge, earn XP, unlock achievements, and compete with friends!
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            <Grid item>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="contained"
                  size="large"
                  component={Link}
                  to="/signup"
                  sx={{
                    bgcolor: '#ff9800',
                    fontSize: '1.2rem',
                    px: 4,
                    py: 1.5,
                    boxShadow: '0 4px 15px rgba(255,152,0,0.4)',
                  }}
                >
                  🚀 Get Started
                </Button>
              </motion.div>
            </Grid>
            <Grid item>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="outlined"
                  size="large"
                  component={Link}
                  to="/login"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    fontSize: '1.2rem',
                    px: 4,
                    py: 1.5,
                    '&:hover': { borderColor: '#ff9800', color: '#ff9800' },
                  }}
                >
                  🔑 Login
                </Button>
              </motion.div>
            </Grid>
          </Grid>
        </motion.div>
      </Box>
    </Container>
  );
};

export default Home;