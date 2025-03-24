const AppleStrategy = require('passport-apple');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

module.exports = function(passport) {
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
        callbackURL: process.env.APPLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, idToken, profile, done) => {
        try {
          // Apple's strategy doesn't provide profile details directly
          // We need to extract user info from the idToken
          const decoded = jwt.decode(idToken);
          const appleId = decoded.sub;
          const email = decoded.email;

          // Check if user already exists with this Apple ID
          let user = await User.findOne({ 
            where: { 
              apple_id: appleId 
            }
          });

          if (user) {
            // User exists, update their Apple info
            user.last_login = new Date();
            await user.save();
            return done(null, user);
          }

          // Check if user exists with same email
          if (email) {
            user = await User.findOne({ 
              where: { 
                email: email
              }
            });

            if (user) {
              // Link Apple account to existing user
              user.apple_id = appleId;
              user.last_login = new Date();
              await user.save();
              return done(null, user);
            }
          }

          // For Apple, name might come in the request body during first login
          const firstName = req.body && req.body.firstName;
          const lastName = req.body && req.body.lastName;
          const displayName = firstName && lastName 
            ? `${firstName} ${lastName}` 
            : `user_${appleId.substring(0, 8)}`;

          // Create a new user
          const newUser = await User.create({
            username: displayName,
            email: email || null,
            apple_id: appleId,
            password: null, // OAuth users don't need passwords
            last_login: new Date()
          });

          return done(null, newUser);
        } catch (error) {
          console.error('Apple OAuth error:', error);
          return done(error, false);
        }
      }
    )
  );
};