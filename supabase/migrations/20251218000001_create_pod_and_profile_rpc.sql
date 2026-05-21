-- RPC function to atomically create a pod and profile for a user
-- Idempotent: if profile already exists, returns existing ids
CREATE OR REPLACE FUNCTION create_pod_and_profile(
  user_id UUID,
  user_display_name TEXT,
  user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  pod_id UUID,
  profile_id UUID
) AS $$
DECLARE
  v_pod_id UUID;
  v_profile_id UUID;
BEGIN
  -- Check if profile already exists (idempotency)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE id = user_id;

  IF v_profile_id IS NOT NULL THEN
    -- Profile exists, return existing ids
    SELECT pod_id INTO v_pod_id
    FROM profiles
    WHERE id = v_profile_id;

    RETURN QUERY SELECT v_pod_id, v_profile_id;
    RETURN;
  END IF;

  -- Profile doesn't exist, create new pod and profile
  -- Step 1: Create pod with NULL owner_profile_id (will update after profile creation)
  INSERT INTO pods (owner_profile_id, name, alias_status)
  VALUES (NULL, 'My Subscriptions', 'unverified')
  RETURNING id INTO v_pod_id;

  -- Step 2: Create profile with the pod_id
  INSERT INTO profiles (id, pod_id, display_name, email, timezone, currency, reminder_days_before)
  VALUES (
    user_id,
    v_pod_id,
    user_display_name,
    user_email,
    'America/Los_Angeles',
    'USD',
    7
  )
  RETURNING id INTO v_profile_id;

  -- Step 3: Update pod with owner_profile_id
  UPDATE pods
  SET owner_profile_id = v_profile_id
  WHERE id = v_pod_id;

  RETURN QUERY SELECT v_pod_id, v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
