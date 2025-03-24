const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const passport = require('passport');
const oauthRoutes = require('./oauth');

// Existing routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', passport.authenticate('jwt', { session: false }), authController.verify);
router.post('/activity', passport.authenticate('jwt', { session: false }), authController.updateActivity);

// OAuth routes
router.use('/oauth', oauthRoutes);

module.exports = router;