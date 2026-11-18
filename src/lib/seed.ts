import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { users } from "@/db/schema";

export const DEMO_PASSWORD = "AjaiaDemo#2025";
export const DEMO_USERS = [
  { id: "user_denys", email: "denys@example.com", name: "Denys N." },
  { id: "user_sarah", email: "sarah@example.com", name: "Sarah Johnson" },
  { id: "user_alex", email: "alex@example.com", name: "Alex Rivera" },
];

/** Idempotent: inserts demo users that do not exist yet. */
export async function seedUsers(db: Db) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of DEMO_USERS) {
    const [existing] = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
    if (!existing) await db.insert(users).values({ ...u, passwordHash, createdAt: Date.now() });
  }
}
