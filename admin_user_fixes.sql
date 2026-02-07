-- =====================================================
-- Iyar Control Tower - REAL User Management Script
-- Run this in Supabase SQL Editor to enable Add/Delete Users
-- =====================================================

-- 1. Create a function to delete a user entirely (Auth + Profile + Data)
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
    END IF;

    -- Delete from related tables (though CASCADE should handle it, this is safer)
    DELETE FROM maintenance_records WHERE user_id = target_user_id;
    DELETE FROM maintenance_tasks WHERE user_id = target_user_id;
    DELETE FROM cars WHERE user_id = target_user_id;
    DELETE FROM documents WHERE user_id = target_user_id;
    DELETE FROM odometer_readings WHERE user_id = target_user_id;
    DELETE FROM profiles WHERE user_id = target_user_id;
    
    -- NOTE: auth.users deletion cannot be done via SECURITY DEFINER plpgsql easily 
    -- in all Supabase versions without the service role. 
    -- We suggest doing it in the Dashboard for now, OR using the Management API.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to add a user (Profile only for now, Auth must be dashboard)
-- OR: Simplified "Add User Profile"
CREATE OR REPLACE FUNCTION create_user_profile_admin(
    new_user_id UUID,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'user'
)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO profiles (user_id, first_name, last_name, phone, email, role)
    VALUES (new_user_id, first_name, last_name, phone, email, role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Policy Fix: Ensure Admins can actually delete from profiles
-- Use a more direct check to avoid recursion
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles"
ON profiles FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin'
    )
);
