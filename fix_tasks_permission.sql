-- Enable RLS on the table (ensure it's on)
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone (including public/anon) to READ tasks 
-- IF the car they belong to has public sharing enabled.
CREATE POLICY "Public view of maintenance tasks"
ON maintenance_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cars
    WHERE cars.id = maintenance_tasks.car_id
    AND cars.public_share_enabled = true
  )
);

-- Ensure the 'anon' role (public visitors) can use this policy
GRANT SELECT ON maintenance_tasks TO anon;
