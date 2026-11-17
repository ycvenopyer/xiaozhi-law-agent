-- Read-only baseline checks. Run ROLLBACK; separately first if a migration failed.
-- No business rows, credentials or user identities are returned.
-- All checks passing means core objects/flags are present; it does not replace
-- live two-account isolation, login, persistence and private-file tests.
WITH checks(ord, item, ok) AS (
  SELECT 1, 'user_records table', EXISTS (
    SELECT 1 FROM pg_class WHERE oid=to_regclass('public.user_records') AND relkind IN ('r','p'))
  UNION ALL SELECT 2, 'required record columns', (
    SELECT count(*)=8 FROM pg_attribute
    WHERE attrelid=to_regclass('public.user_records') AND attnum>0 AND NOT attisdropped
      AND attname IN ('owner_id','kind','id','payload','revision','generation_id','generation_started_at','updated_at'))
  UNION ALL SELECT 3, 'owner ID matches auth.users.id', EXISTS (
    SELECT 1 FROM pg_attribute own_col JOIN pg_attribute auth_col
      ON own_col.atttypid=auth_col.atttypid AND own_col.atttypmod=auth_col.atttypmod
    WHERE own_col.attrelid=to_regclass('public.user_records') AND own_col.attname='owner_id'
      AND auth_col.attrelid=to_regclass('auth.users') AND auth_col.attname='id'
      AND NOT own_col.attisdropped AND NOT auth_col.attisdropped)
  UNION ALL SELECT 4, 'owner foreign key to auth.users', EXISTS (
    SELECT 1 FROM pg_constraint fk
    JOIN pg_attribute own_col ON own_col.attrelid=fk.conrelid AND own_col.attname='owner_id'
    JOIN pg_attribute auth_col ON auth_col.attrelid=fk.confrelid AND auth_col.attname='id'
    WHERE fk.conrelid=to_regclass('public.user_records') AND fk.contype='f' AND fk.convalidated
      AND fk.confrelid=to_regclass('auth.users') AND fk.conkey=ARRAY[own_col.attnum]
      AND fk.confkey=ARRAY[auth_col.attnum] AND fk.confdeltype='c')
  UNION ALL SELECT 5, 'business row level security', (
    SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.user_records'))
  UNION ALL SELECT 6, 'own_records_read policy exists', EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_records'
      AND policyname='own_records_read' AND cmd='SELECT' AND 'authenticated'=ANY(roles))
  UNION ALL SELECT 7, 'authenticated read only / anon no access',
    has_table_privilege('authenticated',to_regclass('public.user_records'),'SELECT')
    AND NOT has_table_privilege('authenticated',to_regclass('public.user_records'),'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    AND NOT has_table_privilege('anon',to_regclass('public.user_records'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  UNION ALL SELECT 8, 'put_user_record RPC', EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.put_user_record(text,text,jsonb,integer)')
      AND prosecdef AND has_function_privilege('authenticated',oid,'EXECUTE') AND NOT has_function_privilege('anon',oid,'EXECUTE'))
  UNION ALL SELECT 9, 'delete_user_record RPC', EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.delete_user_record(text,text,integer)')
      AND prosecdef AND has_function_privilege('authenticated',oid,'EXECUTE') AND NOT has_function_privilege('anon',oid,'EXECUTE'))
  UNION ALL SELECT 10, 'begin_chat RPC', EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.begin_chat(text,text)')
      AND prosecdef AND has_function_privilege('authenticated',oid,'EXECUTE') AND NOT has_function_privilege('anon',oid,'EXECUTE'))
  UNION ALL SELECT 11, 'finish_chat RPC', EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.finish_chat(text,text,jsonb)')
      AND prosecdef AND has_function_privilege('authenticated',oid,'EXECUTE') AND NOT has_function_privilege('anon',oid,'EXECUTE'))
  UNION ALL SELECT 12, 'private-files bucket is private / 4 MiB limit', EXISTS (
    SELECT 1 FROM storage.buckets WHERE id='private-files' AND public=false AND file_size_limit=4194304)
  UNION ALL SELECT 13, 'storage row level security', (
    SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('storage.objects'))
  UNION ALL SELECT 14, 'four file access policies exist', (
    SELECT count(*)=4 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN ('xiaozhi_files_read','xiaozhi_files_insert','xiaozhi_files_update','xiaozhi_files_delete'))
  UNION ALL SELECT 15, 'private bucket restrictive boundary exists', EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='xiaozhi_private_boundary' AND permissive='RESTRICTIVE' AND cmd='ALL')
)
SELECT ord AS step, item, CASE WHEN coalesce(ok,false) THEN 'PASS' ELSE 'CHECK' END AS status
FROM checks ORDER BY ord;
