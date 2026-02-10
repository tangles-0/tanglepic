export type UploadResult = {
  ok: boolean;
  message: string;
  image?: {
    id: string;
    baseName: string;
    ext: string;
    albumId?: string;
    width: number;
    height: number;
    uploadedAt: string;
    shared?: boolean;
  };
};

export async function uploadSingleImage(
  file: File,
  albumId?: string,
): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: `${file.name} is not an image.` };
  }

  const formData = new FormData();
  formData.append("file", file);
  if (albumId) {
    formData.append("albumId", albumId);
  }

  const response = await fetch("/api/images", {
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

  const payload = (await response.json()) as { image: UploadResult["image"] };
  return {
    ok: true,
    message: `${file.name} uploaded`,
    image: payload.image,
  };
}

