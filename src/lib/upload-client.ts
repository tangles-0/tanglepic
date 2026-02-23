export type UploadResult = {
  ok: boolean;
  message: string;
  media?: {
    id: string;
    kind: "image" | "video" | "document" | "other";
    baseName: string;
    originalFileName?: string;
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
export const DEFAULT_RESUMABLE_THRESHOLD = 64 * 1024 * 1024;
export const KEEP_ORIGINAL_FILE_NAME_STORAGE_KEY = "tanglepic-keep-original-file-name";
const PART_RETRY_LIMIT = 4;

export type UploadOptions = {
  resumableThresholdBytes?: number;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  resumeFromSessionId?: string;
  checksum?: string;
  keepOriginalFileName?: boolean;
};

type InitUploadResponse = {
  sessionId: string;
  chunkSize: number;
  totalParts: number;
  uploadedParts: Record<string, string>;
};

type StatusUploadResponse = {
  sessionId: string;
  state: string;
  uploadedParts: Record<string, string>;
  totalParts: number;
  chunkSize: number;
  fileSize: number;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sumUploadedBytes(uploadedParts: Record<string, string>, chunkSize: number, totalBytes: number): number {
  const partCount = Object.keys(uploadedParts).length;
  return Math.min(totalBytes, partCount * chunkSize);
}

async function uploadResumable(
  file: File,
  targetType: "image" | "video" | "document" | "other",
  options?: Pick<UploadOptions, "resumeFromSessionId" | "checksum" | "onProgress">,
): Promise<{ ok: boolean; sessionId?: string; storageKey?: string; error?: string }> {
  let initPayload: InitUploadResponse;
  if (options?.resumeFromSessionId) {
    const statusResponse = await fetch(
      `/api/uploads/status?sessionId=${encodeURIComponent(options.resumeFromSessionId)}`,
      { cache: "no-store" },
    );
    if (!statusResponse.ok) {
      const payload = (await statusResponse.json()) as { error?: string };
      return { ok: false, error: payload.error ?? "Unable to resume upload session." };
    }
    const statusPayload = (await statusResponse.json()) as StatusUploadResponse;
    initPayload = {
      sessionId: statusPayload.sessionId,
      chunkSize: statusPayload.chunkSize,
      totalParts: statusPayload.totalParts,
      uploadedParts: statusPayload.uploadedParts,
    };
  } else {
    const initResponse = await fetch("/api/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        chunkSize: DEFAULT_CHUNK_SIZE,
        checksum: options?.checksum,
        targetType,
      }),
    });
    if (!initResponse.ok) {
      const payload = (await initResponse.json()) as { error?: string };
      return { ok: false, error: payload.error ?? "Unable to initialize upload session." };
    }
    initPayload = (await initResponse.json()) as InitUploadResponse;
  }
  const chunkSize = initPayload.chunkSize;
  const totalParts = initPayload.totalParts;
  options?.onProgress?.(sumUploadedBytes(initPayload.uploadedParts, chunkSize, file.size), file.size);

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
        headers: { "x-upload-session-id": initPayload.sessionId },
        body: formData,
      });
      if (partResponse.ok) {
        success = true;
        options?.onProgress?.(
          Math.min(file.size, partNumber * chunkSize),
          file.size,
        );
        break;
      }
      await sleep(300 * (attempt + 1));
    }
    if (!success) {
      return {
        ok: false,
        sessionId: initPayload.sessionId,
        error: `Failed while uploading chunk ${partNumber}/${totalParts}.`,
      };
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
  options?.onProgress?.(file.size, file.size);
  return { ok: true, sessionId: initPayload.sessionId, storageKey: completePayload.storageKey };
}

export async function uploadSingleMedia(
  file: File,
  albumId?: string,
  options?: UploadOptions,
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

  const resumableThresholdBytes = Math.max(
    1024 * 1024,
    Number(options?.resumableThresholdBytes ?? DEFAULT_RESUMABLE_THRESHOLD),
  );
  if (file.size >= resumableThresholdBytes) {
    const resumable = await uploadResumable(file, kind, {
      resumeFromSessionId: options?.resumeFromSessionId,
      checksum: options?.checksum,
      onProgress: options?.onProgress,
    });
    if (!resumable.ok || !resumable.sessionId) {
      return { ok: false, message: `${file.name}: ${resumable.error ?? "Upload failed."}` };
    }
    const finalizeResponse = await fetch("/api/media/from-upload-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: resumable.sessionId,
        albumId,
        keepOriginalFileName: options?.keepOriginalFileName === true,
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
  formData.append("keepOriginalFileName", options?.keepOriginalFileName === true ? "1" : "0");

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
  options?.onProgress?.(file.size, file.size);
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

