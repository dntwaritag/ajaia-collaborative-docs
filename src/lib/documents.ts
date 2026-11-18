import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Db } from "@/db/client";
import { documents, documentShares, users } from "@/db/schema";
import { ServiceError } from "./errors";

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
export type Permission = "VIEWER" | "EDITOR";
export type Access = "OWNER" | Permission;

export type DocSummary = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  updatedAt: number;
  createdAt: number;
  access: Access;
  sharedCount: number;
};

export type DocFull = DocSummary & { content: unknown };

const now = () => Date.now();

/** Resolve what the user may do with a document. Single source of truth for authorization. */
export async function resolveAccess(db: Db, userId: string, documentId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) throw new ServiceError("NOT_FOUND", "Document not found.");
  if (doc.ownerId === userId) return { doc, access: "OWNER" as Access };
  const [share] = await db
    .select()
    .from(documentShares)
    .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, userId)))
    .limit(1);
  // Return NOT_FOUND (not FORBIDDEN) so the existence of private docs is not leaked.
  if (!share) throw new ServiceError("NOT_FOUND", "Document not found.");
  return { doc, access: share.permission as Access };
}

export async function createDocument(db: Db, userId: string, input: { title?: string; content?: unknown }) {
  const id = randomUUID();
  const t = now();
  await db.insert(documents).values({
    id,
    title: input.title ?? "Untitled document",
    content: JSON.stringify(input.content ?? EMPTY_DOC),
    ownerId: userId,
    createdAt: t,
    updatedAt: t,
  });
  return getDocument(db, userId, id);
}

async function summarize(db: Db, rows: (typeof documents.$inferSelect)[], userId: string): Promise<DocSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const ownerIds = [...new Set(rows.map((r) => r.ownerId))];
  const owners = await db.select().from(users).where(inArray(users.id, ownerIds));
  const shares = await db.select().from(documentShares).where(inArray(documentShares.documentId, ids));
  return rows.map((r) => {
    const owner = owners.find((o) => o.id === r.ownerId)!;
    const mine = shares.find((s) => s.documentId === r.id && s.userId === userId);
    return {
      id: r.id,
      title: r.title,
      ownerId: r.ownerId,
      ownerName: owner.name,
      ownerEmail: owner.email,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      access: r.ownerId === userId ? "OWNER" : ((mine?.permission ?? "VIEWER") as Access),
      sharedCount: shares.filter((s) => s.documentId === r.id).length,
    };
  });
}

export async function getDocument(db: Db, userId: string, documentId: string): Promise<DocFull> {
  const { doc } = await resolveAccess(db, userId, documentId);
  const [summary] = await summarize(db, [doc], userId);
  return { ...summary, content: JSON.parse(doc.content) };
}

export async function listDocuments(
  db: Db,
  userId: string,
  opts: { view?: "mine" | "shared" | "recent" | "all"; q?: string } = {},
): Promise<DocSummary[]> {
  const view = opts.view ?? "all";
  const sharedIds = (await db.select({ id: documentShares.documentId }).from(documentShares).where(eq(documentShares.userId, userId))).map((r) => r.id);
  const ownedCond = eq(documents.ownerId, userId);
  const sharedCond = sharedIds.length ? inArray(documents.id, sharedIds) : undefined;
  let scope = view === "mine" ? ownedCond : view === "shared" ? sharedCond : or(ownedCond, sharedCond);
  if (!scope) return [];
  const q = opts.q?.trim();
  if (q) {
    const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    scope = and(scope, like(documents.title, `%${escaped}%`))!;
  }
  const rows = await db.select().from(documents).where(scope).orderBy(desc(documents.updatedAt)).limit(view === "recent" ? 10 : 500);
  return summarize(db, rows, userId);
}

export async function updateDocument(db: Db, userId: string, documentId: string, patch: { title?: string; content?: unknown }) {
  const { doc, access } = await resolveAccess(db, userId, documentId);
  if (access === "VIEWER") throw new ServiceError("FORBIDDEN", "You have view-only access to this document.");
  if (patch.title !== undefined && access !== "OWNER" && patch.title !== doc.title) {
    throw new ServiceError("FORBIDDEN", "Only the owner can rename this document.");
  }
  const set: Partial<typeof documents.$inferInsert> = { updatedAt: now() };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.content !== undefined) set.content = JSON.stringify(patch.content);
  await db.update(documents).set(set).where(eq(documents.id, documentId));
  return getDocument(db, userId, documentId);
}

export async function deleteDocument(db: Db, userId: string, documentId: string) {
  const { access } = await resolveAccess(db, userId, documentId);
  if (access !== "OWNER") throw new ServiceError("FORBIDDEN", "Only the owner can delete this document.");
  await db.delete(documentShares).where(eq(documentShares.documentId, documentId));
  await db.delete(documents).where(eq(documents.id, documentId));
}

export async function listShares(db: Db, userId: string, documentId: string) {
  const { access } = await resolveAccess(db, userId, documentId);
  if (access !== "OWNER") throw new ServiceError("FORBIDDEN", "Only the owner can manage sharing.");
  const rows = await db
    .select({ userId: users.id, name: users.name, email: users.email, permission: documentShares.permission, createdAt: documentShares.createdAt })
    .from(documentShares)
    .innerJoin(users, eq(users.id, documentShares.userId))
    .where(eq(documentShares.documentId, documentId))
    .orderBy(documentShares.createdAt);
  return rows;
}

export async function shareDocument(db: Db, userId: string, documentId: string, input: { email: string; permission: Permission }) {
  const { doc, access } = await resolveAccess(db, userId, documentId);
  if (access !== "OWNER") throw new ServiceError("FORBIDDEN", "Only the owner can manage sharing.");
  const [target] = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
  if (!target) throw new ServiceError("NOT_FOUND", "No user with that email exists in Ajaia Docs.");
  if (target.id === doc.ownerId) throw new ServiceError("BAD_REQUEST", "You already own this document.");
  const [existing] = await db
    .select()
    .from(documentShares)
    .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, target.id)))
    .limit(1);
  if (existing) {
    await db.update(documentShares).set({ permission: input.permission }).where(eq(documentShares.id, existing.id));
  } else {
    await db.insert(documentShares).values({ id: randomUUID(), documentId, userId: target.id, permission: input.permission, createdAt: now() });
  }
  return listShares(db, userId, documentId);
}

export async function revokeShare(db: Db, userId: string, documentId: string, targetUserId: string) {
  const { access } = await resolveAccess(db, userId, documentId);
  if (access !== "OWNER") throw new ServiceError("FORBIDDEN", "Only the owner can manage sharing.");
  await db.delete(documentShares).where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, targetUserId)));
  return listShares(db, userId, documentId);
}
