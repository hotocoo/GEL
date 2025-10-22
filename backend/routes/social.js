const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Add friend
router.post('/add-friend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    const user = await User.findById(userId);
    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      await user.save();
    }
    res.json({ friends: user.friends });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get friends
router.get('/:userId/friends', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('friends', 'username level xp');
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;