import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const pw = url.searchParams.get("pw")?.trim();
  const pw_secret = process.env.DB_PUSH_PW ?? "";
  if (pw !== pw_secret || !pw_secret) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const result = await runDrizzlePush();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "db push failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function runDrizzlePush(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["exec", "drizzle-kit", "push", "--config", "./drizzle.config.ts"],
      {
        cwd: process.cwd(),
        env: process.env,
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new Error("pnpm is not installed in this runtime."));
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
        return;
      }
      const details = stderr.trim() || stdout.trim();
      reject(
        new Error(details || `drizzle-kit push failed with exit code ${code ?? "unknown"}.`),
      );
    });
  });
}
