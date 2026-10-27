-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id INT PRIMARY KEY DEFAULT 1,
    name TEXT NOT NULL DEFAULT 'Household User',
    alert_threshold_days INT NOT NULL DEFAULT 30 CHECK (alert_threshold_days >= 1),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Activity History Table
CREATE TABLE IF NOT EXISTS activity_history (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    medicine_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;

-- Allow public (anon + authenticated) full access for household app
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public full access medicines" ON medicines;
    DROP POLICY IF EXISTS "Public full access user_settings" ON user_settings;
    DROP POLICY IF EXISTS "Public full access activity_history" ON activity_history;

    CREATE POLICY "Public full access medicines" ON medicines
        FOR ALL USING (true) WITH CHECK (true);

    CREATE POLICY "Public full access user_settings" ON user_settings
        FOR ALL USING (true) WITH CHECK (true);

    CREATE POLICY "Public full access activity_history" ON activity_history
        FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_history;

-- Default Settings Seed
INSERT INTO user_settings (id, name, alert_threshold_days)
VALUES (1, 'Household User', 30)
ON CONFLICT (id) DO NOTHING;

-- Demo Medicines Seed (only if table is empty)
INSERT INTO medicines (name, category, quantity, expiry_date)
SELECT 'Amoxicillin 500mg', 'Antibiotic', 10, CURRENT_DATE - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM medicines);

INSERT INTO medicines (name, category, quantity, expiry_date)
SELECT 'Insulin Glargine Pen', 'Diabetes', 2, CURRENT_DATE + INTERVAL '4 days'
WHERE NOT EXISTS (SELECT 1 FROM medicines WHERE name = 'Insulin Glargine Pen');

INSERT INTO medicines (name, category, quantity, expiry_date)
SELECT 'Cetirizine 10mg', 'Antihistamine', 15, CURRENT_DATE + INTERVAL '20 days'
WHERE NOT EXISTS (SELECT 1 FROM medicines WHERE name = 'Cetirizine 10mg');

INSERT INTO medicines (name, category, quantity, expiry_date)
SELECT 'Paracetamol 650mg', 'Analgesic', 30, CURRENT_DATE + INTERVAL '180 days'
WHERE NOT EXISTS (SELECT 1 FROM medicines WHERE name = 'Paracetamol 650mg');

-- Log Initial Seed Activity
INSERT INTO activity_history (action, medicine_name)
SELECT 'SEEDED', 'Initial Cabinet Inventory'
WHERE NOT EXISTS (SELECT 1 FROM activity_history);
