import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { createDocument, listDocuments } from "@/lib/documents";
import { createDocSchema } from "@/lib/validation";

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const v = url.searchParams.get("view");
  const view = v === "mine" || v === "shared" || v === "recent" ? v : "all";
  const docs = await listDocuments(await getDb(), user.id, { view, q: url.searchParams.get("q") ?? undefined });
  return NextResponse.json({ documents: docs });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = createDocSchema.parse(await req.json().catch(() => ({})));
  const doc = await createDocument(await getDb(), user.id, body);
  return NextResponse.json({ document: doc }, { status: 201 });
});
