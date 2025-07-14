CREATE TABLE "user_auth" (
  id SERIAL PRIMARY KEY,
  handle VARCHAR(32) UNIQUE NOT NULL,
  first_name VARCHAR(32),
  last_name VARCHAR(32),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(64),
  verification_expires_at TIMESTAMPTZ,
  hash VARCHAR(64),
  salt VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permission_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permissions (
  user_id INTEGER REFERENCES user_auth(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE group_permissions (
  group_id INTEGER REFERENCES permission_groups(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_id)
);

CREATE TABLE user_permission_groups (
  user_id INTEGER REFERENCES user_auth(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES permission_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE user_permissions_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  action VARCHAR(16) NOT NULL CHECK (action IN ('grant', 'revoke')),
  performed_by INTEGER, -- could be a user_auth.id or NULL
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_permissions_audit (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  action VARCHAR(16) NOT NULL CHECK (action IN ('add', 'remove')),
  performed_by INTEGER,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permission_groups_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  action VARCHAR(16) NOT NULL CHECK (action IN ('assign', 'remove')),
  performed_by INTEGER,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Function to log user permission changes
CREATE OR REPLACE FUNCTION log_user_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_permissions_audit (user_id, permission_id, action, performed_by)
    VALUES (NEW.user_id, NEW.permission_id, 'grant', NULL);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_permissions_audit (user_id, permission_id, action, performed_by)
    VALUES (OLD.user_id, OLD.permission_id, 'revoke', NULL);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log user permission changes
CREATE TRIGGER trg_user_permissions_audit
AFTER INSERT OR DELETE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION log_user_permission_change();


-- Function to log group permission changes
CREATE OR REPLACE FUNCTION log_group_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO group_permissions_audit (group_id, permission_id, action, performed_by)
    VALUES (NEW.group_id, NEW.permission_id, 'add', NULL);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO group_permissions_audit (group_id, permission_id, action, performed_by)
    VALUES (OLD.group_id, OLD.permission_id, 'remove', NULL);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log group permission changes
CREATE TRIGGER trg_group_permissions_audit
AFTER INSERT OR DELETE ON group_permissions
FOR EACH ROW
EXECUTE FUNCTION log_group_permission_change();


-- Function to log user group changes
CREATE OR REPLACE FUNCTION log_user_group_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_permission_groups_audit (user_id, group_id, action, performed_by)
    VALUES (NEW.user_id, NEW.group_id, 'assign', NULL);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_permission_groups_audit (user_id, group_id, action, performed_by)
    VALUES (OLD.user_id, OLD.group_id, 'remove', NULL);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log user group changes
CREATE TRIGGER trg_user_permission_groups_audit
AFTER INSERT OR DELETE ON user_permission_groups
FOR EACH ROW
EXECUTE FUNCTION log_user_group_change();



