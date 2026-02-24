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
  
  const localDrizzleKitPath = `${process.cwd()}/node_modules/.bin/drizzle-kit`;
  const baseEnv = {
    ...process.env,
    HOME: process.env.HOME ?? "/tmp",
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? "/tmp/.cache",
    COREPACK_HOME: process.env.COREPACK_HOME ?? "/tmp/.cache/node/corepack",
  };

  const attempts: Array<{ command: string; args: string[] }> = [
    {
      command: localDrizzleKitPath,
      args: ["push", "--config", "./drizzle.config.ts"],
    },
    {
      command: "pnpm",
      args: ["exec", "drizzle-kit", "push", "--config", "./drizzle.config.ts"],
    },
  ];

  return runWithFallback(attempts, baseEnv);
}

function runWithFallback(
  attempts: Array<{ command: string; args: string[] }>,
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const current = attempts[0];
    if (!current) {
      reject(new Error("No drizzle-kit command was available in this runtime."));
      return;
    }
    const child = spawn(current.command, current.args, {
      cwd: process.cwd(),
      env,
    });

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
        runWithFallback(attempts.slice(1), env).then(resolve).catch(reject);
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
      if (attempts.length > 1) {
        runWithFallback(attempts.slice(1), env).then(resolve).catch(reject);
        return;
      }
      reject(new Error(details || `drizzle-kit push failed with exit code ${code ?? "unknown"}.`));
    });
  });
}
