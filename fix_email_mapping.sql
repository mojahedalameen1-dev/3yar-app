-- =====================================================
-- Fix User Emails Mapping
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Ensure email column exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create a function to validly sync emails from auth.users to profiles
-- This requires SECURITY DEFINER to access auth.users
CREATE OR REPLACE FUNCTION sync_user_emails()
RETURNS VOID AS $$
BEGIN
    -- Update profiles with email from auth.users
    UPDATE profiles
    SET email = users.email
    FROM auth.users
    WHERE profiles.user_id = users.id
    AND profiles.email IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Run the sync immediately
SELECT sync_user_emails();

-- 4. Create a trigger to keep email in sync for new users (if not handled by app)
CREATE OR REPLACE FUNCTION handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET email = NEW.email
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users update (if email changes)
DROP TRIGGER IF EXISTS on_auth_user_email_update ON auth.users;
CREATE TRIGGER on_auth_user_email_update
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_email_sync();
