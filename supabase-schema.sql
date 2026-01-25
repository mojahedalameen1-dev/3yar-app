-- Supabase Database Schema for 3yar-app
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
    id BIGSERIAL PRIMARY KEY,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    plate_number VARCHAR(50),
    color VARCHAR(50),
    vin VARCHAR(50),
    initial_odometer INTEGER DEFAULT 0,
    current_odometer INTEGER DEFAULT 0,
    image TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('distance', 'time', 'both')),
    interval_km INTEGER,
    interval_months INTEGER,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_recurring BOOLEAN DEFAULT TRUE,
    last_maintenance_date TIMESTAMPTZ,
    last_maintenance_odometer INTEGER,
    snoozed_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Records table
CREATE TABLE IF NOT EXISTS maintenance_records (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT,
    task_name VARCHAR(200) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    odometer_reading INTEGER DEFAULT 0,
    cost DECIMAL(10, 2) DEFAULT 0,
    service_center VARCHAR(200),
    invoice_number VARCHAR(100),
    invoice_image TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    image TEXT,
    notes TEXT,
    reminder_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Odometer Readings table
CREATE TABLE IF NOT EXISTS odometer_readings (
    id BIGSERIAL PRIMARY KEY,
    reading INTEGER NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for all tables
-- Note: For now, policies allow all operations. Add auth later for user-specific data.

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE odometer_readings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (no auth for now)
CREATE POLICY "Allow all for cars" ON cars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for maintenance_tasks" ON maintenance_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for maintenance_records" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for odometer_readings" ON odometer_readings FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
