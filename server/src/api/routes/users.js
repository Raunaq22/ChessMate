const express = require('express');
const passport = require('passport');
const userController = require('../../controllers/userController');
const router = express.Router();

// Get user statistics
router.get('/stats', 
  passport.authenticate('jwt', { session: false }), 
  userController.getUserStats
);

// Get user by ID (public endpoint for fetching usernames)
router.get('/:userId', userController.getUserById);

module.exports = router;
