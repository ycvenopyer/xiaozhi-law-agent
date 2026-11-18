BEGIN;
CREATE SCHEMA IF NOT EXISTS xiaozhi_private;
REVOKE ALL ON SCHEMA xiaozhi_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS xiaozhi_private.login_config (
  singleton boolean PRIMARY KEY CHECK (singleton), lookup_key uuid NOT NULL DEFAULT gen_random_uuid()
);
INSERT INTO xiaozhi_private.login_config(singleton) VALUES (true) ON CONFLICT DO NOTHING;
DO $ddl$
DECLARE owner_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO STRICT owner_type FROM pg_attribute
  WHERE attrelid='auth.users'::regclass AND attname='id' AND NOT attisdropped;
  EXECUTE format('CREATE TABLE IF NOT EXISTS xiaozhi_private.login_names (
    owner_id %s PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text COLLATE "C" NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 256)
  )', owner_type);
END $ddl$;
REVOKE ALL ON ALL TABLES IN SCHEMA xiaozhi_private FROM PUBLIC, anon, authenticated;

-- Preserve existing native usernames without storing credentials or duplicating emails.
WITH profiles AS (
  SELECT u.id, nullif(to_jsonb(u)->>'username','') AS native_name,
    coalesce(nullif(to_jsonb(u)#>>'{user_metadata,username}',''),
             nullif(to_jsonb(u)#>>'{raw_user_meta_data,username}','')) AS metadata_name
  FROM auth.users u
), candidates AS (
  SELECT id, coalesce(native_name, metadata_name) COLLATE "C" AS name,
    native_name IS NOT NULL AS native FROM profiles
), ranked AS (
  SELECT *, count(*) OVER (PARTITION BY name) AS matches,
    count(*) FILTER (WHERE native) OVER (PARTITION BY name) AS native_matches
  FROM candidates WHERE char_length(name) BETWEEN 1 AND 256
)
INSERT INTO xiaozhi_private.login_names(owner_id,name)
SELECT id, name FROM ranked
WHERE (matches=1 OR (native AND native_matches=1))
  AND NOT EXISTS (SELECT 1 FROM xiaozhi_private.login_names n WHERE n.owner_id=ranked.id)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.my_login_name() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT coalesce((SELECT name FROM xiaozhi_private.login_names WHERE owner_id::text=auth.uid()::text), '')
$$;
CREATE OR REPLACE FUNCTION public.set_login_name(p_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE uid xiaozhi_private.login_names.owner_id%TYPE := auth.uid();
BEGIN
  IF uid IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'login required' USING ERRCODE='42501';
  END IF;
  IF p_name IS NULL OR char_length(p_name) NOT BETWEEN 1 AND 256 OR
     p_name COLLATE "C" ~ '[^A-Za-z0-9〇㐀-䶿一-鿿﨎-﨏﨑﨓-﨔﨟﨡﨣-﨤﨧-﨩𠀀-𪛟𪜀-𫠝𫠠-𬺭𬺰-𮯠𮯰-𮹝𰀀-𱍊𱍐-𳑹]' THEN
    RAISE EXCEPTION 'invalid login name' USING ERRCODE='22023';
  END IF;
  INSERT INTO xiaozhi_private.login_names(owner_id,name) VALUES(uid,p_name)
  ON CONFLICT(owner_id) DO UPDATE SET name=EXCLUDED.name;
  RETURN p_name;
END $$;

-- The pre-login endpoint can resolve one exact name only with its server-side secret.
CREATE OR REPLACE FUNCTION public.resolve_login_name(p_name text,p_key text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM xiaozhi_private.login_config WHERE lookup_key::text=p_key)
  THEN RAISE EXCEPTION 'invalid lookup key' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_build_object('owner',u.id::text,'login',coalesce(nullif(to_jsonb(u)->>'email',''),
    nullif(to_jsonb(u)->>'username',''),nullif(to_jsonb(u)#>>'{user_metadata,username}',''),
    nullif(to_jsonb(u)#>>'{raw_user_meta_data,username}','')))
    FROM xiaozhi_private.login_names n JOIN auth.users u ON u.id=n.owner_id
    WHERE n.name=p_name COLLATE "C"), '{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.my_login_name(), public.set_login_name(text), public.resolve_login_name(text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_login_name(), public.set_login_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_login_name(text,text) TO anon;
COMMIT;
