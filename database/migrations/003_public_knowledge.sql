BEGIN;
CREATE TABLE IF NOT EXISTS public.knowledge_catalog (
  id text PRIMARY KEY,
  position integer NOT NULL,
  entry jsonb NOT NULL CHECK (jsonb_typeof(entry) = 'object' AND entry ?& ARRAY['id','title','kind','content','category']
    AND entry->>'id' = id AND entry->>'kind' IN ('law','case'))
);
ALTER TABLE public.knowledge_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.knowledge_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.knowledge_catalog TO authenticated;
DROP POLICY IF EXISTS read_catalog ON public.knowledge_catalog;
CREATE POLICY read_catalog ON public.knowledge_catalog FOR SELECT TO authenticated USING (true);
CREATE OR REPLACE FUNCTION public.read_public_knowledge() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT coalesce(jsonb_agg(entry || '{"builtin":true}'::jsonb ORDER BY position,id),'[]'::jsonb)
  FROM public.knowledge_catalog
$$;
REVOKE ALL ON FUNCTION public.read_public_knowledge() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_public_knowledge() TO authenticated;
COMMIT;
