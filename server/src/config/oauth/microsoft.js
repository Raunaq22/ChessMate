const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../../models/User');

module.exports = function(passport) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL,
        scope: ['user.read', 'openid', 'profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists with this Microsoft ID
          let user = await User.findOne({ 
            where: { 
              microsoft_id: profile.id 
            }
          });

          if (user) {
            // User exists, update their Microsoft info
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
              // Link Microsoft account to existing user
              user.microsoft_id = profile.id;
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
            microsoft_id: profile.id,
            profile_image_url: profile.photos && profile.photos[0].value,
            password: null, // OAuth users don't need passwords
            last_login: new Date()
          });

          return done(null, newUser);
        } catch (error) {
          console.error('Microsoft OAuth error:', error);
          return done(error, false);
        }
      }
    )
  );
};