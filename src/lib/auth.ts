import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { ServiceError } from "./errors";

export const SESSION_COOKIE = "ajaia_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = { id: string; email: string; name: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (16+ chars) in production.");
    return new TextEncoder().encode("insecure-dev-secret-do-not-use-in-prod");
  }
  return new TextEncoder().encode(s);
}

export async function verifyCredentials(db: Db, email: string, password: string): Promise<SessionUser> {
  const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  // Always run bcrypt to keep timing similar whether or not the user exists.
  const hash = u?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali";
  const ok = await bcrypt.compare(password, hash);
  if (!u || !ok) throw new ServiceError("UNAUTHENTICATED", "Incorrect email or password.");
  return { id: u.id, email: u.email, name: u.name };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Returns the signed-in user, re-checked against the database, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const db = await getDb();
    const [u] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    return u ? { id: u.id, email: u.email, name: u.name } : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new ServiceError("UNAUTHENTICATED", "Please sign in.");
  return u;
}
