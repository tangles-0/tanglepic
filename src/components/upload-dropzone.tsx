"use client";

import { useEffect, useId, useMemo, useState } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

type UploadedImage = {
  id: string;
  baseName: string;
};

type ShareInfo = {
  id: string;
  urls: {
    original: string;
  };
};

export default function UploadDropzone() {
  const [albumId, setAlbumId] = useState("");
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([]);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [albumError, setAlbumError] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadedImage[]>([]);
  const [shareStates, setShareStates] = useState<Record<string, ShareInfo>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const inputId = useId();

  const statusText = useMemo(() => {
    if (status === "uploading") return "Uploading...";
    if (status === "success") return "Upload complete.";
    if (status === "error") return message ?? "Upload failed.";
    return "Drag & drop images here, or click to browse.";
  }, [message, status]);

  useEffect(() => {
    let isMounted = true;
    async function loadAlbums() {
      const response = await fetch("/api/albums");
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { albums?: { id: string; name: string }[] };
      if (isMounted && payload.albums) {
        setAlbums(payload.albums);
      }
    }

    void loadAlbums();
    return () => {
      isMounted = false;
    };
  }, []);

  async function uploadFiles(files: FileList | File[]) {
    const items = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (items.length === 0) {
      setStatus("error");
      setMessage("Please drop image files.");
      return;
    }

    setStatus("uploading");
    setMessage(null);

    for (const file of items) {
      const formData = new FormData();
      formData.append("file", file);
      if (albumId.trim()) {
        formData.append("albumId", albumId.trim());
      }

      const response = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setStatus("error");
        setMessage(payload.error ?? "Upload failed.");
        return;
      }

      const payload = (await response.json()) as { image: { id: string; baseName: string } };
      setRecentUploads((current) => {
        const next = [{ id: payload.image.id, baseName: payload.image.baseName }, ...current];
        return next.slice(0, 10);
      });
    }

    setStatus("success");
    setMessage(null);
  }

  async function handleCreateAlbum() {
    const name = newAlbumName.trim();
    if (!name) {
      setAlbumError("Album name is required.");
      return;
    }

    setAlbumError(null);
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setAlbumError(payload.error ?? "Unable to create album.");
      return;
    }

    const payload = (await response.json()) as { album: { id: string; name: string } };
    setAlbums((current) => [payload.album, ...current]);
    setAlbumId(payload.album.id);
    setNewAlbumName("");
    setIsAlbumModalOpen(false);
  }

  async function enableSharing(image: UploadedImage): Promise<ShareInfo | null> {
    const response = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: image.id }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { share: { id: string }; urls: { original: string } };
    const nextShare = { id: payload.share.id, urls: { original: payload.urls.original } };
    setShareStates((current) => ({
      ...current,
      [image.id]: nextShare,
    }));
    return nextShare;
  }

  async function copyShare(image: UploadedImage) {
    let share: ShareInfo | null | undefined = shareStates[image.id];
    if (!share) {
      share = await enableSharing(image);
    }
    if (!share) {
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}${share.urls.original}`);
    setCopied(image.id);
    window.setTimeout(
      () => setCopied((current) => (current === image.id ? null : current)),
      1200,
    );
  }

  function onDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-neutral-200 p-4">
      <h2 className="text-lg font-medium">Upload images</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="block text-xs text-neutral-500" htmlFor={inputId}>
          Album (optional)
        </label>
        <button
          type="button"
          onClick={() => {
            setAlbumError(null);
            setIsAlbumModalOpen(true);
          }}
          className="rounded border border-neutral-200 px-3 py-1 text-xs"
        >
          Create album
        </button>
      </div>
      <select
        id={inputId}
        name="albumId"
        value={albumId}
        onChange={(event) => setAlbumId(event.target.value)}
        className="w-full rounded border px-3 py-2"
      >
        <option value="">No album</option>
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.name}
          </option>
        ))}
      </select>

      <div
        role="button"
        tabIndex={0}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById(`${inputId}-file`)?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            document.getElementById(`${inputId}-file`)?.click();
          }
        }}
        className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded border border-dashed px-6 py-8 text-center text-sm transition ${
          isDragging ? "border-black bg-neutral-50" : "border-neutral-300"
        }`}
      >
        <p className="font-medium">{statusText}</p>
        <p className="mt-2 text-xs text-neutral-500">
          Images are stored by upload time, metadata removed, and thumbnails generated.
        </p>
      </div>

      <input
        id={`${inputId}-file`}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void uploadFiles(event.target.files);
          }
        }}
      />

      {recentUploads.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-neutral-600">Recent uploads</h3>
          <div className="space-y-2">
            {recentUploads.map((image) => {
              const thumbUrl = `/image/${image.id}/${image.baseName}-sm.jpg`;
              return (
                <div
                  key={image.id}
                  className="flex items-center justify-between gap-3 rounded border border-neutral-200 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={thumbUrl}
                      alt="Uploaded thumbnail"
                      className="h-8 w-8 rounded object-cover"
                    />
                    <span className="max-w-[160px] truncate">{image.baseName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyShare(image)}
                      className="rounded border border-neutral-200 px-2 py-1 text-[11px]"
                    >
                      {copied === image.id ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isAlbumModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md bg-white p-6 text-sm">
            <h3 className="text-lg font-semibold">Create album</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Give the album a short name so you can find it later.
            </p>
            <input
              className="mt-4 w-full rounded border px-3 py-2"
              placeholder="Album name"
              value={newAlbumName}
              onChange={(event) => setNewAlbumName(event.target.value)}
            />
            {albumError ? (
              <p className="mt-2 text-xs text-red-600">{albumError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(false)}
                className="rounded border border-neutral-200 px-3 py-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAlbum}
                className="rounded bg-black px-3 py-1 text-xs text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

