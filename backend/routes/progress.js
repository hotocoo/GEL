const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Update progress
router.post('/:userId', async (req, res) => {
  try {
    const { subject, course, lessonsCompleted, score } = req.body;
    const user = await User.findById(req.params.userId);
    user.progress.push({ subject, course, lessonsCompleted, score });
    await user.save();
    res.json(user.progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;