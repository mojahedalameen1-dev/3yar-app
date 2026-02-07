-- =====================================================
-- Admin RLS Verification & Enforcement Script
-- =====================================================

-- 1. Ensure is_admin() function exists and is correct
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant/Verify ALL permissions for admins on key tables

-- CARS
DROP POLICY IF EXISTS "Admins have full access to cars" ON cars;
CREATE POLICY "Admins have full access to cars"
ON cars FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- MAINTENANCE_TASKS
DROP POLICY IF EXISTS "Admins have full access to tasks" ON maintenance_tasks;
CREATE POLICY "Admins have full access to tasks"
ON maintenance_tasks FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- MAINTENANCE_RECORDS
DROP POLICY IF EXISTS "Admins have full access to records" ON maintenance_records;
CREATE POLICY "Admins have full access to records"
ON maintenance_records FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- DOCUMENTS
DROP POLICY IF EXISTS "Admins have full access to documents" ON documents;
CREATE POLICY "Admins have full access to documents"
ON documents FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- PROFILES (Users)
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles"
ON profiles FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ODOMETER_READINGS
DROP POLICY IF EXISTS "Admins have full access to readings" ON odometer_readings;
CREATE POLICY "Admins have full access to readings"
ON odometer_readings FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- SYSTEM_ANNOUNCEMENTS
DROP POLICY IF EXISTS "Admins can manage announcements" ON system_announcements;
CREATE POLICY "Admins can manage announcements"
ON system_announcements FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- DEFAULT_MAINTENANCE_TEMPLATES
DROP POLICY IF EXISTS "Admins can manage templates" ON default_maintenance_templates;
CREATE POLICY "Admins can manage templates"
ON default_maintenance_templates FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ACTIVITY_LOGS (View only mostly, but let's allow all for management if needed)
DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;
CREATE POLICY "Admins have full access to activity"
ON activity_logs FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Verify admin role exists in profiles
-- This query returns all admins directly for verification
SELECT * FROM profiles WHERE role = 'admin';
