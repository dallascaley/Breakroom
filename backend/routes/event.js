const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');
const { checkPermission } = require('../middleware/checkPermission');
const { triggerEvent } = require('../utilities/eventService');

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

// ==================== PUBLIC TRIGGER ENDPOINT ====================

/**
 * POST /api/event/trigger
 * Trigger an event from the frontend
 */
router.post('/trigger', authenticateToken, async (req, res) => {
  const { code, data } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Event code is required' });
  }

  const result = await triggerEvent(code, {
    userId: req.user.id,
    data: data || {},
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json(result);
});

// ==================== ADMIN EVENT ENDPOINTS ====================

/**
 * GET /api/event/admin/all
 * Get all events with stats
 */
router.get('/admin/all', authenticateToken, checkPermission('read_event'), async (req, res) => {
  const client = await getClient();
  try {
    const result = await client.query(`
      SELECT
        e.*,
        (SELECT COUNT(*) FROM event_notification_rules enr WHERE enr.event_id = e.id) as rule_count,
        (SELECT COUNT(*) FROM event_log el WHERE el.event_id = e.id) as log_count
      FROM events e
      ORDER BY e.category, e.name
    `);
    res.json({ events: result.rows });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/event/admin/:id
 * Get a single event with its rules
 */
router.get('/admin/:id', authenticateToken, checkPermission('read_event'), async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    const eventResult = await client.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const rulesResult = await client.query(`
      SELECT
        enr.*,
        nt.name as notification_type_name
      FROM event_notification_rules enr
      LEFT JOIN notification_types nt ON enr.notification_type_id = nt.id
      WHERE enr.event_id = $1
      ORDER BY enr.name
    `, [id]);

    // Get target users and groups for each rule
    for (const rule of rulesResult.rows) {
      const targetUsers = await client.query(
        'SELECT user_id FROM event_rule_target_users WHERE rule_id = $1',
        [rule.id]
      );
      rule.target_user_ids = targetUsers.rows.map(r => r.user_id);

      const targetGroups = await client.query(
        'SELECT group_id FROM event_rule_target_groups WHERE rule_id = $1',
        [rule.id]
      );
      rule.target_group_ids = targetGroups.rows.map(r => r.group_id);
    }

    res.json({
      event: eventResult.rows[0],
      rules: rulesResult.rows
    });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ message: 'Failed to fetch event' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/event/admin
 * Create a new event
 */
router.post('/admin', authenticateToken, checkPermission('create_event'), async (req, res) => {
  const { code, name, description, category, scope, is_logged, log_retention_days } = req.body;

  if (!code || !name) {
    return res.status(400).json({ message: 'Code and name are required' });
  }

  const client = await getClient();
  try {
    await client.query(`
      INSERT INTO events (code, name, description, category, scope, is_logged, log_retention_days)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [code, name, description || null, category || null, scope || 'both', is_logged || false, log_retention_days || 30]);

    const result = await client.query('SELECT * FROM events WHERE code = $1', [code]);
    res.status(201).json({ message: 'Event created', event: result.rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Event code already exists' });
    }
    console.error('Error creating event:', err);
    res.status(500).json({ message: 'Failed to create event' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/event/admin/:id
 * Update an event
 */
router.put('/admin/:id', authenticateToken, checkPermission('update_event'), async (req, res) => {
  const { id } = req.params;
  const { code, name, description, category, scope, is_logged, log_retention_days, is_active } = req.body;

  const client = await getClient();
  try {
    await client.query(`
      UPDATE events SET
        code = $1, name = $2, description = $3, category = $4,
        scope = $5, is_logged = $6, log_retention_days = $7, is_active = $8
      WHERE id = $9
    `, [code, name, description, category, scope, is_logged, log_retention_days, is_active, id]);

    const result = await client.query('SELECT * FROM events WHERE id = $1', [id]);
    res.json({ message: 'Event updated', event: result.rows[0] });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ message: 'Failed to update event' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/event/admin/:id
 * Delete an event
 */
router.delete('/admin/:id', authenticateToken, checkPermission('delete_event'), async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    const result = await client.query('DELETE FROM events WHERE id = $1', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  } finally {
    client.release();
  }
});

// ==================== ADMIN RULE ENDPOINTS ====================

/**
 * POST /api/event/admin/:eventId/rule
 * Create a new notification rule for an event
 */
router.post('/admin/:eventId/rule', authenticateToken, checkPermission('create_event'), async (req, res) => {
  const { eventId } = req.params;
  const {
    name, condition_json, target_mode,
    notification_title, notification_content,
    notification_type_id, display_mode, priority,
    target_user_ids, target_group_ids
  } = req.body;

  if (!name || !notification_title || !notification_content) {
    return res.status(400).json({ message: 'Name, notification title, and content are required' });
  }

  const client = await getClient();
  try {
    await client.beginTransaction();

    const insertResult = await client.query(`
      INSERT INTO event_notification_rules
        (event_id, name, condition_json, target_mode, notification_title, notification_content, notification_type_id, display_mode, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      eventId,
      name,
      condition_json ? JSON.stringify(condition_json) : null,
      target_mode || 'triggering_user',
      notification_title,
      notification_content,
      notification_type_id || null,
      display_mode || 'simple',
      priority || 0
    ]);

    const ruleId = insertResult.insertId;

    // Add target users
    if (target_mode === 'specific_users' && target_user_ids?.length > 0) {
      for (const userId of target_user_ids) {
        await client.query(
          'INSERT INTO event_rule_target_users (rule_id, user_id) VALUES ($1, $2)',
          [ruleId, userId]
        );
      }
    }

    // Add target groups
    if (target_mode === 'specific_groups' && target_group_ids?.length > 0) {
      for (const groupId of target_group_ids) {
        await client.query(
          'INSERT INTO event_rule_target_groups (rule_id, group_id) VALUES ($1, $2)',
          [ruleId, groupId]
        );
      }
    }

    await client.commit();

    const result = await client.query('SELECT * FROM event_notification_rules WHERE id = $1', [ruleId]);
    res.status(201).json({ message: 'Rule created', rule: result.rows[0] });
  } catch (err) {
    await client.rollback();
    console.error('Error creating rule:', err);
    res.status(500).json({ message: 'Failed to create rule' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/event/admin/rule/:ruleId
 * Update a notification rule
 */
router.put('/admin/rule/:ruleId', authenticateToken, checkPermission('update_event'), async (req, res) => {
  const { ruleId } = req.params;
  const {
    name, condition_json, target_mode,
    notification_title, notification_content,
    notification_type_id, display_mode, priority, is_active,
    target_user_ids, target_group_ids
  } = req.body;

  const client = await getClient();
  try {
    await client.beginTransaction();

    await client.query(`
      UPDATE event_notification_rules SET
        name = $1, condition_json = $2, target_mode = $3,
        notification_title = $4, notification_content = $5,
        notification_type_id = $6, display_mode = $7, priority = $8, is_active = $9
      WHERE id = $10
    `, [
      name,
      condition_json ? JSON.stringify(condition_json) : null,
      target_mode,
      notification_title,
      notification_content,
      notification_type_id,
      display_mode,
      priority,
      is_active,
      ruleId
    ]);

    // Update target users
    await client.query('DELETE FROM event_rule_target_users WHERE rule_id = $1', [ruleId]);
    if (target_mode === 'specific_users' && target_user_ids?.length > 0) {
      for (const userId of target_user_ids) {
        await client.query(
          'INSERT INTO event_rule_target_users (rule_id, user_id) VALUES ($1, $2)',
          [ruleId, userId]
        );
      }
    }

    // Update target groups
    await client.query('DELETE FROM event_rule_target_groups WHERE rule_id = $1', [ruleId]);
    if (target_mode === 'specific_groups' && target_group_ids?.length > 0) {
      for (const groupId of target_group_ids) {
        await client.query(
          'INSERT INTO event_rule_target_groups (rule_id, group_id) VALUES ($1, $2)',
          [ruleId, groupId]
        );
      }
    }

    await client.commit();

    const result = await client.query('SELECT * FROM event_notification_rules WHERE id = $1', [ruleId]);
    res.json({ message: 'Rule updated', rule: result.rows[0] });
  } catch (err) {
    await client.rollback();
    console.error('Error updating rule:', err);
    res.status(500).json({ message: 'Failed to update rule' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/event/admin/rule/:ruleId
 * Delete a notification rule
 */
router.delete('/admin/rule/:ruleId', authenticateToken, checkPermission('delete_event'), async (req, res) => {
  const { ruleId } = req.params;
  const client = await getClient();
  try {
    const result = await client.query('DELETE FROM event_notification_rules WHERE id = $1', [ruleId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    console.error('Error deleting rule:', err);
    res.status(500).json({ message: 'Failed to delete rule' });
  } finally {
    client.release();
  }
});

// ==================== ADMIN LOG ENDPOINTS ====================

/**
 * GET /api/event/admin/logs
 * Get event logs (paginated)
 */
router.get('/admin/logs', authenticateToken, checkPermission('view_event_logs'), async (req, res) => {
  const { event_id, user_id, limit = 100, offset = 0 } = req.query;
  const client = await getClient();
  try {
    let query = `
      SELECT
        el.*,
        e.code as event_code, e.name as event_name,
        u.handle as user_handle
      FROM event_log el
      JOIN events e ON el.event_id = e.id
      LEFT JOIN users u ON el.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (event_id) {
      query += ` AND el.event_id = $${paramIndex++}`;
      params.push(event_id);
    }

    if (user_id) {
      query += ` AND el.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    query += ` ORDER BY el.triggered_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await client.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM event_log WHERE 1=1';
    const countParams = [];
    if (event_id) {
      countQuery += ' AND event_id = $1';
      countParams.push(event_id);
    }
    if (user_id) {
      countQuery += countParams.length ? ' AND user_id = $2' : ' AND user_id = $1';
      countParams.push(user_id);
    }

    const countResult = await client.query(countQuery, countParams);

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching event logs:', err);
    res.status(500).json({ message: 'Failed to fetch event logs' });
  } finally {
    client.release();
  }
});

module.exports = router;
