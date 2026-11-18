import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'

// Real PostgreSQL/WASM exercises the migration and policies. Only platform-owned
// auth/storage schemas are stubbed; this does not replace CloudBase live tests.
const schemas = [
  { name: 'legacy text IDs', idType: 'varchar(64)', uidType: 'text', storageType: 'text', uuidIds: false },
  { name: 'UUID auth IDs and text helper', idType: 'uuid', uidType: 'text', storageType: 'text', uuidIds: true },
  { name: 'UUID auth IDs, helper and storage', idType: 'uuid', uidType: 'uuid', storageType: 'uuid', uuidIds: true },
  { name: 'text auth IDs and UUID helper', idType: 'varchar(64)', uidType: 'uuid', storageType: 'uuid', uuidIds: true },
];

for (const schema of schemas) {
test(`CloudBase SQL migration: ${schema.name}`, async t => {
  const userA = schema.uuidIds ? '11111111-1111-4111-8111-111111111111' : 'legacy-a';
  const userB = schema.uuidIds ? '22222222-2222-4222-8222-222222222222' : 'legacy-b';
  const db = await PGlite.create()
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id ${schema.idType} PRIMARY KEY,email text, user_metadata jsonb);
      INSERT INTO auth.users VALUES ('${userA}','a@example.test','{"username":"ycvenopyer"}'),('${userB}','b@example.test','{}');
      CREATE FUNCTION auth.uid() RETURNS ${schema.uidType} LANGUAGE sql STABLE AS
        $$ SELECT (current_setting('request.jwt.claims',true)::jsonb->>'sub')::${schema.uidType} $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
        $$ SELECT current_setting('request.jwt.claims',true)::jsonb->>'role' $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated;
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id text PRIMARY KEY,bucket_id text REFERENCES storage.buckets(id),name text,owner_id ${schema.storageType});
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
        $$ SELECT string_to_array(name,'/') $$;
      GRANT USAGE ON SCHEMA storage TO anon,authenticated;
      GRANT ALL ON storage.objects,storage.buckets TO anon,authenticated;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY preexisting_broad_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
    `)
    const checkSql = await readFile(new URL('../database/check_cloudbase.sql', import.meta.url), 'utf8')
    const beforeMigration = await db.query<{ item: string; status: string }>(checkSql)
    await db.exec(await readFile(new URL('../database/migrations/001_cloudbase.sql', import.meta.url), 'utf8'))

    await t.test('read-only deployment checks distinguish incomplete and provisioned schemas', async () => {
      assert.equal(beforeMigration.rows.find(row => row.item === 'user_records table')?.status, 'CHECK')
      const ready = await db.query<{ item: string; status: string }>(checkSql)
      assert.equal(ready.rows.length, 15)
      assert.deepEqual(ready.rows.filter(row => row.status !== 'PASS'), [])
      await db.exec('BEGIN; REVOKE EXECUTE ON FUNCTION public.begin_chat(text,text) FROM authenticated;')
      try {
        const partial = await db.query<{ item: string; status: string }>(checkSql)
        assert.equal(partial.rows.find(row => row.item === 'begin_chat RPC')?.status, 'CHECK')
      } finally { await db.exec('ROLLBACK;') }
    })

    async function login(id: string | null, role = 'authenticated') {
      await db.exec('RESET ROLE')
      await db.query('SELECT set_config($1,$2,false)', ['request.jwt.claims', JSON.stringify({ sub: id, role })])
      await db.exec(`SET ROLE ${role === 'anon' ? 'anon' : 'authenticated'}`)
    }
    async function put(kind: string, id: string, payload: object, revision: number) {
      const result = await db.query<{ row: { revision: number } }>('SELECT public.put_user_record($1,$2,$3::jsonb,$4) AS row', [kind,id,JSON.stringify(payload),revision])
      return result.rows[0].row
    }
    await t.test('users can only read their own business records', async () => {
      await login(userA)
      assert.equal((await put('sessions','conversation',{ id:'conversation',messages:[] },0)).revision,1)
      await login(userB)
      assert.equal((await db.query('SELECT * FROM public.user_records')).rows.length,0)
      await assert.rejects(put('sessions','conversation',{ id:'conversation',messages:['attack'] },1), /revision conflict/)
      await assert.rejects(db.exec(`UPDATE public.user_records SET owner_id='${userB}'`), /permission denied/)
      await login(null,'anon')
      await assert.rejects(db.query('SELECT * FROM public.user_records'), /permission denied/)
      await assert.rejects(put('settings','privacy',{ id:'privacy',externalModels:true },0), /permission denied/)
    })
    await t.test('stale writes cannot overwrite or delete newer data', async () => {
      await login(userA)
      assert.equal((await put('sessions','conversation',{ id:'conversation',messages:['new'] },1)).revision,2)
      await assert.rejects(put('sessions','conversation',{ id:'conversation',messages:['stale'] },1), /revision conflict/)
      await assert.rejects(db.query(`SELECT public.delete_user_record('sessions','conversation',1)`), /revision conflict/)
      const result = await db.query<{ payload: { messages: string[] } }>('SELECT payload FROM public.user_records')
      assert.deepEqual(result.rows[0].payload.messages,['new'])
    })
    await t.test('running generation rejects edits and stale completion', async () => {
      await db.query(`SELECT public.begin_chat('conversation','run-a')`)
      await assert.rejects(put('sessions','conversation',{ id:'conversation',messages:[] },2), /revision conflict/)
      await assert.rejects(db.query(`SELECT public.begin_chat('conversation','run-b')`), /busy/)
      await login(userB)
      await assert.rejects(db.query(`SELECT public.finish_chat('conversation','run-a','{"id":"conversation"}')`), /generation changed/)
      await login(userA)
      await assert.rejects(db.query(`SELECT public.finish_chat('conversation','run-b','{"id":"conversation"}')`), /generation changed/)
      await db.query(`SELECT public.finish_chat('conversation','run-a','{"id":"conversation","messages":["answer"]}')`)
      assert.equal((await put('sessions','conversation',{ id:'conversation',messages:['updated'] },3)).revision,4)
    })
    await t.test('record IDs cannot be forged inside the document', async () => {
      await assert.rejects(put('sessions','other',{ id:'mismatch' },0), /check constraint/)
    })
    await t.test('private storage enforces owner and path despite a broad permissive policy', async () => {
      await db.query(`INSERT INTO storage.objects VALUES('file-a','private-files','${userA}/original.pdf','${userA}')`)
      assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1)
      await login(userB)
      assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0)
      await assert.rejects(db.query(`INSERT INTO storage.objects VALUES('attack','private-files','${userA}/attack.pdf','${userB}')`), /row-level security/)
      await assert.rejects(db.query(`INSERT INTO storage.objects VALUES('attack','private-files','${userB}/attack.pdf','${userA}')`), /row-level security/)
      await db.query(`INSERT INTO storage.objects VALUES('file-b','private-files','${userB}/original.pdf','${userB}')`)
      assert.equal((await db.query(`UPDATE storage.objects SET name='${userB}/stolen.pdf' WHERE id='file-a' RETURNING id`)).rows.length,0)
      assert.equal((await db.query(`DELETE FROM storage.objects WHERE id='file-a' RETURNING id`)).rows.length,0)
      await login(null,'anon')
      assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0)
    })
    await t.test('exact login names, public catalog and private additions survive upgrades', async () => {
      await db.exec('RESET ROLE')
      const files = await Promise.all(['migrations/002_login_names.sql', 'migrations/003_public_knowledge.sql', 'seeds/public_knowledge.sql']
        .map(path => readFile(new URL('../database/' + path, import.meta.url), 'utf8')))
      for (const sql of files) await db.exec(sql)
      const lookup = (await db.query<{lookup_key: string}>('SELECT lookup_key FROM xiaozhi_private.login_config')).rows[0].lookup_key
      const name = async () => (await db.query<{name: string}>('SELECT public.my_login_name() AS name')).rows[0].name
      const assign = (value: string) => db.query('SELECT public.set_login_name($1)', [value])
      const resolve = async (value: string, key = lookup) => (await db.query<{target: {owner?: string}}>(
        'SELECT public.resolve_login_name($1,$2) AS target', [value,key])).rows[0].target.owner
      await login(userA)
      assert.equal(await name(), 'ycvenopyer')
      await login(userB)
      assert.equal(await name(), '')
      for (const value of ['yc', '知yc', 'yc知', '7', '𠀀'.repeat(256)]) await assign(value)
      for (const value of ['', '𠀀'.repeat(257), 'a b', 'a%', 'y_c', '🙂']) {
        await assert.rejects(assign(value), {code: '22023'})
      }
      await assign('yc')
      await login(userA)
      await assert.rejects(assign('yc'), {code: '23505'})
      assert.equal(await name(), 'ycvenopyer')
      await assign('YC')
      await login(null, 'anon')
      await assert.rejects(db.query('SELECT * FROM xiaozhi_private.login_config'), {code:'42501'})
      await assert.rejects(assign('abc'), {code:'42501'})
      await assert.rejects(resolve('YC','wrong'), {code:'42501'})
      assert.equal(await resolve('YC'), userA)
      assert.equal(await resolve('yc'), userB)
      for (const value of ['Yc','y','ycvenopyer']) assert.equal(await resolve(value), undefined)
      await assert.rejects(db.query('SELECT public.read_public_knowledge()'), {code:'42501'})
      const catalog = async () => (await db.query<{items: {id: string; official?: object; kind: string}[]}>(
        'SELECT public.read_public_knowledge() AS items')).rows[0].items
      await login(userA)
      const items = await catalog()
      assert.equal(new Set(items.map(item => item.id)).size,158)
      assert.equal(items.filter(item => item.official).length,144)
      assert.equal(items.filter(item => item.kind === 'case').length,6)
      await assert.rejects(db.exec('DELETE FROM public.knowledge_catalog'), {code:'42501'})
      const privateRows = async () => (await db.query("SELECT id FROM public.user_records WHERE kind='knowledge'")).rows
      await put('knowledge','private-a',{id:'private-a',title:'私有案例'},0)
      await login(userB)
      assert.deepEqual(await catalog(),items)
      assert.deepEqual(await privateRows(),[])
      await put('knowledge','private-b',{id:'private-b',title:'私有法条'},0)
      await login(userA)
      assert.deepEqual(await privateRows(),[{id:'private-a'}])
      await db.exec('RESET ROLE')
      await db.query("UPDATE public.knowledge_catalog SET entry=jsonb_set(entry,'{title}',to_jsonb('管理员修订'::text)) WHERE id=$1",[items[0].id])
      for (const sql of files) await db.exec(sql)
      await login(userA)
      assert.equal(await name(),'YC')
      assert.equal((await catalog()).length,158)
      assert.equal((await db.query<{title:string}>("SELECT entry->>'title' AS title FROM public.knowledge_catalog WHERE id=$1",[items[0].id])).rows[0].title,'管理员修订')
      assert.deepEqual(await privateRows(),[{id:'private-a'}])
    })
    await t.test('owner foreign key uses the auth column type and preserves account deletion cascade', async () => {
      await db.exec('RESET ROLE');
      const actual = await db.query<{ same_type: boolean }>(`SELECT a.atttypid=b.atttypid AS same_type
        FROM pg_attribute a CROSS JOIN pg_attribute b
        WHERE a.attrelid='public.user_records'::regclass AND a.attname='owner_id'
          AND b.attrelid='auth.users'::regclass AND b.attname='id'`);
      assert.equal(actual.rows[0].same_type,true);
      await db.query('DELETE FROM auth.users WHERE id=$1',[userA]);
      assert.equal((await db.query('SELECT * FROM public.user_records WHERE owner_id=$1',[userA])).rows.length,0);
    })
  } finally { await db.close() }
})
}
