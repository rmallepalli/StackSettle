-- Migration 001: Players table

CREATE TABLE IF NOT EXISTS players (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(30),
  email         VARCHAR(150),
  venmo_handle  VARCHAR(100),
  zelle_contact VARCHAR(150),
  paypal_handle VARCHAR(150),
  cashapp_tag   VARCHAR(100),
  other_payment TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
