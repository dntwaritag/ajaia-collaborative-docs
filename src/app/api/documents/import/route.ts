import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { createDocument } from "@/lib/documents";
import { importFile, MAX_UPLOAD_BYTES } from "@/lib/import";
import { ServiceError } from "@/lib/errors";

export const runtime = "nodejs";

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new ServiceError("TOO_LARGE", "File is too large. Maximum size is 2 MB.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ServiceError("BAD_REQUEST", "Choose a file to import.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { title, content } = await importFile({ name: file.name, type: file.type, size: file.size, bytes });
  const doc = await createDocument(await getDb(), user.id, { title, content });
  return NextResponse.json({ document: doc }, { status: 201 });
});
