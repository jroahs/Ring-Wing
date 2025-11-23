const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ⚠️ IMPORTANT: Using memoryStorage to keep files in buffer for Supabase upload
// Files are NOT saved to disk - they go directly to Supabase Storage
const storage = multer.memoryStorage();

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