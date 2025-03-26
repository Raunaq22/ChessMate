const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    console.log('JWT Strategy - Looking up user:', payload.user_id);
    const user = await User.findByPk(payload.user_id);
    if (user) {
      console.log('JWT Strategy - User found:', user.user_id);
      return done(null, user);
    }
    console.log('JWT Strategy - User not found');
    return done(null, false);
  } catch (error) {
    console.error('JWT Strategy - Error:', error);
    return done(error, false);
  }
}));

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google Strategy - Profile received:', {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName
      });

      // Check if user already exists
      let user = await User.findOne({
        where: { google_id: profile.id }
      });

      if (!user) {
        console.log('Google Strategy - Creating new user');
        // Create new user if doesn't exist
        user = await User.create({
          google_id: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName,
          avatar_url: profile.photos?.[0]?.value
        });
        console.log('Google Strategy - New user created:', user.user_id);
      } else {
        console.log('Google Strategy - Existing user found:', user.user_id);
      }

      return done(null, user);
    } catch (error) {
      console.error('Google Strategy - Error:', error);
      return done(error, null);
    }
  }
));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.user_id);
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user:', id);
    const user = await User.findByPk(id);
    if (user) {
      console.log('Deserialized user found:', user.user_id);
      done(null, user);
    } else {
      console.log('Deserialized user not found');
      done(null, false);
    }
  } catch (error) {
    console.error('Deserialize user error:', error);
    done(error, null);
  }
});

module.exports = passport;