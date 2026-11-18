import { describe, it, expect, beforeEach } from "vitest";
import { createDocument, deleteDocument, getDocument, listDocuments, listShares, revokeShare, shareDocument, updateDocument } from "@/lib/documents";
import { ServiceError } from "@/lib/errors";
import { RICH, testDb } from "./helpers";

let t: Awaited<ReturnType<typeof testDb>>;
beforeEach(async () => { t = await testDb(); });

const code = async (p: Promise<unknown>) => { try { await p; return "OK"; } catch (e) { return (e as ServiceError).code; } };

describe("documents", () => {
  it("creates a document with a default title and empty doc", async () => {
    const d = await createDocument(t.db, t.owner, {});
    expect(d.title).toBe("Untitled document");
    expect(d.access).toBe("OWNER");
    expect((d.content as { type: string }).type).toBe("doc");
  });

  it("saves and retrieves rich-text structure exactly (formatting preserved)", async () => {
    const d = await createDocument(t.db, t.owner, {});
    await updateDocument(t.db, t.owner, d.id, { content: RICH, title: "Renamed" });
    const back = await getDocument(t.db, t.owner, d.id);
    expect(back.title).toBe("Renamed");
    expect(back.content).toEqual(RICH);
  });

  it("hides private documents from other users (404, not 403)", async () => {
    const d = await createDocument(t.db, t.owner, { title: "Secret" });
    expect(await code(getDocument(t.db, t.eve, d.id))).toBe("NOT_FOUND");
    expect(await code(updateDocument(t.db, t.eve, d.id, { title: "x" }))).toBe("NOT_FOUND");
    expect(await code(deleteDocument(t.db, t.eve, d.id))).toBe("NOT_FOUND");
    expect(await listDocuments(t.db, t.eve)).toHaveLength(0);
  });

  it("returns NOT_FOUND for missing documents", async () => {
    expect(await code(getDocument(t.db, t.owner, "nope"))).toBe("NOT_FOUND");
  });
});

describe("sharing", () => {
  it("lets an EDITOR open and edit content but not rename, delete or manage shares", async () => {
    const d = await createDocument(t.db, t.owner, { title: "Plan" });
    await shareDocument(t.db, t.owner, d.id, { email: "sarah@example.com", permission: "EDITOR" });

    const seen = await getDocument(t.db, t.sarah, d.id);
    expect(seen.access).toBe("EDITOR");
    await updateDocument(t.db, t.sarah, d.id, { content: RICH });
    expect((await getDocument(t.db, t.owner, d.id)).content).toEqual(RICH);

    expect(await code(updateDocument(t.db, t.sarah, d.id, { title: "Hijack" }))).toBe("FORBIDDEN");
    expect(await code(deleteDocument(t.db, t.sarah, d.id))).toBe("FORBIDDEN");
    expect(await code(shareDocument(t.db, t.sarah, d.id, { email: "eve@example.com", permission: "EDITOR" }))).toBe("FORBIDDEN");
    expect(await code(listShares(t.db, t.sarah, d.id))).toBe("FORBIDDEN");
  });

  it("lets a VIEWER read but not edit", async () => {
    const d = await createDocument(t.db, t.owner, {});
    await shareDocument(t.db, t.owner, d.id, { email: "sarah@example.com", permission: "VIEWER" });
    expect((await getDocument(t.db, t.sarah, d.id)).access).toBe("VIEWER");
    expect(await code(updateDocument(t.db, t.sarah, d.id, { content: RICH }))).toBe("FORBIDDEN");
  });

  it("separates owned and shared in listings, and filters by search", async () => {
    const mine = await createDocument(t.db, t.sarah, { title: "Sarah notes" });
    const theirs = await createDocument(t.db, t.owner, { title: "Roadmap Q3" });
    await shareDocument(t.db, t.owner, theirs.id, { email: "sarah@example.com", permission: "EDITOR" });
    expect((await listDocuments(t.db, t.sarah, { view: "mine" })).map((d) => d.id)).toEqual([mine.id]);
    expect((await listDocuments(t.db, t.sarah, { view: "shared" })).map((d) => d.id)).toEqual([theirs.id]);
    expect(await listDocuments(t.db, t.sarah, { view: "all" })).toHaveLength(2);
    expect((await listDocuments(t.db, t.sarah, { q: "roadmap" })).map((d) => d.id)).toEqual([theirs.id]);
    expect(await listDocuments(t.db, t.sarah, { q: "100%" })).toHaveLength(0); // LIKE wildcards are escaped
  });

  it("revokes access immediately", async () => {
    const d = await createDocument(t.db, t.owner, {});
    await shareDocument(t.db, t.owner, d.id, { email: "sarah@example.com", permission: "EDITOR" });
    await revokeShare(t.db, t.owner, d.id, t.sarah);
    expect(await code(getDocument(t.db, t.sarah, d.id))).toBe("NOT_FOUND");
    expect(await listShares(t.db, t.owner, d.id)).toHaveLength(0);
  });

  it("updates permission when re-sharing, rejects unknown users and self-share", async () => {
    const d = await createDocument(t.db, t.owner, {});
    await shareDocument(t.db, t.owner, d.id, { email: "sarah@example.com", permission: "EDITOR" });
    const s = await shareDocument(t.db, t.owner, d.id, { email: "SARAH@example.com", permission: "VIEWER" });
    expect(s).toHaveLength(1);
    expect(s[0].permission).toBe("VIEWER");
    expect(await code(shareDocument(t.db, t.owner, d.id, { email: "ghost@example.com", permission: "EDITOR" }))).toBe("NOT_FOUND");
    expect(await code(shareDocument(t.db, t.owner, d.id, { email: "owner@example.com", permission: "EDITOR" }))).toBe("BAD_REQUEST");
  });

  it("deletes a document together with its shares", async () => {
    const d = await createDocument(t.db, t.owner, {});
    await shareDocument(t.db, t.owner, d.id, { email: "sarah@example.com", permission: "EDITOR" });
    await deleteDocument(t.db, t.owner, d.id);
    expect(await listDocuments(t.db, t.sarah)).toHaveLength(0);
    expect(await code(getDocument(t.db, t.owner, d.id))).toBe("NOT_FOUND");
  });
});
