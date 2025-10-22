const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Award XP and check for level up
router.post('/award-xp', async (req, res) => {
  try {
    const { userId, xp } = req.body;
    const user = await User.findById(userId);
    user.xp += xp;
    while (user.xp >= user.level * 100) {
      user.xp -= user.level * 100;
      user.level += 1;
    }
    await user.save();
    res.json({ user: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update streak
router.post('/update-streak', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    user.streak += 1;
    await user.save();
    res.json({ streak: user.streak });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;