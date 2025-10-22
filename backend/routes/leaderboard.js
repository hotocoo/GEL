const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const leaderboard = await User.find({}, 'username level xp streak')
      .sort({ xp: -1, level: -1 })
      .limit(10);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;