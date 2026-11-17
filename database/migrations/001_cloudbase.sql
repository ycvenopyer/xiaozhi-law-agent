-- Run once in the SQL editor of the NEW CloudBase PG environment.
-- Application records are individually versioned JSONB documents. A session
-- document contains its ordered messages; original file bytes live in Storage.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='storage' AND c.relname='objects' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'PG Storage RLS is not enabled; confirm this is a CloudBase PG environment';
  END IF;
END $$;

-- CloudBase environments can expose different auth ID types. Use the actual
-- referenced type; varchar cannot form a foreign key to a uuid primary key.
DO $create_records$
DECLARE auth_id_type text;
BEGIN
  SELECT pg_catalog.format_type(a.atttypid,a.atttypmod) INTO auth_id_type
    FROM pg_catalog.pg_attribute a
    WHERE a.attrelid='auth.users'::regclass AND a.attname='id'
      AND a.attnum > 0 AND NOT a.attisdropped;
  IF auth_id_type IS NULL THEN RAISE EXCEPTION 'auth.users.id is missing'; END IF;
  EXECUTE format($records_ddl$
CREATE TABLE public.user_records (
  owner_id %s NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sessions','dossiers','knowledge','deadlines','conflicts','settings','files')),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 200),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload ? 'id' AND payload->>'id' = id),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  generation_id text,
  generation_started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, kind, id),
  CHECK (octet_length(payload::text) <= 8388608)
);
$records_ddl$,auth_id_type);
END $create_records$;
CREATE INDEX user_records_updated ON public.user_records(owner_id, kind, updated_at DESC);
CREATE INDEX user_records_identity ON public.user_records((owner_id::text), kind, id);
ALTER TABLE public.user_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_records_read ON public.user_records FOR SELECT TO authenticated
  USING (owner_id::text = auth.uid()::text);
REVOKE ALL ON public.user_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_records TO authenticated;

-- Writes only through narrowly scoped RPCs: authenticated users cannot bypass
-- revision checks, forge ownership, or replace a running model generation.
CREATE FUNCTION public.put_user_record(p_kind text, p_id text, p_payload jsonb, p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid public.user_records.owner_id%TYPE := auth.uid(); result public.user_records;
BEGIN
  IF uid IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'login required' USING ERRCODE='42501'; END IF;
  IF p_revision = 0 THEN
    INSERT INTO public.user_records(owner_id,kind,id,payload)
      VALUES(uid,p_kind,p_id,p_payload) ON CONFLICT DO NOTHING RETURNING * INTO result;
  ELSE
    UPDATE public.user_records SET payload=p_payload, revision=revision+1,
      generation_id=NULL, generation_started_at=NULL, updated_at=now()
      WHERE owner_id=uid AND kind=p_kind AND id=p_id AND revision=p_revision
        AND (generation_id IS NULL OR generation_started_at < now()-interval '150 seconds')
      RETURNING * INTO result;
  END IF;
  IF result.id IS NULL THEN RAISE EXCEPTION 'revision conflict or generation running' USING ERRCODE='40001'; END IF;
  RETURN to_jsonb(result);
END $$;

CREATE FUNCTION public.delete_user_record(p_kind text,p_id text,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid public.user_records.owner_id%TYPE := auth.uid();
BEGIN
  IF uid IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'login required' USING ERRCODE='42501'; END IF;
  DELETE FROM public.user_records WHERE owner_id=uid AND kind=p_kind AND id=p_id AND revision=p_revision
    AND (generation_id IS NULL OR generation_started_at < now()-interval '150 seconds');
  IF NOT FOUND THEN RAISE EXCEPTION 'revision conflict' USING ERRCODE='40001'; END IF;
END $$;

CREATE FUNCTION public.begin_chat(p_id text,p_run text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid public.user_records.owner_id%TYPE := auth.uid(); result public.user_records;
BEGIN
  IF uid IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'login required' USING ERRCODE='42501'; END IF;
  UPDATE public.user_records SET generation_id=p_run,generation_started_at=now()
    WHERE owner_id=uid AND kind='sessions' AND id=p_id
      AND (generation_id IS NULL OR generation_started_at < now()-interval '150 seconds')
    RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'conversation missing or busy' USING ERRCODE='40001'; END IF;
  RETURN to_jsonb(result);
END $$;

CREATE FUNCTION public.finish_chat(p_id text,p_run text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid public.user_records.owner_id%TYPE := auth.uid(); result public.user_records;
BEGIN
  IF uid IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'login required' USING ERRCODE='42501'; END IF;
  UPDATE public.user_records SET payload=p_payload,revision=revision+1,
    generation_id=NULL,generation_started_at=NULL,updated_at=now()
    WHERE owner_id=uid AND kind='sessions' AND id=p_id AND generation_id=p_run
    RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'generation changed' USING ERRCODE='40001'; END IF;
  RETURN to_jsonb(result);
END $$;

REVOKE ALL ON FUNCTION public.put_user_record(text,text,jsonb,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_user_record(text,text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.begin_chat(text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.finish_chat(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.put_user_record(text,text,jsonb,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_record(text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_chat(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_chat(text,text,jsonb) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('private-files','private-files',false,4194304,ARRAY[
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain','text/markdown','text/csv','image/jpeg','image/png','image/webp'
]);

CREATE POLICY xiaozhi_files_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='private-files' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY xiaozhi_files_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='private-files' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY xiaozhi_files_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='private-files' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text)
  WITH CHECK (bucket_id='private-files' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY xiaozhi_files_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='private-files' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text);

-- Permissive policies combine with OR. This restrictive boundary also protects
-- this bucket if a pre-existing broad policy happens to allow other buckets.
CREATE POLICY xiaozhi_private_boundary ON storage.objects AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (bucket_id <> 'private-files' OR
    (auth.role()='authenticated' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text))
  WITH CHECK (bucket_id <> 'private-files' OR
    (auth.role()='authenticated' AND owner_id::text=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text));

COMMIT;
-- Do not add a broad authenticated/anonymous allow policy. PostgreSQL permissive
-- policies combine with OR. Review pg_policies on a reused environment first.
