export type MediaKind = "image" | "video" | "document" | "other";

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "rtf",
  "csv",
  "odt",
  "ods",
  "odp",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "mov",
  "mkv",
  "webm",
  "avi",
  "mpeg",
  "mpg",
  "wmv",
  "flv",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg"]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  midi: "audio/midi",
  mid: "audio/midi",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  rtf: "application/rtf",
  csv: "text/csv",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
  gz: "application/gzip",
  tar: "application/x-tar",
  rar: "application/vnd.rar",
};

export function extFromFileName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

export function mediaKindFromType(mimeType: string, ext: string): MediaKind {
  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "other";
  }
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation") ||
    DOCUMENT_EXTENSIONS.has(ext)
  ) {
    return "document";
  }
  return "other";
}

export function contentTypeForExt(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] ?? "application/octet-stream";
}

