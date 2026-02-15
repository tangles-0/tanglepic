"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { uploadSingleImage } from "@/lib/upload-client";

type UploadState = "idle" | "uploading" | "success" | "error";

type UploadedImage = {
  id: string;
  baseName: string;
  ext: string;
};

type ShareInfo = {
  id: string;
  urls: {
    original: string;
  };
};

type UploadMessage = {
  id: string;
  text: string;
  tone: "success" | "error";
};

export default function UploadDropzone({ uploadsEnabled = true }: { uploadsEnabled?: boolean }) {
  const [albumId, setAlbumId] = useState("");
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [globalDragging, setGlobalDragging] = useState(false);
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([]);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [albumError, setAlbumError] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadedImage[]>([]);
  const [shareStates, setShareStates] = useState<Record<string, ShareInfo>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [messages, setMessages] = useState<UploadMessage[]>([]);
  const dragCounter = useRef(0);
  const inputId = useId();

  const statusText = useMemo(() => {
    if (status === "uploading") return "uploading...";
    if (status === "success") return "upload complete.";
    if (status === "error") return message ?? "oh shi-";
    return "drag N drop imgs here, or click 2 browse";
  }, [message, status]);

  function pushMessage(text: string, tone: UploadMessage["tone"]) {
    const entry: UploadMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      tone,
    };
    setMessages((current) => [entry, ...current]);
    window.setTimeout(() => {
      setMessages((current) => current.filter((item) => item.id !== entry.id));
    }, 4000);
  }

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

  useEffect(() => {
    function handleDragEnter(event: DragEvent) {
      if (!uploadsEnabled) return;
      event.preventDefault();
      dragCounter.current += 1;
      setGlobalDragging(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!uploadsEnabled) return;
      event.preventDefault();
    }

    function handleDragLeave(event: DragEvent) {
      if (!uploadsEnabled) return;
      event.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        setGlobalDragging(false);
      }
    }

    function handleDrop(event: DragEvent) {
      if (!uploadsEnabled) return;
      event.preventDefault();
      dragCounter.current = 0;
      setGlobalDragging(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        void uploadFiles(files);
      }
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [uploadsEnabled]);

  async function uploadFiles(files: FileList | File[]) {
    if (!uploadsEnabled) {
      setStatus("error");
      setMessage("Uploads are currently disabled.");
      return;
    }
    const items = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (items.length === 0) {
      setStatus("error");
      setMessage("Please drop image files.");
      return;
    }

    setStatus("uploading");
    setMessage(null);

    for (const file of items) {
      const result = await uploadSingleImage(file, albumId.trim() || undefined);
      pushMessage(result.message, result.ok ? "success" : "error");

      if (!result.ok) {
        setStatus("error");
        setMessage(result.message);
        continue;
      }

      const image = result.image;
      if (!image) {
        continue;
      }
      setRecentUploads((current) => {
        const next = [
          {
            id: image.id,
            baseName: image.baseName,
            ext: image.ext,
          },
          ...current,
        ];
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

  async function deleteRecentUpload(image: UploadedImage) {
    const response = await fetch("/api/images/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", imageIds: [image.id] }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      pushMessage(payload.error ?? "Unable to delete image.", "error");
      return;
    }

    setRecentUploads((current) => current.filter((item) => item.id !== image.id));
    setShareStates((current) => {
      if (!(image.id in current)) {
        return current;
      }
      const next = { ...current };
      delete next[image.id];
      return next;
    });
    pushMessage("img deleted.", "success");
  }

  function onDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDropVisual(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  return (
    <section className="space-y-3 rounded-md border border-neutral-200 p-4">
      <h2 className="text-lg font-medium">upload imgs</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="block text-xs text-neutral-500" htmlFor={inputId}>
          album (optional)
        </label>
        <button
          type="button"
          onClick={() => {
            setAlbumError(null);
            setIsAlbumModalOpen(true);
          }}
          className="rounded border border-neutral-200 px-3 py-1 text-xs"
        >
          + album
        </button>
      </div>
      <select
        id={inputId}
        name="albumId"
        value={albumId}
        onChange={(event) => setAlbumId(event.target.value)}
        className="w-full rounded border px-3 py-2"
      >
        <option value="">no album</option>
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.name}
          </option>
        ))}
      </select>

      <div
        role="button"
        tabIndex={0}
        onDragOver={uploadsEnabled ? onDragOver : undefined}
        onDragLeave={uploadsEnabled ? onDragLeave : undefined}
        onDrop={uploadsEnabled ? onDropVisual : undefined}
        onClick={
          uploadsEnabled ? () => document.getElementById(`${inputId}-file`)?.click() : undefined
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (uploadsEnabled) {
              document.getElementById(`${inputId}-file`)?.click();
            }
          }
        }}
        className={`flex min-h-[180px] flex-col items-center justify-center rounded border border-dashed px-6 py-8 text-center text-sm transition ${
          uploadsEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        } ${isDragging || globalDragging ? "border-black bg-neutral-50" : "border-neutral-300"}`}
      >
        <p className="font-medium">{statusText}</p>
        <p className="mt-2 text-xs text-neutral-500">
          imgs are stored by upload time with metadata removed.
        </p>
      </div>

      <input
        id={`${inputId}-file`}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={!uploadsEnabled}
        onChange={(event) => {
          if (event.target.files?.length) {
            void uploadFiles(event.target.files);
          }
        }}
      />

      {globalDragging ? (
        <div className="pointer-events-none fixed inset-0 z-40 bg-black/30" />
      ) : null}

      {messages.length > 0 ? (
        <div className="fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 space-y-2 px-4">
          {messages.map((item) => (
            <div
              key={item.id}
              className={`rounded border px-3 py-2 text-xs shadow ${
                item.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>
      ) : null}

      {recentUploads.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-neutral-600">ur recent uploads</h3>
          <div className="space-y-2">
            {recentUploads.map((image) => {
              const thumbUrl = `/image/${image.id}/${image.baseName}-sm.${image.ext}`;
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
                    <button
                      type="button"
                      onClick={() => void deleteRecentUpload(image)}
                      className="rounded border border-neutral-200 p-1 text-neutral-500"
                      aria-label="Delete image"
                      title="Delete image"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Zm-1 11h12a2 2 0 0 0 2-2V7H4v11a2 2 0 0 0 2 2Z"
                          fill="currentColor"
                        />
                      </svg>
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
            <h3 className="text-lg font-semibold">create album</h3>
            <p className="mt-1 text-xs text-neutral-500">
              give the album a nice name so u can find it later. like Sir Pooty Pants
            </p>
            <input
              className="mt-4 w-full rounded border px-3 py-2"
              placeholder="album name"
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
                cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAlbum}
                className="rounded bg-black px-3 py-1 text-xs text-white"
              >
                saveth the album
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

