-- ========================================================
-- MediGuard MySQL Database Schema & Seed Data
-- Compatible with MySQL 8.0+
-- ========================================================

CREATE DATABASE IF NOT EXISTS mediguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediguard;

-- 1. Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(100) NOT NULL DEFAULT 'Household User',
    alert_threshold_days INT NOT NULL DEFAULT 30 CHECK (alert_threshold_days >= 1),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Activity History Table
CREATE TABLE IF NOT EXISTS activity_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Settings
INSERT INTO user_settings (id, name, alert_threshold_days)
VALUES (1, 'Household User', 30)
ON DUPLICATE KEY UPDATE id=1;

-- Seed Sample Household Medicines
INSERT IGNORE INTO medicines (id, name, category, quantity, expiry_date) VALUES
(UUID(), 'Cough Syrup Dextromethorphan', 'Respiratory', 1, DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)),
(UUID(), 'Azithromycin 250mg', 'Antibiotic', 6, DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY)),
(UUID(), 'Amoxicillin 500mg', 'Antibiotic', 10, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY)),
(UUID(), 'Salbutamol Inhaler 100mcg', 'Respiratory', 1, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY)),
(UUID(), 'Insulin Glargine Pen', 'Diabetes', 2, DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY)),
(UUID(), 'Omeprazole 20mg', 'Gastroenterology', 14, DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY)),
(UUID(), 'Ibuprofen 400mg', 'Pain Relief', 20, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY)),
(UUID(), 'Ciprofloxacin Eye Drops 0.3%', 'Ophthalmic', 2, DATE_ADD(CURRENT_DATE, INTERVAL 18 DAY)),
(UUID(), 'Cetirizine 10mg', 'Antihistamine', 15, DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)),
(UUID(), 'Metformin 500mg', 'Diabetes', 40, DATE_ADD(CURRENT_DATE, INTERVAL 22 DAY)),
(UUID(), 'Antacid Gel', 'Digestion', 2, DATE_ADD(CURRENT_DATE, INTERVAL 150 DAY)),
(UUID(), 'Paracetamol 650mg', 'Analgesic', 30, DATE_ADD(CURRENT_DATE, INTERVAL 180 DAY)),
(UUID(), 'Vitamin D3 60,000 IU', 'Supplement', 8, DATE_ADD(CURRENT_DATE, INTERVAL 240 DAY)),
(UUID(), 'Aspirin 75mg', 'Cardiovascular', 60, DATE_ADD(CURRENT_DATE, INTERVAL 300 DAY)),
(UUID(), 'Antiseptic Ointment', 'First Aid', 3, DATE_ADD(CURRENT_DATE, INTERVAL 365 DAY));

-- Seed Activity History
INSERT INTO activity_history (action, medicine_name) VALUES
('INITIAL_SETUP', 'MySQL Database Schema Migration'),
('SEEDED', 'Initial Cabinet Inventory');
