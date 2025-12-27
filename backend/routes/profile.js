const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');

require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with user id and timestamp
    const ext = path.extname(file.originalname);
    const filename = `profile_${req.user.id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.jwtToken;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const payload = jwt.verify(token, SECRET_KEY);
    const client = await getClient();
    const result = await client.query(
      'SELECT id, handle, first_name, last_name, email, bio, photo_path, created_at FROM users WHERE handle = $1',
      [payload.username]
    );
    client.release();

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get current user's profile
router.get('/', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      handle: req.user.handle,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      email: req.user.email,
      bio: req.user.bio,
      photoPath: req.user.photo_path,
      createdAt: req.user.created_at
    }
  });
});

// Update profile (bio and basic info)
router.put('/', authenticate, async (req, res) => {
  const { bio, firstName, lastName } = req.body;
  const client = await getClient();

  try {
    await client.query(
      'UPDATE users SET bio = $1, first_name = $2, last_name = $3 WHERE id = $4',
      [bio, firstName, lastName, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  } finally {
    client.release();
  }
});

// Upload profile photo
router.post('/photo', authenticate, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const client = await getClient();
  try {
    // Delete old photo if exists
    if (req.user.photo_path) {
      const oldPath = path.join(uploadsDir, req.user.photo_path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update database with new photo path
    await client.query(
      'UPDATE users SET photo_path = $1 WHERE id = $2',
      [req.file.filename, req.user.id]
    );

    res.json({
      message: 'Photo uploaded successfully',
      photoPath: req.file.filename
    });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ message: 'Failed to upload photo' });
  } finally {
    client.release();
  }
});

// Delete profile photo
router.delete('/photo', authenticate, async (req, res) => {
  const client = await getClient();

  try {
    if (req.user.photo_path) {
      const photoPath = path.join(uploadsDir, req.user.photo_path);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }

      await client.query(
        'UPDATE users SET photo_path = NULL WHERE id = $1',
        [req.user.id]
      );
    }

    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ message: 'Failed to delete photo' });
  } finally {
    client.release();
  }
});

module.exports = router;
