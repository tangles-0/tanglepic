function normalizeOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return null;
  }
}

export function hasTrustedOrigin(request: Request): boolean {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return false;
  }

  const expectedOrigin = normalizeOrigin(`${proto}://${host}`);
  if (!expectedOrigin) {
    return false;
  }

  if (!origin) {
    return false;
  }

  return origin === expectedOrigin;
}

