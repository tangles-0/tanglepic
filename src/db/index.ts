import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = resolveConnectionString();
const useSsl = process.env.PGSSLMODE === "require";

const globalForPostgres = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
};

const client = connectionString
  ? globalForPostgres.postgres ??
    postgres(connectionString, {
      max: 5,
      ssl: useSsl ? "require" : undefined,
    })
  : null;

if (process.env.NODE_ENV !== "production" && client) {
  globalForPostgres.postgres = client;
}

export const db = client
  ? drizzle(client, { schema })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is not set.");
        },
      },
    ) as ReturnType<typeof drizzle>);

function resolveConnectionString(): string | undefined {
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const port = process.env.PGPORT ?? "5432";

  // Prefer explicit PG* variables in ECS so local docker-only DATABASE_URL values (e.g. host=db)
  // do not override cloud runtime database connectivity.
  if (host && database && user && password) {
    const encodedPassword = encodeURIComponent(password);
    return `postgres://${user}:${encodedPassword}@${host}:${port}/${database}`;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return undefined;
}

