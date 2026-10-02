import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
let db: PGlite;
const worker = "12345678-1234-1234-1234-123456789abc";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table news(id int, title text, slug text, excerpt text, content text, cover_image text,
      category text, tags text[], published_at timestamptz, updated_at timestamptz, status text,
      private_admin_note text);
    create table portfolio_items(id int, kind text, title text, title_id text, subtitle text,
      description text, description_id text, tag text, tag_id text, year text, platform text,
      image text, image_alt text, link text, extra_links jsonb, position int,
      is_published boolean, is_featured boolean, internal_budget int);
  `);
  await db.exec(
    await readFile("supabase/migrations/20261003_studio_sync.sql", "utf8"),
  );
}, 30000);
afterAll(async () => {
  await db.close();
});

describe("Durable published-content outbox", () => {
  it("marks edits transactionally and excludes drafts, future news and private fields", async () => {
    await db.exec(`
      insert into news(id,title,status,published_at,private_admin_note) values
        (1,'Public','published',now()-interval '1 day','secret'),
        (2,'Draft','draft',null,'secret draft'),
        (3,'Scheduled','published',now()+interval '1 day','secret future');
      insert into portfolio_items(id,title,is_published,internal_budget) values
        (1,'Visible',true,5000),(2,'Hidden',false,8000);
    `);
    const result = await db.query<{ result: any }>(
      "select claim_studio_sync($1::uuid) as result",
      [worker],
    );
    const { snapshot, version } = result.rows[0].result;
    expect(version).toBe(3);
    expect(snapshot.news.map((n: any) => n.title)).toEqual(["Public"]);
    expect(snapshot.portfolio.map((n: any) => n.title)).toEqual(["Visible"]);
    expect(JSON.stringify(snapshot)).not.toContain("secret");
    expect(JSON.stringify(snapshot)).not.toContain("internal_budget");
    expect(JSON.stringify(snapshot)).not.toContain("private_admin_note");
  });
  it("prevents a second worker from claiming an active lease", async () => {
    const r = await db.query<{ result: any }>(
      "select claim_studio_sync($1::uuid) as result",
      ["00000000-0000-0000-0000-000000000000"],
    );
    expect(r.rows[0].result).toBeNull();
  });
  it("retains changes made after snapshot capture as pending", async () => {
    await db.exec("update news set title='Changed' where id=1");
    await db.query("select finish_studio_sync($1::uuid, 3, $2, null)", [
      worker,
      "https://github.com/test/repo/commit/test",
    ]);
    const r = await db.query<any>("select * from studio_sync");
    expect(r.rows[0].version).toBe(4);
    expect(r.rows[0].synced_version).toBe(3);
    expect(r.rows[0].lease_token).toBeNull();
  });
  it("preserves the queue on failure and includes deletions in the next snapshot", async () => {
    await db.exec("delete from portfolio_items where id=1");
    const r = await db.query<{ result: any }>(
      "select claim_studio_sync($1::uuid) as result",
      [worker],
    );
    expect(r.rows[0].result.snapshot.portfolio).toEqual([]);
    await db.query("select finish_studio_sync($1::uuid, 5, null, $2)", [
      worker,
      "retry",
    ]);
    const status = await db.query<any>("select * from studio_sync");
    expect(status.rows[0].last_error).toBe("retry");
    expect(status.rows[0].synced_version).toBe(3);
  });
  it("forbids public access to sync data and worker RPCs", async () => {
    const r = await db.query<any>(`select
      has_table_privilege('anon','studio_sync','SELECT') as can_read,
      has_function_privilege('anon','claim_studio_sync(uuid)','EXECUTE') as can_claim,
      has_function_privilege('authenticated','finish_studio_sync(uuid,bigint,text,text)','EXECUTE') as can_finish`);
    expect(r.rows[0]).toEqual({
      can_read: false,
      can_claim: false,
      can_finish: false,
    });
  });
  it("recovers expired leases and ignores completion from an old worker", async () => {
    await db.query("select claim_studio_sync($1::uuid)", [worker]);
    await db.exec(
      "update studio_sync set lease_until=now()-interval '1 second'",
    );
    const nextWorker = "99999999-9999-9999-9999-999999999999";
    const r = await db.query<any>(
      "select claim_studio_sync($1::uuid) as result",
      [nextWorker],
    );
    expect(r.rows[0].result).not.toBeNull();
    await db.query("select finish_studio_sync($1::uuid, 999, null, null)", [
      worker,
    ]);
    const status = await db.query<any>("select * from studio_sync");
    expect(status.rows[0].lease_token).toBe(nextWorker);
    expect(status.rows[0].synced_version).toBe(3);
  });
});
