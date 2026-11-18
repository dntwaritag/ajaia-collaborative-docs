import type { Client } from "@libsql/client";

/** Idempotent schema bootstrap. Safe to run on every deploy / start. */
export async function migrate(client: Client) {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id)`,
      `CREATE TABLE IF NOT EXISTS document_shares (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission TEXT NOT NULL CHECK (permission IN ('VIEWER','EDITOR')),
        created_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS shares_doc_user_idx ON document_shares(document_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS shares_user_idx ON document_shares(user_id)`,
    ],
    "write",
  );
}
