import { createClient } from "@libsql/client";
import { migrate } from "../src/db/migrate";
import { loadEnv } from "./env";

loadEnv();
const client = createClient({ url: process.env.DATABASE_URL || "file:./dev.db", authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
migrate(client).then(() => console.log("Database schema is up to date."));
