import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

function resolveDatabaseUrl(): string {
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const port = process.env.PGPORT ?? "5432";
  const sslMode = process.env.PGSSLMODE;

  if (host && database && user && password) {
    const encodedPassword = encodeURIComponent(password);
    const baseUrl = `postgres://${user}:${encodedPassword}@${host}:${port}/${database}`;
    return appendSslMode(baseUrl, sslMode);
  }

  if (process.env.DATABASE_URL) {
    return appendSslMode(process.env.DATABASE_URL, sslMode);
  }

  throw new Error("DATABASE_URL or PGHOST/PGDATABASE/PGUSER/PGPASSWORD must be set for drizzle-kit.");
}

function appendSslMode(url: string, sslMode: string | undefined): string {
  if (sslMode !== "require") {
    return url;
  }
  if (url.includes("sslmode=")) {
    return url;
  }
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}sslmode=require`;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
});
