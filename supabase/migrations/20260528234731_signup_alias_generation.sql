-- Generate an opaque 8-char lowercase-alphanumeric alias token under
-- @inbound.subsounder.com. Enumeration-resistant by space size (36^8 ≈ 2.8T)
-- and per-byte crypto randomness from pgcrypto's gen_random_bytes.
CREATE OR REPLACE FUNCTION public.generate_alias_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  token text := '';
  bytes bytea;
  i int;
BEGIN
  bytes := gen_random_bytes(8);
  FOR i IN 0..7 LOOP
    token := token || substr(alphabet, (get_byte(bytes, i) % 36) + 1, 1);
  END LOOP;
  RETURN token || '@inbound.subsounder.com';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pod_and_profile(
  user_id uuid,
  user_display_name text,
  user_email text DEFAULT NULL::text
)
RETURNS TABLE (pod_id uuid, profile_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pod_id UUID;
  v_profile_id UUID;
  v_alias TEXT;
  v_attempts INT := 0;
BEGIN
  SELECT profiles.id INTO v_profile_id
  FROM profiles
  WHERE profiles.id = user_id;

  IF v_profile_id IS NOT NULL THEN
    SELECT profiles.pod_id INTO v_pod_id
    FROM profiles
    WHERE profiles.id = v_profile_id;
    RETURN QUERY SELECT v_pod_id, v_profile_id;
    RETURN;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_alias := public.generate_alias_token();
    BEGIN
      INSERT INTO pods (owner_profile_id, name, alias_status, alias_email)
      VALUES (NULL, 'My Subscriptions', 'unverified', v_alias)
      RETURNING id INTO v_pod_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'create_pod_and_profile: failed to generate unique alias after 5 attempts';
      END IF;
    END;
  END LOOP;

  INSERT INTO profiles (id, pod_id, display_name, email, timezone, currency, reminder_days_before, auth_user_id)
  VALUES (
    user_id, v_pod_id, user_display_name, user_email,
    'America/Los_Angeles', 'USD', 7, user_id
  )
  RETURNING id INTO v_profile_id;

  UPDATE pods SET owner_profile_id = v_profile_id WHERE id = v_pod_id;

  RETURN QUERY SELECT v_pod_id, v_profile_id;
END;
$$;