const jwt = require('jsonwebtoken');

// Handle the Google OAuth callback
exports.googleCallback = (req, res) => {
  try {
    // User is already authenticated by Passport
    const user = req.user;

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};