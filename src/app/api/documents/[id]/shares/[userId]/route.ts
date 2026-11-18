import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { revokeShare } from "@/lib/documents";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, userId } = await params;
  return NextResponse.json({ shares: await revokeShare(await getDb(), user.id, id, userId) });
});
