/**
 * Event Service - Core event triggering functionality
 * Handles event triggering, condition evaluation, and notification delivery
 */

const { getClient } = require('./db');
const { getIO } = require('./socket');

/**
 * Trigger an event in the system
 * @param {string} eventCode - The event code (e.g., 'breakpoint_changed')
 * @param {Object} options - Event options
 * @param {number} options.userId - The user who triggered the event (optional for global events)
 * @param {Object} options.data - Event-specific data (e.g., { from: 3, to: 4 })
 * @param {string} options.ipAddress - IP address of the request
 * @param {string} options.userAgent - User agent string
 */
async function triggerEvent(eventCode, options = {}) {
  const { userId, data = {}, ipAddress, userAgent } = options;
  const client = await getClient();

  try {
    // Get the event definition
    const eventResult = await client.query(
      'SELECT * FROM events WHERE code = $1 AND is_active = true',
      [eventCode]
    );

    if (eventResult.rowCount === 0) {
      console.log(`Event not found or inactive: ${eventCode}`);
      return { triggered: false, reason: 'event_not_found' };
    }

    const event = eventResult.rows[0];

    // Log the event if configured
    if (event.is_logged) {
      await client.query(
        `INSERT INTO event_log (event_id, user_id, data_json, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [event.id, userId || null, JSON.stringify(data), ipAddress || null, userAgent || null]
      );
    }

    // Get all active notifications linked to this event
    const notificationsResult = await client.query(
      'SELECT * FROM notifications WHERE event_id = $1 AND is_active = true',
      [event.id]
    );

    let notificationsTriggered = 0;

    for (const notification of notificationsResult.rows) {
      // Evaluate condition if present
      if (notification.condition_json) {
        if (!evaluateCondition(notification.condition_json, data)) {
          continue;
        }
      }

      // Check trigger mode and deliver notification
      const delivered = await deliverEventNotification(client, notification, userId, data);
      if (delivered) {
        notificationsTriggered++;
      }
    }

    return {
      triggered: true,
      event: event.code,
      logged: event.is_logged,
      notifications_triggered: notificationsTriggered
    };
  } catch (err) {
    console.error('Error triggering event:', err);
    return { triggered: false, reason: 'error', error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Deliver a notification based on trigger mode
 * @returns {boolean} - Whether the notification was delivered
 */
async function deliverEventNotification(client, notification, userId, data) {
  if (!userId) {
    console.log('No userId for event notification delivery');
    return false;
  }

  const triggerMode = notification.trigger_mode || 'always';

  // Check if user should receive this notification based on trigger mode
  if (triggerMode === 'once') {
    // Check if user has ever received this notification
    const existing = await client.query(
      'SELECT 1 FROM user_notifications WHERE user_id = $1 AND notification_id = $2',
      [userId, notification.id]
    );
    if (existing.rowCount > 0) {
      return false; // Already received, skip
    }
  } else if (triggerMode === 'until_silenced') {
    // Check if user has silenced this notification type
    if (notification.type_id) {
      const silenced = await client.query(
        'SELECT 1 FROM user_silenced_types WHERE user_id = $1 AND type_id = $2',
        [userId, notification.type_id]
      );
      if (silenced.rowCount > 0) {
        return false; // User silenced this type
      }
    }
  }
  // 'always' mode - always deliver

  // Replace placeholders in title and content
  const title = replacePlaceholders(notification.title, data, userId);
  const content = replacePlaceholders(notification.content, data, userId);

  // For 'always' mode, we need to create a new notification instance each time
  // For 'once' mode, we just record that the user received it
  // For 'until_silenced', same as 'always' but checked above

  if (triggerMode === 'always') {
    // Insert delivery record (use ON DUPLICATE KEY to handle re-triggering)
    await client.query(`
      INSERT INTO user_notifications (user_id, notification_id, delivered_at)
      VALUES ($1, $2, NOW())
      ON DUPLICATE KEY UPDATE delivered_at = NOW(), read_at = NULL, dismissed_at = NULL
    `, [userId, notification.id]);
  } else {
    // Insert delivery record
    await client.query(`
      INSERT IGNORE INTO user_notifications (user_id, notification_id, delivered_at)
      VALUES ($1, $2, NOW())
    `, [userId, notification.id]);
  }

  // Emit via Socket.IO
  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit('new_notification', {
      notification: {
        id: notification.id,
        type_id: notification.type_id,
        title,
        content,
        display_mode: notification.display_mode || 'simple',
        priority: notification.priority || 0,
        created_at: new Date()
      }
    });
  }

  console.log(`Event notification delivered to user ${userId}: ${title}`);
  return true;
}

/**
 * Evaluate a condition JSON against event data
 * Supports: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $exists, $and, $or
 */
function evaluateCondition(conditionJson, data) {
  if (!conditionJson) return true;

  let condition;
  try {
    condition = typeof conditionJson === 'string' ? JSON.parse(conditionJson) : conditionJson;
  } catch (e) {
    console.error('Invalid condition JSON:', conditionJson);
    return false;
  }

  if (Object.keys(condition).length === 0) return true;

  return matchCondition(condition, data);
}

function matchCondition(condition, data) {
  // Handle logical operators
  if (condition.$and) {
    return condition.$and.every(sub => matchCondition(sub, data));
  }
  if (condition.$or) {
    return condition.$or.some(sub => matchCondition(sub, data));
  }

  // Match each field in condition against data
  for (const [field, value] of Object.entries(condition)) {
    if (field.startsWith('$')) continue; // Skip operators at top level

    const dataValue = getNestedValue(data, field);

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Value is an operator object
      if (!matchOperators(value, dataValue)) return false;
    } else {
      // Direct value comparison (implicit $eq)
      if (dataValue !== value) return false;
    }
  }

  return true;
}

function matchOperators(operators, value) {
  for (const [op, expected] of Object.entries(operators)) {
    switch (op) {
      case '$eq':
        if (value !== expected) return false;
        break;
      case '$ne':
        if (value === expected) return false;
        break;
      case '$gt':
        if (!(value > expected)) return false;
        break;
      case '$gte':
        if (!(value >= expected)) return false;
        break;
      case '$lt':
        if (!(value < expected)) return false;
        break;
      case '$lte':
        if (!(value <= expected)) return false;
        break;
      case '$in':
        if (!Array.isArray(expected) || !expected.includes(value)) return false;
        break;
      case '$nin':
        if (Array.isArray(expected) && expected.includes(value)) return false;
        break;
      case '$exists':
        if ((value !== undefined && value !== null) !== expected) return false;
        break;
      default:
        console.warn(`Unknown operator: ${op}`);
    }
  }
  return true;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Replace placeholders in notification text
 * Supports: {{data.fieldName}}, {{user.id}}
 */
function replacePlaceholders(text, data, userId) {
  if (!text) return text;

  return text.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, type, field) => {
    if (type === 'data' && data[field] !== undefined) {
      return String(data[field]);
    }
    if (type === 'user' && field === 'id' && userId !== undefined) {
      return String(userId);
    }
    return match; // Keep original if not found
  });
}

/**
 * Clean up old event logs based on retention settings
 */
async function cleanupEventLogs() {
  const client = await getClient();
  try {
    const result = await client.query(`
      DELETE el FROM event_log el
      JOIN events e ON el.event_id = e.id
      WHERE e.is_logged = true
        AND e.log_retention_days > 0
        AND el.triggered_at < DATE_SUB(NOW(), INTERVAL e.log_retention_days DAY)
    `);
    console.log(`Cleaned up ${result.affectedRows || 0} old event log entries`);
  } catch (err) {
    console.error('Error cleaning up event logs:', err);
  } finally {
    client.release();
  }
}

module.exports = {
  triggerEvent,
  evaluateCondition,
  cleanupEventLogs
};
