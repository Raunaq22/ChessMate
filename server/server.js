// Add this line with your other requires/imports
const path = require('path');

// Add this line before your routes are defined
app.use(express.static(path.join(__dirname, 'public')));

// Make sure the uploads directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads/profile');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Export the Express app as a serverless function
module.exports = app;
