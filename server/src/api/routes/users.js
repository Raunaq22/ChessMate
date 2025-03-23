const express = require('express');
const passport = require('passport');
const userController = require('../../controllers/userController');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../../public/uploads/profile');
    console.log('Upload destination path:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  }
});

// Get user statistics
router.get('/stats', 
  passport.authenticate('jwt', { session: false }), 
  userController.getUserStats
);

// Get user by ID (public endpoint for fetching usernames)
router.get('/:userId', userController.getUserById);

// Update user profile
router.put('/update', 
  passport.authenticate('jwt', { session: false }), 
  userController.updateUser
);

// Upload profile image
router.post('/upload-image',
  passport.authenticate('jwt', { session: false }),
  upload.single('profileImage'),
  userController.uploadProfileImage
);

// Get profile image by filename
router.get('/profile-image/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Validate filename format to prevent directory traversal attacks
  if (!filename.match(/^profile-[0-9]+-[0-9]+\.(jpg|jpeg|png|gif)$/i)) {
    return res.status(400).json({ message: 'Invalid filename format' });
  }
  
  const filePath = path.join(__dirname, '../../../public/uploads/profile', filename);
  res.sendFile(filePath);
});

// Default avatar fallback - always returns the default avatar
router.get('/default-avatar', (req, res) => {
  const defaultAvatarPath = path.join(__dirname, '../../../public/assets/default-avatar.png');
  res.sendFile(defaultAvatarPath);
});

// Image proxy for CORS issues
router.get('/image-proxy', async (req, res) => {
  try {
    const imagePath = req.query.path;
    
    // Validate path to prevent directory traversal attacks
    if (!imagePath || !imagePath.startsWith('/uploads/profile/')) {
      return res.status(400).send('Invalid image path');
    }
    
    // Send the file
    res.sendFile(path.join(__dirname, '../../../public', imagePath));
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send('Error serving image');
  }
});

module.exports = router;