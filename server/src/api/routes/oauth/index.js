const express = require('express');
const router = express.Router();
const passport = require('passport');
const googleController = require('../../../controllers/oauth/googleController');

// Google OAuth Routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login' 
  }),
  googleController.googleCallback
);

module.exports = router;