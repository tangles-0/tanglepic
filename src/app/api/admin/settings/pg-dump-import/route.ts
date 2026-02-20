import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { getSessionUserId } from "@/lib/auth";
import { isAdminUser } from "@/lib/metadata-store";

export const runtime = "nodejs";

const MAX_DUMP_BYTES = 1024 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const connectionString = resolveConnectionString();
  if (!connectionString) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("dump");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a dump file." }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Dump file is empty." }, { status: 400 });
  }
  if (file.size > MAX_DUMP_BYTES) {
    return NextResponse.json(
      { error: "Dump file is too large (max 1 GB)." },
      { status: 400 },
    );
  }

  const originalName = file.name || "upload.sql";
  const extension = extname(originalName).toLowerCase();
  const uploadKind = extension === ".dump" ? "dump" : "sql";
  const tempDir = await mkdtemp(join(tmpdir(), "tanglepic-import-"));
  const tempFilePath = join(tempDir, `upload${uploadKind === "dump" ? ".dump" : ".sql"}`);

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, bytes);

    if (uploadKind === "dump") {
      await runCommand("pg_restore", [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        connectionString,
        tempFilePath,
      ]);
    } else {
      await runCommand("psql", [
        "--set",
        "ON_ERROR_STOP=1",
        "--dbname",
        connectionString,
        "--file",
        tempFilePath,
      ]);
    }

    return NextResponse.json({ message: "Dump import completed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dump import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function resolveConnectionString(): string | undefined {
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const port = process.env.PGPORT ?? "5432";

  if (host && database && user && password) {
    const encodedPassword = encodeURIComponent(password);
    return `postgres://${user}:${encodedPassword}@${host}:${port}/${database}`;
  }

  return process.env.DATABASE_URL;
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new Error(`${command} is not installed in this runtime.`));
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const details = stderr.trim();
      reject(new Error(details || `${command} failed with exit code ${code ?? "unknown"}.`));
    });
  });
}
