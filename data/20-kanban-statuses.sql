-- Migration: Update ticket statuses for Kanban board
-- New statuses: backlog, on-deck, in_progress, resolved, closed
-- "open" is replaced by "backlog"

-- Alter the enum to include new status values
ALTER TABLE tickets MODIFY COLUMN status
  ENUM('open', 'backlog', 'on-deck', 'in_progress', 'resolved', 'closed')
  DEFAULT 'backlog';

-- Migrate existing "open" tickets to "backlog"
UPDATE tickets SET status = 'backlog' WHERE status = 'open';
