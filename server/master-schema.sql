CREATE DATABASE IF NOT EXISTS gems_flow_suite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gems_flow_suite;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  company_id INT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  secondary_phone VARCHAR(50) DEFAULT '',
  business_name VARCHAR(255) DEFAULT '',
  address TEXT NULL,
  logo TEXT NULL,
  role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(80) NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  company_id INT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(255) NULL,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS jewelry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  company_id INT NULL,
  material_type ENUM('gold', 'silver', 'diamond') NOT NULL DEFAULT 'gold',
  name VARCHAR(255) NOT NULL,
  category ENUM('rings', 'necklaces', 'bracelets', 'earrings', 'watches', 'other') NOT NULL DEFAULT 'other',
  weight DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_per_gram DECIMAL(12, 2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  status ENUM('available', 'reserved', 'sold', 'out_of_stock') NOT NULL DEFAULT 'available',
  photo TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jewelry_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_jewelry_code (code)
);

CREATE TABLE IF NOT EXISTS deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL,
  client_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  note TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deposits_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_deposits_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL,
  client_id INT NOT NULL,
  jewelry_id INT NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  paid_from_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_jewelry FOREIGN KEY (jewelry_id) REFERENCES jewelry(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL,
  client_id INT NOT NULL,
  jewelry_id INT NOT NULL,
  deposit_amount DECIMAL(12, 2) NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservations_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_jewelry FOREIGN KEY (jewelry_id) REFERENCES jewelry(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO users (
  email, username, password_hash, full_name, phone, business_name, role, status, must_change_password
)
SELECT
  'admin@users.local',
  'admin',
  '$2b$10$/M.5BOEkn74ld2jNu8cRLO/Ezj3KpCGtE0Sy3sBWshpEmfRHMnJga',
  'Super Admin',
  '',
  'Ma boutique',
  'super_admin',
  'active',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'admin'
);

ALTER TABLE jewelry ADD COLUMN IF NOT EXISTS code VARCHAR(40) NULL AFTER id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER password_hash;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER code;
ALTER TABLE jewelry ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER code;
ALTER TABLE jewelry ADD COLUMN IF NOT EXISTS material_type ENUM('gold', 'silver', 'diamond') NOT NULL DEFAULT 'gold' AFTER company_id;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER id;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER id;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER id;
ALTER TABLE jewelry ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1 AFTER sale_price;
ALTER TABLE jewelry MODIFY COLUMN status ENUM('available', 'reserved', 'sold', 'out_of_stock') NOT NULL DEFAULT 'available';

UPDATE users
SET company_id = id
WHERE role <> 'super_admin' AND (company_id IS NULL OR company_id = 0);

UPDATE clients c
LEFT JOIN users u ON u.id = c.created_by
SET c.company_id = COALESCE(u.company_id, c.created_by)
WHERE c.company_id IS NULL;

UPDATE jewelry j
LEFT JOIN users u ON u.id = j.created_by
SET j.company_id = COALESCE(u.company_id, j.created_by)
WHERE j.company_id IS NULL;

UPDATE deposits d
LEFT JOIN users u ON u.id = d.created_by
SET d.company_id = COALESCE(u.company_id, d.created_by)
WHERE d.company_id IS NULL;

UPDATE sales s
LEFT JOIN users u ON u.id = s.created_by
SET s.company_id = COALESCE(u.company_id, s.created_by)
WHERE s.company_id IS NULL;

UPDATE reservations r
LEFT JOIN users u ON u.id = r.created_by
SET r.company_id = COALESCE(u.company_id, r.created_by)
WHERE r.company_id IS NULL;

UPDATE jewelry
SET material_type = 'gold'
WHERE material_type IS NULL OR material_type = '';

UPDATE jewelry
SET code = CONCAT('JWL-', LPAD(id, 6, '0'))
WHERE code IS NULL OR code = '';

UPDATE jewelry
SET quantity = 1
WHERE quantity IS NULL OR quantity < 0;

UPDATE jewelry
SET status = 'out_of_stock'
WHERE quantity = 0 AND status <> 'sold';

UPDATE jewelry
SET status = 'available'
WHERE quantity > 0 AND status = 'out_of_stock';
