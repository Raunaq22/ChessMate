const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/User');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findByPk(payload.user_id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile);
    
    // Check if user exists
    let user = await User.findOne({ where: { google_id: profile.id } });
    
    if (user) {
      console.log('Existing user found:', user.email);
      // Update user's Google profile info
      await user.update({
        email: profile.emails[0].value,
        avatar_url: profile.photos[0].value,
        last_login: new Date()
      });
      return done(null, user);
    }

    // Format username from email or display name
    let username = profile.displayName || profile.emails[0].value.split('@')[0];
    // Remove special characters and spaces, convert to lowercase
    username = username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
    
    // Add random number if username is too short
    if (username.length < 3) {
      username += Math.floor(Math.random() * 1000);
    }

    // Create new user
    user = await User.create({
      google_id: profile.id,
      email: profile.emails[0].value,
      username: username,
      avatar_url: profile.photos[0].value,
      last_active: new Date(),
      last_login: new Date()
    });

    console.log('Google Strategy - New user created:', user.user_id);
    return done(null, user);
  } catch (error) {
    console.error('Google Strategy Error:', error);
    return done(error, null);
  }
}));

// Serialization
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (user_id, done) => {
  try {
    const user = await User.findByPk(user_id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;