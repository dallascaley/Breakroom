-- Projects table for organizing tickets
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Join table for tickets and projects (many-to-many)
CREATE TABLE IF NOT EXISTS ticket_projects (
  ticket_id INT NOT NULL,
  project_id INT NOT NULL,
  PRIMARY KEY (ticket_id, project_id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for faster lookups by company
CREATE INDEX idx_projects_company_id ON projects(company_id);

-- Index for finding default project per company
CREATE INDEX idx_projects_company_default ON projects(company_id, is_default);

-- Create default 'Help Desk' project for all existing companies
INSERT INTO projects (company_id, title, description, is_default)
SELECT id, 'Help Desk', 'Default help desk project for support tickets', TRUE
FROM companies
WHERE id NOT IN (SELECT company_id FROM projects WHERE is_default = TRUE);

-- Associate existing tickets with their company's default Help Desk project
INSERT INTO ticket_projects (ticket_id, project_id)
SELECT t.id, p.id
FROM tickets t
JOIN projects p ON t.company_id = p.company_id AND p.is_default = TRUE
WHERE t.id NOT IN (SELECT ticket_id FROM ticket_projects);
