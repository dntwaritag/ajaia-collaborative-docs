import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { updateDocSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ document: await getDocument(await getDb(), user.id, id) });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const body = updateDocSchema.parse(await req.json());
  return NextResponse.json({ document: await updateDocument(await getDb(), user.id, id, body) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteDocument(await getDb(), user.id, id);
  return NextResponse.json({ ok: true });
});
