import { createDb } from "../src/db/client";
import { migrate } from "../src/db/migrate";
import { seedUsers, DEMO_USERS, DEMO_PASSWORD } from "../src/lib/seed";
import { loadEnv } from "./env";

loadEnv();
const { db, client } = createDb(process.env.DATABASE_URL || "file:./dev.db", process.env.DATABASE_AUTH_TOKEN);
migrate(client)
  .then(() => seedUsers(db))
  .then(() => {
    console.log("Seeded demo users (password for all: %s):", DEMO_PASSWORD);
    DEMO_USERS.forEach((u) => console.log(" -", u.email));
  });
