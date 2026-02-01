-- 1. Allow public (anon) to explicitly query cars that are shared
-- This is crucial for the "maintenance_tasks" policy to work, 
-- because it needs to "look up" the car to check if it's shared.
CREATE POLICY "Public Read Shared Cars"
ON cars
FOR SELECT
TO anon
USING (public_share_enabled = true);

-- 2. (Optional backup) Ensure 'anon' acts as a verified role for reading permissions
GRANT SELECT ON cars TO anon;

-- Note: The previous policy on maintenance_tasks is correct, 
-- but it failed because it couldn't 'see' the car record inside the database check.
-- Running this script fixes that 'blind spot'.
