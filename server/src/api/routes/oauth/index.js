const express = require('express');
const router = express.Router();
const passport = require('passport');
const googleController = require('../../../controllers/oauth/googleController');
const microsoftController = require('../../../controllers/oauth/microsoftController');
const appleController = require('../../../controllers/oauth/appleController');

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

// Microsoft OAuth Routes
router.get('/microsoft', 
  passport.authenticate('microsoft', { scope: ['user.read', 'openid', 'profile', 'email'] }));

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { 
    session: false,
    failureRedirect: '/login' 
  }),
  microsoftController.microsoftCallback
);

// Apple OAuth Routes
router.get('/apple',
  passport.authenticate('apple', { 
    scope: ['email', 'name'] 
  }));

router.post('/apple/callback',
  passport.authenticate('apple', { 
    session: false,
    failureRedirect: '/login' 
  }),
  appleController.appleCallback
);

module.exports = router;