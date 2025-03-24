const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../../models/User');

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists with this Google ID
          let user = await User.findOne({ 
            where: { 
              google_id: profile.id 
            }
          });

          if (user) {
            // User exists, update their Google info
            user.last_login = new Date();
            await user.save();
            return done(null, user);
          }

          // Check if user exists with same email
          const email = profile.emails && profile.emails[0].value;
          if (email) {
            user = await User.findOne({ 
              where: { 
                email: email
              }
            });

            if (user) {
              // Link Google account to existing user
              user.google_id = profile.id;
              user.profile_image_url = profile.photos && profile.photos[0].value;
              user.last_login = new Date();
              await user.save();
              return done(null, user);
            }
          }

          // Create a new user
          const newUser = await User.create({
            username: profile.displayName || `user_${profile.id.substring(0, 8)}`,
            email: email || null,
            google_id: profile.id,
            profile_image_url: profile.photos && profile.photos[0].value,
            password: null, // OAuth users don't need passwords
            last_login: new Date()
          });

          return done(null, newUser);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error, false);
        }
      }
    )
  );
};