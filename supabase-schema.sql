-- =====================================================
-- Multi-User Authentication & QR Status Feature
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Step 1: Add user_id column to all tables
ALTER TABLE cars ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE odometer_readings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Add public sharing columns to cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();

-- Step 3: Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_cars_share_token ON cars(share_token);
CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);

-- Step 4: Drop existing open policies
DROP POLICY IF EXISTS "Allow all for cars" ON cars;
DROP POLICY IF EXISTS "Allow all for maintenance_tasks" ON maintenance_tasks;
DROP POLICY IF EXISTS "Allow all for maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "Allow all for documents" ON documents;
DROP POLICY IF EXISTS "Allow all for odometer_readings" ON odometer_readings;

-- Step 5: Create user-isolation policies for cars
CREATE POLICY "Users can manage their own cars"
ON cars FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public read access for shared cars (QR feature)
CREATE POLICY "Public can view shared cars"
ON cars FOR SELECT 
USING (public_share_enabled = true);

-- Step 6: Create user-isolation policies for maintenance_tasks
CREATE POLICY "Users can manage their own tasks"
ON maintenance_tasks FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public read access for tasks of shared cars
CREATE POLICY "Public can view tasks of shared cars"
ON maintenance_tasks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cars 
    WHERE cars.id = maintenance_tasks.car_id 
    AND cars.public_share_enabled = true
  )
);

-- Step 7: Create user-isolation policies for maintenance_records
CREATE POLICY "Users can manage their own records"
ON maintenance_records FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 8: Create user-isolation policies for documents
CREATE POLICY "Users can manage their own documents"
ON documents FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public read access for documents of shared cars
CREATE POLICY "Public can view documents of shared cars"
ON documents FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cars 
    WHERE cars.id = documents.car_id 
    AND cars.public_share_enabled = true
  )
);

-- Step 9: Create user-isolation policies for odometer_readings
CREATE POLICY "Users can manage their own readings"
ON odometer_readings FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public read access for odometer of shared cars
CREATE POLICY "Public can view odometer of shared cars"
ON odometer_readings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cars 
    WHERE cars.id = odometer_readings.car_id 
    AND cars.public_share_enabled = true
  )
);

-- Step 10: Add car_id foreign keys if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_tasks' AND column_name = 'car_id'
    ) THEN
        ALTER TABLE maintenance_tasks ADD COLUMN car_id BIGINT REFERENCES cars(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' AND column_name = 'car_id'
    ) THEN
        ALTER TABLE maintenance_records ADD COLUMN car_id BIGINT REFERENCES cars(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'car_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN car_id BIGINT REFERENCES cars(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'odometer_readings' AND column_name = 'car_id'
    ) THEN
        ALTER TABLE odometer_readings ADD COLUMN car_id BIGINT REFERENCES cars(id);
    END IF;
END $$;

-- Step 11: Create function to auto-set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create triggers for auto-setting user_id
DROP TRIGGER IF EXISTS set_cars_user_id ON cars;
CREATE TRIGGER set_cars_user_id
    BEFORE INSERT ON cars
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_tasks_user_id ON maintenance_tasks;
CREATE TRIGGER set_tasks_user_id
    BEFORE INSERT ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_records_user_id ON maintenance_records;
CREATE TRIGGER set_records_user_id
    BEFORE INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_documents_user_id ON documents;
CREATE TRIGGER set_documents_user_id
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_readings_user_id ON odometer_readings;
CREATE TRIGGER set_readings_user_id
    BEFORE INSERT ON odometer_readings
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- Done! 
-- Note: After running this, enable Email Auth in Supabase Dashboard:
-- Authentication > Providers > Email > Enable
