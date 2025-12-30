const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');
const { uploadToS3, deleteFromS3 } = require('../utilities/aws-s3');

require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Configure multer for memory storage (buffer for S3 upload)
const storage = multer.memoryStorage();

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
      'SELECT id, handle, first_name, last_name, email, bio, photo_path, timezone, created_at FROM users WHERE handle = $1',
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

// Helper to get friend count for a user
async function getFriendCount(client, userId) {
  const result = await client.query(
    `SELECT COUNT(*) as count FROM friends
     WHERE (user_id = $1 OR friend_id = $2) AND status = 'accepted'`,
    [userId, userId]
  );
  return parseInt(result.rows[0].count) || 0;
}

// Get current user's profile
router.get('/', authenticate, async (req, res) => {
  const client = await getClient();
  try {
    const friendCount = await getFriendCount(client, req.user.id);
    res.json({
      user: {
        id: req.user.id,
        handle: req.user.handle,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        email: req.user.email,
        bio: req.user.bio,
        photoPath: req.user.photo_path,
        timezone: req.user.timezone,
        createdAt: req.user.created_at,
        friendCount
      }
    });
  } finally {
    client.release();
  }
});

// Get public profile by handle
router.get('/user/:handle', async (req, res) => {
  const { handle } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      'SELECT id, handle, first_name, last_name, bio, photo_path, created_at FROM users WHERE handle = $1',
      [handle]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    const friendCount = await getFriendCount(client, user.id);

    res.json({
      user: {
        id: user.id,
        handle: user.handle,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        photoPath: user.photo_path,
        createdAt: user.created_at,
        friendCount
      }
    });
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  } finally {
    client.release();
  }
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

// Update user timezone
router.put('/timezone', authenticate, async (req, res) => {
  const { timezone } = req.body;
  const client = await getClient();

  try {
    // Validate timezone is a valid IANA timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (e) {
      return res.status(400).json({ message: 'Invalid timezone' });
    }

    await client.query(
      'UPDATE users SET timezone = $1 WHERE id = $2',
      [timezone, req.user.id]
    );

    res.json({ message: 'Timezone updated successfully', timezone });
  } catch (err) {
    console.error('Error updating timezone:', err);
    res.status(500).json({ message: 'Failed to update timezone' });
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
    // Generate S3 key
    const ext = path.extname(req.file.originalname).toLowerCase();
    const s3Key = `profiles/profile_${req.user.id}_${Date.now()}${ext}`;

    // Upload to S3
    const uploadResult = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    if (!uploadResult.success) {
      return res.status(500).json({ message: 'Failed to upload to S3: ' + uploadResult.error });
    }

    // Delete old photo from S3 if exists
    if (req.user.photo_path) {
      await deleteFromS3(req.user.photo_path);
    }

    // Update database with new S3 key
    await client.query(
      'UPDATE users SET photo_path = $1 WHERE id = $2',
      [s3Key, req.user.id]
    );

    res.json({
      message: 'Photo uploaded successfully',
      photoPath: s3Key
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
      // Delete from S3
      await deleteFromS3(req.user.photo_path);

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
