export type UploadResult = {
  ok: boolean;
  message: string;
  media?: {
    id: string;
    kind: "image" | "video" | "document" | "other";
    baseName: string;
    ext: string;
    mimeType?: string;
    albumId?: string;
    width?: number;
    height?: number;
    uploadedAt: string;
    shared?: boolean;
    previewStatus?: "pending" | "ready" | "failed";
  };
};

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
const RESUMABLE_THRESHOLD = 64 * 1024 * 1024;
const PART_RETRY_LIMIT = 4;

type InitUploadResponse = {
  sessionId: string;
  chunkSize: number;
  totalParts: number;
  uploadedParts: Record<string, string>;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function uploadResumable(
  file: File,
  targetType: "image" | "video" | "document" | "other",
): Promise<{ ok: boolean; sessionId?: string; storageKey?: string; error?: string }> {
  const initResponse = await fetch("/api/uploads/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      chunkSize: DEFAULT_CHUNK_SIZE,
      targetType,
    }),
  });
  if (!initResponse.ok) {
    const payload = (await initResponse.json()) as { error?: string };
    return { ok: false, error: payload.error ?? "Unable to initialize upload session." };
  }
  const initPayload = (await initResponse.json()) as InitUploadResponse;
  const chunkSize = initPayload.chunkSize;
  const totalParts = initPayload.totalParts;

  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    if (initPayload.uploadedParts[String(partNumber)]) {
      continue;
    }
    const start = (partNumber - 1) * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    let success = false;
    for (let attempt = 0; attempt < PART_RETRY_LIMIT; attempt += 1) {
      const formData = new FormData();
      formData.append("sessionId", initPayload.sessionId);
      formData.append("partNumber", String(partNumber));
      formData.append("chunk", chunk, `${file.name}.part-${partNumber}`);
      const partResponse = await fetch("/api/uploads/part", {
        method: "POST",
        body: formData,
      });
      if (partResponse.ok) {
        success = true;
        break;
      }
      await sleep(300 * (attempt + 1));
    }
    if (!success) {
      await fetch("/api/uploads/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: initPayload.sessionId }),
      });
      return { ok: false, error: `Failed while uploading chunk ${partNumber}/${totalParts}.` };
    }
  }

  const completeResponse = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: initPayload.sessionId }),
  });
  if (!completeResponse.ok) {
    const payload = (await completeResponse.json()) as { error?: string };
    return { ok: false, error: payload.error ?? "Failed to finalize upload session." };
  }
  const completePayload = (await completeResponse.json()) as { storageKey?: string };
  return { ok: true, sessionId: initPayload.sessionId, storageKey: completePayload.storageKey };
}

export async function uploadSingleMedia(
  file: File,
  albumId?: string,
): Promise<UploadResult> {
  const type = file.type.toLowerCase();
  const kind: "image" | "video" | "document" | "other" =
    type.startsWith("image/")
      ? "image"
      : type.startsWith("video/")
        ? "video"
        : type.startsWith("text/") || type.includes("pdf") || type.includes("document")
          ? "document"
          : "other";

  if (file.size >= RESUMABLE_THRESHOLD) {
    const resumable = await uploadResumable(file, kind);
    if (!resumable.ok || !resumable.sessionId) {
      return { ok: false, message: `${file.name}: ${resumable.error ?? "Upload failed."}` };
    }
    const finalizeResponse = await fetch("/api/media/from-upload-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: resumable.sessionId,
        albumId,
      }),
    });
    if (!finalizeResponse.ok) {
      let errorMessage = "Upload finalized but media registration failed.";
      try {
        const payload = (await finalizeResponse.json()) as { error?: string };
        if (payload.error) {
          errorMessage = payload.error;
        }
      } catch {
        // ignore JSON parse errors
      }
      return { ok: false, message: `${file.name}: ${errorMessage}` };
    }
    const payload = (await finalizeResponse.json()) as { media: UploadResult["media"] };
    return {
      ok: true,
      message: `${file.name} uploaded`,
      media: payload.media,
    };
  }

  const formData = new FormData();
  formData.append("file", file);
  if (albumId) {
    formData.append("albumId", albumId);
  }

  const response = await fetch("/api/media", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Upload failed.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    return { ok: false, message: `${file.name}: ${errorMessage}` };
  }

  const payload = (await response.json()) as { media: UploadResult["media"] };
  return {
    ok: true,
    message: `${file.name} uploaded`,
    media: payload.media,
  };
}

export async function uploadSingleImage(file: File, albumId?: string): Promise<UploadResult> {
  const result = await uploadSingleMedia(file, albumId);
  if (!result.ok) {
    return result;
  }
  if (!result.media) {
    return result;
  }
  if (result.media.kind !== "image") {
    return { ok: false, message: `${file.name}: upload returned non-image media type.` };
  }
  return result;
}

