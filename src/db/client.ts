import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { migrate } from "./migrate";
import { users } from "./schema";
import { seedUsers } from "@/lib/seed";

export type Db = LibSQLDatabase<typeof schema>;

export function createDb(url: string, authToken?: string): { db: Db; client: Client } {
  const client = createClient({ url, authToken: authToken || undefined });
  return { db: drizzle(client, { schema }), client };
}

const g = globalThis as unknown as { __ajaiaDb?: Promise<Db> };

/** Shared app database. Creates tables on first use so a fresh deploy just works. */
export function getDb(): Promise<Db> {
  if (!g.__ajaiaDb) {
    g.__ajaiaDb = (async () => {
      // TURSO_* names are what Vercel's Turso integration creates.
      const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./dev.db";
      const token = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
      const { db, client } = createDb(url, token);
      await migrate(client);
      // First start on an empty database: create the demo accounts so reviewers can sign in.
      const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
      if (!anyUser) await seedUsers(db).catch(() => {}); // tolerate a concurrent cold start seeding at the same time
      return db;
    })();
    g.__ajaiaDb.catch(() => {
      g.__ajaiaDb = undefined;
    });
  }
  return g.__ajaiaDb;
}
