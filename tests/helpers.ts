import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDb } from "@/db/client";
import { migrate } from "@/db/migrate";
import { users } from "@/db/schema";

export async function testDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "ajaia-test-"));
  const { db, client } = createDb(`file:${path.join(dir, "test.db")}`);
  await migrate(client);
  const mk = async (id: string, email: string) => {
    await db.insert(users).values({ id, email, name: id, passwordHash: "x", createdAt: Date.now() });
    return id;
  };
  const owner = await mk("owner", "owner@example.com");
  const sarah = await mk("sarah", "sarah@example.com");
  const eve = await mk("eve", "eve@example.com");
  return { db, owner, sarah, eve };
}

export const RICH = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    { type: "paragraph", content: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }, { type: "text", text: " and " }, { type: "text", text: "underlined", marks: [{ type: "underline" }] }] },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item" }] }] }] },
  ],
};
