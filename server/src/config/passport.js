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

passport.use(new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
  try {
    const user = await User.findByPk(jwt_payload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('Processing Google OAuth login for:', profile.emails[0].value);
      
      // Check if user already exists
      let user = await User.findOne({ 
        where: { 
          google_id: profile.id 
        }
      });

      if (!user) {
        // Check if email is already registered
        user = await User.findOne({ 
          where: { 
            email: profile.emails[0].value 
          }
        });

        if (user) {
          // Link Google account to existing user
          console.log('Linking Google account to existing user:', user.username);
          user.google_id = profile.id;
          if (!user.profile_image_url) {
            user.profile_image_url = profile.photos[0].value;
          }
          user.last_login = new Date();
          user.last_active = new Date();
          await user.save();
        } else {
          // Create new user
          console.log('Creating new user for Google account');
          const now = new Date();
          user = await User.create({
            google_id: profile.id,
            email: profile.emails[0].value,
            username: profile.displayName,
            profile_image_url: profile.photos[0].value,
            last_login: now,
            last_active: now,
            created_at: now,
            updated_at: now
          });
          console.log('Created new user:', user.username, 'with ID:', user.user_id);
        }
      } else {
        // Update existing user's timestamps
        console.log('Updating existing Google user:', user.username);
        const now = new Date();
        user.last_login = now;
        user.last_active = now;
        user.updated_at = now;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      console.error('Google strategy error:', error);
      return done(error, null);
    }
  }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;