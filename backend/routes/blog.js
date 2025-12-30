const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');
const { uploadToS3 } = require('../utilities/aws-s3');

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
      'SELECT id, handle FROM users WHERE handle = $1',
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

// Get feed of posts (own + friends' published posts)
router.get('/feed', authenticate, async (req, res) => {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT bp.id, bp.title, bp.content, bp.is_published, bp.created_at, bp.updated_at,
              u.id as author_id, u.handle as author_handle, u.first_name as author_first_name,
              u.last_name as author_last_name, u.photo_path as author_photo
       FROM blog_posts bp
       JOIN users u ON bp.user_id = u.id
       WHERE bp.is_published = TRUE
         AND (bp.user_id = $1
              OR bp.user_id IN (
                SELECT CASE
                  WHEN user_id = $1 THEN friend_id
                  ELSE user_id
                END
                FROM friendships
                WHERE (user_id = $1 OR friend_id = $1)
                  AND status = 'accepted'
              ))
       ORDER BY bp.updated_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({ posts: result.rows });
  } catch (err) {
    console.error('Error fetching blog feed:', err);
    res.status(500).json({ message: 'Failed to fetch feed' });
  } finally {
    client.release();
  }
});

// Get a single published post (public view)
router.get('/view/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT bp.id, bp.title, bp.content, bp.is_published, bp.created_at, bp.updated_at,
              u.id as author_id, u.handle as author_handle, u.first_name as author_first_name,
              u.last_name as author_last_name, u.photo_path as author_photo, u.bio as author_bio
       FROM blog_posts bp
       JOIN users u ON bp.user_id = u.id
       WHERE bp.id = $1 AND bp.is_published = TRUE`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ message: 'Failed to fetch post' });
  } finally {
    client.release();
  }
});

// Get all posts for current user
router.get('/posts', authenticate, async (req, res) => {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT id, title, is_published, created_at, updated_at
       FROM blog_posts
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );

    res.json({ posts: result.rows });
  } catch (err) {
    console.error('Error fetching blog posts:', err);
    res.status(500).json({ message: 'Failed to fetch posts' });
  } finally {
    client.release();
  }
});

// Get a single post by ID (must belong to current user)
router.get('/posts/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT id, title, content, is_published, created_at, updated_at
       FROM blog_posts
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ message: 'Failed to fetch post' });
  } finally {
    client.release();
  }
});

// Create a new post
router.post('/posts', authenticate, async (req, res) => {
  const { title, content, isPublished } = req.body;
  const client = await getClient();

  try {
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    await client.query(
      `INSERT INTO blog_posts (user_id, title, content, is_published)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, title.trim(), content || '', isPublished || false]
    );

    // Get the inserted post
    const result = await client.query(
      `SELECT id, title, content, is_published, created_at, updated_at
       FROM blog_posts
       WHERE user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [req.user.id]
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error('Error creating blog post:', err);
    res.status(500).json({ message: 'Failed to create post' });
  } finally {
    client.release();
  }
});

// Update a post
router.put('/posts/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, content, isPublished } = req.body;
  const client = await getClient();

  try {
    // Verify ownership
    const check = await client.query(
      'SELECT id FROM blog_posts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    await client.query(
      `UPDATE blog_posts
       SET title = $1, content = $2, is_published = $3
       WHERE id = $4 AND user_id = $5`,
      [title.trim(), content || '', isPublished || false, id, req.user.id]
    );

    // Get updated post
    const result = await client.query(
      `SELECT id, title, content, is_published, created_at, updated_at
       FROM blog_posts
       WHERE id = $1`,
      [id]
    );

    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('Error updating blog post:', err);
    res.status(500).json({ message: 'Failed to update post' });
  } finally {
    client.release();
  }
});

// Delete a post
router.delete('/posts/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      'DELETE FROM blog_posts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting blog post:', err);
    res.status(500).json({ message: 'Failed to delete post' });
  } finally {
    client.release();
  }
});

// Upload image for blog content
router.post('/upload-image', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Generate S3 key
    const ext = path.extname(req.file.originalname).toLowerCase();
    const s3Key = `blog/${req.user.id}/img_${Date.now()}${ext}`;

    // Upload to S3
    const uploadResult = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    if (!uploadResult.success) {
      return res.status(500).json({ message: 'Failed to upload image: ' + uploadResult.error });
    }

    // Return the URL path that can be used in the editor
    res.json({
      url: `/api/uploads/${s3Key}`
    });
  } catch (err) {
    console.error('Error uploading blog image:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

module.exports = router;
