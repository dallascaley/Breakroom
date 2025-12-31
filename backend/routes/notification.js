const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../utilities/socket');

require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Middleware to verify JWT and get user info
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);

    const client = await getClient();
    const user = await client.query('SELECT id, handle FROM users WHERE handle = $1', [payload.username]);
    client.release();

    if (user.rowCount === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.rows[0].id,
      handle: user.rows[0].handle
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/notification/admin/all
 * Get all notifications for admin management
 */
router.get('/admin/all', authenticateToken, checkPermission('read_notification'), async (req, res) => {
  const client = await getClient();
  try {
    const result = await client.query(`
      SELECT
        n.*,
        nt.name as type_name,
        u.handle as created_by_handle,
        (SELECT COUNT(*) FROM user_notifications un WHERE un.notification_id = n.id) as recipient_count,
        (SELECT COUNT(*) FROM user_notifications un WHERE un.notification_id = n.id AND un.read_at IS NOT NULL) as read_count
      FROM notifications n
      LEFT JOIN notification_types nt ON n.type_id = nt.id
      LEFT JOIN users u ON n.created_by = u.id
      ORDER BY n.created_at DESC
    `);
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/notification/types
 * Get all notification types
 */
router.get('/types', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    const result = await client.query('SELECT * FROM notification_types WHERE is_active = true ORDER BY name');
    res.json({ types: result.rows });
  } catch (err) {
    console.error('Error fetching notification types:', err);
    res.status(500).json({ message: 'Failed to fetch notification types' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/notification
 * Create a new notification
 */
router.post('/', authenticateToken, checkPermission('create_notification'), async (req, res) => {
  const {
    type_id, title, content, target_all_users,
    target_user_ids, target_group_ids,
    display_mode, priority, publish_at, expires_at
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Insert notification
    const insertResult = await client.query(`
      INSERT INTO notifications
        (type_id, title, content, target_all_users, display_mode, priority, publish_at, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      type_id || null,
      title,
      content,
      target_all_users || false,
      display_mode || 'simple',
      priority || 0,
      publish_at || null,
      expires_at || null,
      req.user.id
    ]);

    const notificationId = insertResult.insertId;

    // Add target users if specified
    if (!target_all_users && target_user_ids && target_user_ids.length > 0) {
      for (const userId of target_user_ids) {
        await client.query(
          'INSERT INTO notification_users (notification_id, user_id) VALUES ($1, $2)',
          [notificationId, userId]
        );
      }
    }

    // Add target groups if specified
    if (!target_all_users && target_group_ids && target_group_ids.length > 0) {
      for (const groupId of target_group_ids) {
        await client.query(
          'INSERT INTO notification_groups (notification_id, group_id) VALUES ($1, $2)',
          [notificationId, groupId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch the created notification
    const result = await client.query('SELECT * FROM notifications WHERE id = $1', [notificationId]);
    const notification = result.rows[0];

    // If publish_at is null or in the past, send immediately via Socket.IO
    if (!notification.publish_at || new Date(notification.publish_at) <= new Date()) {
      await deliverNotification(client, notification);
    }

    res.status(201).json({ message: 'Notification created', notification: notification });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating notification:', err);
    res.status(500).json({ message: 'Failed to create notification' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/notification/:id
 * Update a notification
 */
router.put('/:id', authenticateToken, checkPermission('update_notification'), async (req, res) => {
  const { id } = req.params;
  const {
    type_id, title, content, target_all_users,
    target_user_ids, target_group_ids,
    display_mode, priority, publish_at, expires_at, is_active
  } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      UPDATE notifications SET
        type_id = $1, title = $2, content = $3, target_all_users = $4,
        display_mode = $5, priority = $6, publish_at = $7, expires_at = $8, is_active = $9
      WHERE id = $10
    `, [type_id, title, content, target_all_users, display_mode, priority, publish_at, expires_at, is_active, id]);

    // Update target users
    await client.query('DELETE FROM notification_users WHERE notification_id = $1', [id]);
    if (!target_all_users && target_user_ids && target_user_ids.length > 0) {
      for (const userId of target_user_ids) {
        await client.query(
          'INSERT INTO notification_users (notification_id, user_id) VALUES ($1, $2)',
          [id, userId]
        );
      }
    }

    // Update target groups
    await client.query('DELETE FROM notification_groups WHERE notification_id = $1', [id]);
    if (!target_all_users && target_group_ids && target_group_ids.length > 0) {
      for (const groupId of target_group_ids) {
        await client.query(
          'INSERT INTO notification_groups (notification_id, group_id) VALUES ($1, $2)',
          [id, groupId]
        );
      }
    }

    await client.query('COMMIT');

    const result = await client.query('SELECT * FROM notifications WHERE id = $1', [id]);
    res.json({ message: 'Notification updated', notification: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating notification:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/notification/:id
 * Delete a notification
 */
router.delete('/:id', authenticateToken, checkPermission('delete_notification'), async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    const result = await client.query('DELETE FROM notifications WHERE id = $1', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Failed to delete notification' });
  } finally {
    client.release();
  }
});

// ==================== USER ENDPOINTS ====================

/**
 * GET /api/notification/my
 * Get current user's notifications
 */
router.get('/my', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    // Get user's silenced types
    const silencedTypes = await client.query(
      'SELECT type_id FROM user_silenced_types WHERE user_id = $1',
      [req.user.id]
    );
    const silencedTypeIds = silencedTypes.rows.map(r => r.type_id);

    // Build query for user's notifications
    const result = await client.query(`
      SELECT
        n.id, n.type_id, n.title, n.content, n.display_mode, n.priority,
        n.publish_at, n.expires_at, n.created_at,
        nt.name as type_name,
        un.read_at, un.dismissed_at, un.delivered_at
      FROM notifications n
      LEFT JOIN notification_types nt ON n.type_id = nt.id
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE n.is_active = true
        AND (n.publish_at IS NULL OR n.publish_at <= NOW())
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
          n.target_all_users = true
          OR EXISTS (SELECT 1 FROM notification_users nu WHERE nu.notification_id = n.id AND nu.user_id = $2)
          OR EXISTS (
            SELECT 1 FROM notification_groups ng
            JOIN user_groups ug ON ng.group_id = ug.group_id
            WHERE ng.notification_id = n.id AND ug.user_id = $3
          )
        )
      ORDER BY n.priority DESC, n.created_at DESC
    `, [req.user.id, req.user.id, req.user.id]);

    // Filter out silenced types (unless modal - modal notifications bypass silence)
    const notifications = result.rows.filter(n =>
      n.display_mode === 'modal' || !silencedTypeIds.includes(n.type_id)
    );

    // Separate unread count
    const unreadCount = notifications.filter(n => !n.read_at && !n.dismissed_at).length;

    // Get pending modal notifications (unread, undismissed modals)
    const pendingModals = notifications.filter(n =>
      n.display_mode === 'modal' && !n.dismissed_at
    );

    res.json({
      notifications,
      unread_count: unreadCount,
      pending_modals: pendingModals
    });
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/notification/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    // Upsert user_notification record
    await client.query(`
      INSERT INTO user_notifications (user_id, notification_id, read_at, delivered_at)
      VALUES ($1, $2, NOW(), NOW())
      ON DUPLICATE KEY UPDATE read_at = NOW()
    `, [req.user.id, id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/notification/:id/dismiss
 * Dismiss a notification
 */
router.post('/:id/dismiss', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    await client.query(`
      INSERT INTO user_notifications (user_id, notification_id, dismissed_at, delivered_at)
      VALUES ($1, $2, NOW(), NOW())
      ON DUPLICATE KEY UPDATE dismissed_at = NOW()
    `, [req.user.id, id]);
    res.json({ message: 'Notification dismissed' });
  } catch (err) {
    console.error('Error dismissing notification:', err);
    res.status(500).json({ message: 'Failed to dismiss notification' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/notification/read-all
 * Mark all notifications as read
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    // Get all unread notifications for user
    const unread = await client.query(`
      SELECT n.id FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE n.is_active = true
        AND (n.publish_at IS NULL OR n.publish_at <= NOW())
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (un.read_at IS NULL)
        AND (
          n.target_all_users = true
          OR EXISTS (SELECT 1 FROM notification_users nu WHERE nu.notification_id = n.id AND nu.user_id = $2)
          OR EXISTS (
            SELECT 1 FROM notification_groups ng
            JOIN user_groups ug ON ng.group_id = ug.group_id
            WHERE ng.notification_id = n.id AND ug.user_id = $3
          )
        )
    `, [req.user.id, req.user.id, req.user.id]);

    for (const row of unread.rows) {
      await client.query(`
        INSERT INTO user_notifications (user_id, notification_id, read_at, delivered_at)
        VALUES ($1, $2, NOW(), NOW())
        ON DUPLICATE KEY UPDATE read_at = NOW()
      `, [req.user.id, row.id]);
    }

    res.json({ message: 'All notifications marked as read', count: unread.rows.length });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ message: 'Failed to mark all as read' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/notification/type/:typeId/silence
 * Silence a notification type
 */
router.post('/type/:typeId/silence', authenticateToken, async (req, res) => {
  const { typeId } = req.params;
  const client = await getClient();
  try {
    await client.query(
      'INSERT IGNORE INTO user_silenced_types (user_id, type_id) VALUES ($1, $2)',
      [req.user.id, typeId]
    );
    res.json({ message: 'Notification type silenced' });
  } catch (err) {
    console.error('Error silencing type:', err);
    res.status(500).json({ message: 'Failed to silence notification type' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/notification/type/:typeId/silence
 * Unsilence a notification type
 */
router.delete('/type/:typeId/silence', authenticateToken, async (req, res) => {
  const { typeId } = req.params;
  const client = await getClient();
  try {
    await client.query(
      'DELETE FROM user_silenced_types WHERE user_id = $1 AND type_id = $2',
      [req.user.id, typeId]
    );
    res.json({ message: 'Notification type unsilenced' });
  } catch (err) {
    console.error('Error unsilencing type:', err);
    res.status(500).json({ message: 'Failed to unsilence notification type' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/notification/silenced-types
 * Get user's silenced notification types
 */
router.get('/silenced-types', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    const result = await client.query(`
      SELECT nt.* FROM notification_types nt
      JOIN user_silenced_types ust ON nt.id = ust.type_id
      WHERE ust.user_id = $1
    `, [req.user.id]);
    res.json({ silenced_types: result.rows });
  } catch (err) {
    console.error('Error fetching silenced types:', err);
    res.status(500).json({ message: 'Failed to fetch silenced types' });
  } finally {
    client.release();
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Deliver a notification to target users via Socket.IO
 */
async function deliverNotification(client, notification) {
  const io = getIO();
  if (!io) {
    console.log('Socket.IO not available for notification delivery');
    return;
  }

  let targetUserIds = [];

  if (notification.target_all_users) {
    // Get all active user IDs
    const users = await client.query('SELECT id FROM users');
    targetUserIds = users.rows.map(u => u.id);
  } else {
    // Get directly targeted users
    const directUsers = await client.query(
      'SELECT user_id FROM notification_users WHERE notification_id = $1',
      [notification.id]
    );
    targetUserIds = directUsers.rows.map(u => u.user_id);

    // Get users from targeted groups
    const groupUsers = await client.query(`
      SELECT DISTINCT ug.user_id FROM user_groups ug
      JOIN notification_groups ng ON ug.group_id = ng.group_id
      WHERE ng.notification_id = $1
    `, [notification.id]);

    for (const row of groupUsers.rows) {
      if (!targetUserIds.includes(row.user_id)) {
        targetUserIds.push(row.user_id);
      }
    }
  }

  console.log(`Delivering notification ${notification.id} to ${targetUserIds.length} users`);

  // Create user_notification records and emit to each user
  for (const userId of targetUserIds) {
    // Insert delivery record (ignore if already exists)
    await client.query(`
      INSERT IGNORE INTO user_notifications (user_id, notification_id, delivered_at)
      VALUES ($1, $2, NOW())
    `, [userId, notification.id]);

    // Emit to user's personal notification room
    io.to(`user_${userId}`).emit('new_notification', {
      notification: {
        id: notification.id,
        type_id: notification.type_id,
        title: notification.title,
        content: notification.content,
        display_mode: notification.display_mode,
        priority: notification.priority,
        created_at: notification.created_at
      }
    });
  }
}

module.exports = router;
