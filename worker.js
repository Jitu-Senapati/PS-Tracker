import { DurableObject } from "cloudflare:workers";

const J = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// One small database that holds the shared investor book.
export class BookDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, data TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS people (name TEXT PRIMARY KEY, pos INTEGER)");
    const n = this.sql.exec("SELECT COUNT(*) AS c FROM people").one().c;
    if (n === 0) ["Chinu", "Jitu", "Goat"].forEach((p, i) => this.sql.exec("INSERT OR IGNORE INTO people VALUES (?, ?)", p, i));
  }

  async fetch(request) {
    const parts = new URL(request.url).pathname.split("/").filter(Boolean); // api, book, ...
    const m = request.method, sub = parts[2];

    if (m === "GET" && !sub) {
      const people = this.sql.exec("SELECT name FROM people ORDER BY pos, name").toArray().map(r => r.name);
      const entries = this.sql.exec("SELECT data FROM entries").toArray().map(r => JSON.parse(r.data));
      return J({ people, entries });
    }
    if (m === "PUT" && sub === "entry") {
      const e = await request.json().catch(() => null);
      if (!e || typeof e.id !== "string" || e.id.length > 40 || typeof e.who !== "string" || e.who.length > 60)
        return J({ error: "bad entry" }, 400);
      const data = JSON.stringify(e);
      if (data.length > 2000) return J({ error: "too big" }, 400);
      this.sql.exec("INSERT INTO entries (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data", e.id, data);
      return J({ ok: true });
    }
    if (m === "DELETE" && sub === "entry" && parts[3]) {
      this.sql.exec("DELETE FROM entries WHERE id = ?", decodeURIComponent(parts[3]));
      return J({ ok: true });
    }
    if (m === "POST" && sub === "people") {
      const b = await request.json().catch(() => null);
      const name = b && typeof b.name === "string" ? b.name.trim() : "";
      if (!name || name.length > 60) return J({ error: "bad name" }, 400);
      const pos = this.sql.exec("SELECT COALESCE(MAX(pos), -1) + 1 AS p FROM people").one().p;
      this.sql.exec("INSERT OR IGNORE INTO people VALUES (?, ?)", name, pos);
      return J({ ok: true });
    }
    return J({ error: "not found" }, 404);
  }
}

const same = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!env.BOOK_KEY) return J({ error: "BOOK_KEY is not set" }, 503);
    if (!same(request.headers.get("x-book-key") || "", env.BOOK_KEY)) return J({ error: "unauthorized" }, 401);
    return env.BOOK.get(env.BOOK.idFromName("main")).fetch(request);
  },
};
