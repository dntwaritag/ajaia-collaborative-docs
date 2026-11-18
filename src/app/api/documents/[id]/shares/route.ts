import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { listShares, shareDocument } from "@/lib/documents";
import { shareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ shares: await listShares(await getDb(), user.id, id) });
});

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const body = shareSchema.parse(await req.json());
  return NextResponse.json({ shares: await shareDocument(await getDb(), user.id, id, body) });
});
