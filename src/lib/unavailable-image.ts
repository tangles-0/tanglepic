import path from "path";
import { promises as fs } from "fs";

type SupportedExt = "jpg" | "jpeg" | "png" | "webp" | "gif" | "avif";

function toSupportedExt(ext: string): SupportedExt {
  const normalized = ext.toLowerCase();
  if (normalized === "jpeg" || normalized === "jpg") return "jpg";
  if (normalized === "png") return "png";
  if (normalized === "webp") return "webp";
  if (normalized === "gif") return "gif";
  if (normalized === "avif") return "avif";
  return "png";
}

function contentTypeForExt(ext: SupportedExt): string {
  switch (ext) {
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "jpg":
      return "image/jpeg";
    default:
      return "image/png";
  }
}

export async function unavailableImageResponse(ext: string): Promise<Response> {
  const resolvedExt = toSupportedExt(ext);
  const filePath = path.join(process.cwd(), "public", "unavailable", `unavailable.${resolvedExt}`);
  const data = await fs.readFile(filePath);
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentTypeForExt(resolvedExt),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}


