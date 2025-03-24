const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// Import only Google OAuth strategy
require('./oauth/google');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
  // JWT Strategy
  passport.use(
    new JwtStrategy(options, async (payload, done) => {
      try {
        const user = await User.findByPk(payload.user_id);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        console.error('JWT authentication error:', error);
        done(error, false);
      }
    })
  );

  // Configure Google OAuth strategy only
  require('./oauth/google')(passport);

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.user_id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};