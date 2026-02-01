-- Function to get maintenance tasks for a shared car using the share token
-- This function runs with SECURITY DEFINER, meaning it bypasses RLS restrictions
-- but securely checks logic internally (only returns-- دالة لجلب المهام بشكل آمن ومباشر للسيارات المشتركة
-- Modified to accept TEXT to prevent type errors, casting to UUID internally
CREATE OR REPLACE FUNCTION get_public_maintenance_tasks(p_token text)
RETURNS SETOF maintenance_tasks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_car_id bigint;
  v_uuid_token uuid;
BEGIN
  -- Attempt to cast text to uuid
  BEGIN
    v_uuid_token := p_token::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If invalid UUID, return empty result immediately
    RETURN;
  END;

  -- التحقق من السيارة
  SELECT id INTO v_car_id
  FROM cars
  WHERE share_token = v_uuid_token
  AND public_share_enabled = true;

  -- إذا لم توجد سيارة عامة بهذا الرابط، توقف
  IF v_car_id IS NULL THEN
    RETURN;
  END IF;

  -- إرجاع المهام
  RETURN QUERY
  SELECT *
  FROM maintenance_tasks
  WHERE car_id = v_car_id
  ORDER BY created_at DESC;
END;
$$;

-- السماح للزوار باستخدام الدالة
GRANT EXECUTE ON FUNCTION get_public_maintenance_tasks(text) TO anon;
