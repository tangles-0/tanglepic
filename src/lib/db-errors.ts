export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = (error as { cause?: unknown }).cause;
  const code = readErrorCode(error) ?? readErrorCode(cause);
  if (
    code &&
    [
      "EAI_AGAIN",
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "ETIMEDOUT",
      "57P01",
      "57P02",
      "57P03",
    ].includes(code)
  ) {
    return true;
  }

  const message = `${error.message} ${cause instanceof Error ? cause.message : ""}`.toLowerCase();
  return (
    message.includes("database_url is not set") ||
    message.includes("getaddrinfo") ||
    message.includes("connect econnrefused") ||
    message.includes("connection terminated") ||
    message.includes("the database system is shutting down")
  );
}

function readErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const maybeCode = (value as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : undefined;
}


