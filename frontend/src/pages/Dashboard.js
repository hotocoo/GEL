import React from 'react';
import { Typography, Box, Card, CardContent, Grid, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { auth } = useAuth();

  return (
    <Box mt={5}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h4">Welcome, {auth.user?.username}!</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography>Level: {auth.user?.level}</Typography>
                <Typography>XP: {auth.user?.xp}</Typography>
                <Typography>Streak: 0</Typography>
                <Button variant="contained">View Progress</Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography>Badges: 0</Typography>
                <Typography>Achievements: 0</Typography>
                <Button variant="contained">View Achievements</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Typography variant="h5">Subjects to Master</Typography>
        {/* Placeholder for subject selection */}
      </motion.div>
    </Box>
  );
};

export default Dashboard;