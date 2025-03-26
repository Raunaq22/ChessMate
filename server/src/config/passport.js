const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/User');
const supabase = require('./supabase');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Only use user_id from the token
    const userId = payload.user_id;
    if (!userId) {
      return done(null, false);
    }
    
    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('Users')
      .select('user_id, username, email')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user in passport:', error);
      return done(error, false);
    }
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    console.error('Passport JWT strategy error:', error);
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
    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('Users')
      .select('*')
      .eq('google_id', profile.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (existingUser) {
      return done(null, existingUser);
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('Users')
      .insert([{
        google_id: profile.id,
        username: profile.displayName,
        email: profile.emails[0].value,
        profile_image_url: profile.photos[0].value,
        last_active: new Date().toISOString(),
        last_login: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) throw createError;

    return done(null, newUser);
  } catch (error) {
    console.error('Google strategy error:', error);
    return done(error, false);
  }
}));

// Serialization
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (user_id, done) => {
  try {
    const { data: user, error } = await supabase
      .from('Users')
      .select('*')
      .eq('user_id', user_id)
      .single();
      
    if (error) {
      console.error('Error deserializing user:', error);
      return done(error, null);
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;