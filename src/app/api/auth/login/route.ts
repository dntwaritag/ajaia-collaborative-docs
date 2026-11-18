import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { verifyCredentials, setSessionCookie } from "@/lib/auth";
import { handle } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const input = loginSchema.parse(await req.json());
  const user = await verifyCredentials(await getDb(), input.email, input.password);
  await setSessionCookie(user);
  return NextResponse.json({ user });
});
