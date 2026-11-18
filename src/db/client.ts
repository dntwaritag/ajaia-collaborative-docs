import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { migrate } from "./migrate";

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
      const url = process.env.DATABASE_URL || "file:./dev.db";
      const { db, client } = createDb(url, process.env.DATABASE_AUTH_TOKEN);
      await migrate(client);
      return db;
    })();
    g.__ajaiaDb.catch(() => {
      g.__ajaiaDb = undefined;
    });
  }
  return g.__ajaiaDb;
}
