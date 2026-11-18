import { writeFileSync } from 'node:fs'
import { publicSeed } from './knowledge-seed'

const json = JSON.stringify(publicSeed, null, 2)
if (json.includes('$catalog$')) throw new Error('SQL literal delimiter occurs in the seed.')
const sql = `-- Generated from the reviewed public catalog by scripts/write-knowledge-seed.ts.
-- Re-running initialization preserves administrator edits and all user records.
BEGIN;
INSERT INTO public.knowledge_catalog(id, position, entry)
SELECT item->>'id', n, item FROM jsonb_array_elements($catalog$
${json}
$catalog$::jsonb) WITH ORDINALITY AS source(item,n)
ON CONFLICT (id) DO NOTHING;
COMMIT;
`
writeFileSync(new URL('../database/seeds/public_knowledge.sql', import.meta.url), sql)
