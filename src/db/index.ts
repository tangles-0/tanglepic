import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

const globalForPostgres = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
};

const client = connectionString
  ? globalForPostgres.postgres ?? postgres(connectionString, { max: 5 })
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

