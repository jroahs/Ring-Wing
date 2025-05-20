const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if this is a menu image upload
    const uploadPath = req.originalUrl.includes('/menu') ? 
      path.join(__dirname, '../public/uploads/menu') : 
      path.join(__dirname, '../public/uploads');
    
    // Create directory with proper error handling
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Directory creation error:', err);
        return cb(new Error('Failed to create upload directory'));
      }
      cb(null, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

// Enhanced file filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const isValidMime = allowedMimes.includes(file.mimetype);
  const isValidExt = ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(ext);

  if (isValidMime && isValidExt) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
  }
};

// Create Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware wrapper for error handling
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      let message = err.message;
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'File too large. Max 5MB allowed';
      }
      return res.status(400).json({ 
        success: false,
        message: message 
      });
    }
    next();
  });
};

module.exports = uploadMiddleware;