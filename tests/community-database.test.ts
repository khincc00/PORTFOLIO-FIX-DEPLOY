import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean);
    create table public.site_users(id serial primary key, username text);
    insert into public.site_users(username) values ('a'),('b');
  `);
  await db.exec(await readFile("supabase/migrations/20261004_community.sql", "utf8"));
  await db.exec(`insert into public.community_posts(user_id,title) values (1,'Halo dunia');`);
}, 30000);
afterAll(async () => { await db.close(); });

const score = async (table: string, id = 1) =>
  (await db.query<{ score: number }>(`select score from public.${table} where id=$1`, [id])).rows[0].score;

describe("Komunitas: trigger database", () => {
  it("menjumlahkan vote, mengubah vote, dan menghapusnya", async () => {
    await db.exec("insert into community_votes values (1,'post',1,1),(2,'post',1,1)");
    expect(await score("community_posts")).toBe(2);
    await db.exec("update community_votes set value=-1 where user_id=2");
    expect(await score("community_posts")).toBe(0);
    await db.exec("delete from community_votes where user_id=1");
    expect(await score("community_posts")).toBe(-1);
  });
  it("menghitung komentar dan skor komentar", async () => {
    await db.exec("insert into community_comments(post_id,user_id,body) values (1,1,'x'),(1,2,'y')");
    const c = await db.query<{ comment_count: number }>("select comment_count from community_posts where id=1");
    expect(c.rows[0].comment_count).toBe(2);
    await db.exec("insert into community_votes values (2,'comment',1,1)");
    expect(await score("community_comments")).toBe(1);
  });
  it("menolak vote selain +1/-1 dan satu vote ganda", async () => {
    await expect(db.exec("insert into community_votes values (1,'post',1,5)")).rejects.toThrow();
    await expect(db.exec("insert into community_votes values (2,'post',1,1)")).rejects.toThrow();
  });
  it("menghapus kiriman membersihkan komentar, vote, dan laporan", async () => {
    await db.exec("insert into community_reports(user_id,target_type,target_id) values (1,'post',1)");
    await db.exec("delete from community_posts where id=1");
    for (const t of ["community_comments", "community_votes", "community_reports"]) {
      expect((await db.query(`select 1 from ${t}`)).rows.length).toBe(0);
    }
  });
  it("membatasi judul dan jumlah gambar", async () => {
    await expect(db.exec("insert into community_posts(user_id,title) values (1,'ab')")).rejects.toThrow();
    await expect(db.exec(`insert into community_posts(user_id,title,images) values (1,'Judul','{a,b,c,d,e}')`)).rejects.toThrow();
  });
});
