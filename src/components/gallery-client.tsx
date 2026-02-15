"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadSingleImage } from "@/lib/upload-client";
import FancyCheckbox from "@/components/ui/fancy-checkbox";

import { LightCaretRight } from '@energiz3r/icon-library/Icons/Light/LightCaretRight';
import { LightCaretLeft } from '@energiz3r/icon-library/Icons/Light/LightCaretLeft';
import { LightTimes } from '@energiz3r/icon-library/Icons/Light/LightTimes';
import { LightDownload } from '@energiz3r/icon-library/Icons/Light/LightDownload';

const SHOW_ALBUM_IMAGES_STORAGE_KEY = "tanglepic-gallery-show-album-images";

type GalleryImage = {
  id: string;
  baseName: string;
  ext: string;
  albumId?: string;
  width: number;
  height: number;
  uploadedAt: string;
  shared?: boolean;
};

type ShareInfo = {
  id: string;
  urls: {
    original: string;
    sm: string;
    lg: string;
  };
};

type UploadMessage = {
  id: string;
  text: string;
  tone: "success" | "error";
};

export default function GalleryClient({
  images,
  onImagesChange,
  showAlbumImageToggle = true,
  uploadAlbumId,
  hideImagesInAlbums = false,
}: {
  images: GalleryImage[];
  onImagesChange?: (next: GalleryImage[]) => void;
  showAlbumImageToggle?: boolean;
  uploadAlbumId?: string;
  hideImagesInAlbums?: boolean;
}) {
  const [items, setItems] = useState<GalleryImage[]>(images);
  const [active, setActive] = useState<GalleryImage | null>(null);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [globalDragging, setGlobalDragging] = useState(false);
  const [messages, setMessages] = useState<UploadMessage[]>([]);
  const [showAlbumImages, setShowAlbumImages] = useState(true);
  const dragCounter = useRef(0);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    setItems(images);
  }, [images]);

  useEffect(() => {
    if (!showAlbumImageToggle) {
      return;
    }
    try {
      const stored = window.localStorage.getItem(SHOW_ALBUM_IMAGES_STORAGE_KEY);
      if (stored === "0") {
        setShowAlbumImages(false);
      }
      if (stored === "1") {
        setShowAlbumImages(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [showAlbumImageToggle]);

  useEffect(() => {
    if (!showAlbumImageToggle) {
      return;
    }
    try {
      window.localStorage.setItem(SHOW_ALBUM_IMAGES_STORAGE_KEY, showAlbumImages ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [showAlbumImages, showAlbumImageToggle]);

  useEffect(() => {
    function handleDragEnter(event: DragEvent) {
      event.preventDefault();
      dragCounter.current += 1;
      setGlobalDragging(true);
    }

    function handleDragOver(event: DragEvent) {
      event.preventDefault();
    }

    function handleDragLeave(event: DragEvent) {
      event.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        setGlobalDragging(false);
      }
    }

    function handleDrop(event: DragEvent) {
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
  }, []);

  const filteredItems = useMemo(
    () => {
      if (hideImagesInAlbums) {
        return items.filter((image) => !image.albumId);
      }
      if (showAlbumImageToggle && !showAlbumImages) {
        return items.filter((image) => !image.albumId);
      }
      return items;
    },
    [hideImagesInAlbums, items, showAlbumImageToggle, showAlbumImages],
  );

  const displayItems = useMemo(
    () =>
      filteredItems.map((image) => ({
        ...image,
        thumbUrl: `/image/${image.id}/${image.baseName}-sm.${image.ext}`,
        fullUrl: `/image/${image.id}/${image.baseName}.${image.ext}`,
      })),
    [filteredItems],
  );

  const visibleIds = useMemo(() => new Set(filteredItems.map((image) => image.id)), [filteredItems]);
  const selectedIds = useMemo(
    () => Array.from(selected).filter((id) => visibleIds.has(id)),
    [selected, visibleIds],
  );
  const activeIndex = useMemo(() => {
    if (!active) {
      return -1;
    }
    return displayItems.findIndex((item) => item.id === active.id);
  }, [active, displayItems]);
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < displayItems.length - 1;

  async function uploadFiles(files: FileList | File[]) {
    const itemsToUpload = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (itemsToUpload.length === 0) {
      const entry: UploadMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: "Please drop image files.",
        tone: "error",
      };
      setMessages((current) => [entry, ...current]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== entry.id));
      }, 4000);
      return;
    }

    for (const file of itemsToUpload) {
      const result = await uploadSingleImage(file, uploadAlbumId);
      const entry: UploadMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: result.message,
        tone: result.ok ? "success" : "error",
      };
      setMessages((current) => [entry, ...current]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== entry.id));
      }, 4000);

      if (result.ok && result.image) {
        setItems((current) => [result.image as GalleryImage, ...current]);
      }
    }
  }

  async function openModal(image: GalleryImage) {
    setActive(image);
    setShare(null);
    setShareError(null);

    try {
      const response = await fetch(`/api/shares?imageId=${image.id}`);

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to load share info.");
      }

      const payload = (await response.json()) as
        | { share: { id: string }; urls: ShareInfo["urls"] }
        | { share: null };

      if (payload.share) {
        setShare({ id: payload.share.id, urls: payload.urls });
        setItems((current) =>
          current.map((item) =>
            item.id === image.id ? { ...item, shared: true } : item,
          ),
        );
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Unable to load share info.");
    }
  }

  function closeModal() {
    setActive(null);
    setShare(null);
    setShareError(null);
  }

  function openPreviousImage() {
    if (!hasPrevious) {
      return;
    }
    const previous = displayItems[activeIndex - 1];
    if (!previous) {
      return;
    }
    void openModal(previous);
  }

  function openNextImage() {
    if (!hasNext) {
      return;
    }
    const next = displayItems[activeIndex + 1];
    if (!next) {
      return;
    }
    void openModal(next);
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied((current) => (current === label ? null : current)), 1200);
  }

  async function enableShare(image: GalleryImage) {
    setShareError(null);
    const response = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: image.id }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setShareError(payload.error ?? "Unable to create share link.");
      return;
    }

    const payload = (await response.json()) as { share: { id: string }; urls: ShareInfo["urls"] };
    setShare({ id: payload.share.id, urls: payload.urls });
    setItems((current) =>
      current.map((item) =>
        item.id === image.id ? { ...item, shared: true } : item,
      ),
    );
  }

  async function disableShare(image: GalleryImage) {
    setShareError(null);
    const response = await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: image.id }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setShareError(payload.error ?? "Unable to remove share link.");
      return;
    }

    setShare(null);
    setItems((current) =>
      current.map((item) =>
        item.id === image.id ? { ...item, shared: false } : item,
      ),
    );
  }

  async function fetchAlbums() {
    const response = await fetch("/api/albums");
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { albums?: { id: string; name: string }[] };
    if (payload.albums) {
      setAlbums(payload.albums);
    }
  }

  async function runBulkAction(action: string, extra?: Record<string, string>) {
    setBulkError(null);
    const response = await fetch("/api/images/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        imageIds: selectedIds,
        ...extra,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setBulkError(payload.error ?? "Bulk action failed.");
      return false;
    }

    return true;
  }

  async function handleDelete() {
    const ok = await runBulkAction("delete");
    if (!ok) return;
    setItems((current) => current.filter((image) => !selected.has(image.id)));
    setSelected(new Set());
    if (active && selected.has(active.id)) {
      closeModal();
    }
  }

  async function handleDisableSharing() {
    const ok = await runBulkAction("disableSharing");
    if (!ok) return;
    if (active && selected.has(active.id)) {
      setShare(null);
    }
    setItems((current) =>
      current.map((item) =>
        selected.has(item.id) ? { ...item, shared: false } : item,
      ),
    );
    setSelected(new Set());
  }

  async function handleAddToAlbum() {
    if (!selectedAlbumId) {
      setBulkError("Select an album.");
      return;
    }
    const ok = await runBulkAction("addToAlbum", { albumId: selectedAlbumId });
    if (!ok) return;
    setItems((current) =>
      current.map((item) =>
        selected.has(item.id) ? { ...item, albumId: selectedAlbumId } : item,
      ),
    );
    setSelected(new Set());
    setIsAddModalOpen(false);
  }

  async function deleteSingleImage(image: GalleryImage) {
    setDeleteError(null);
    const response = await fetch("/api/images/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", imageIds: [image.id] }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setDeleteError(payload.error ?? "Unable to delete image.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== image.id));
    setSelected((current) => {
      if (!current.has(image.id)) {
        return current;
      }
      const next = new Set(current);
      next.delete(image.id);
      return next;
    });
    if (active?.id === image.id) {
      closeModal();
    }
    setImageToDelete(null);
  }

  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(items);
    }
  }, [items, onImagesChange]);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (activeIndex === -1) {
      closeModal();
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        openPreviousImage();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        openNextImage();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, activeIndex, displayItems, hasNext, hasPrevious]);

  return (
    <>
      {globalDragging ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="rounded border border-dashed border-white px-6 py-4 text-sm text-white">
            Drop images to upload
          </div>
        </div>
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

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded border border-neutral-200 px-4 py-2 text-xs">
          <span>{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() => {
              setBulkError(null);
              setIsAddModalOpen(true);
              void fetchAlbums();
            }}
            className="rounded border border-neutral-200 px-3 py-1"
          >
            Add to album
          </button>
          <button
            type="button"
            onClick={handleDisableSharing}
            className="rounded border border-neutral-200 px-3 py-1"
          >
            Disable sharing
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-red-200 px-3 py-1 text-red-600"
          >
            Delete
          </button>
          {bulkError ? <span className="text-red-600">{bulkError}</span> : null}
        </div>
      ) : null}

      {showAlbumImageToggle ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowAlbumImages((current) => !current)}
            className="rounded border border-neutral-200 px-3 py-1 text-xs"
          >
            {showAlbumImages ? "Hide images in albums" : "Show images in albums"}
          </button>
        </div>
      ) : null}

      {displayItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
          {items.length === 0
            ? "No uploads yet. Drop images anywhere on this page or head to the upload page."
            : "No images to show with the current filter."}
        </div>
      ) : (
        <div className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,320px))]">
          {displayItems.map((image) => (
            <div
              key={image.id}
              className="gallery-tile relative overflow-hidden rounded-md border border-neutral-200 text-left"
            >
              {image.shared ? (
                <span className="absolute left-2 top-11 z-10 rounded bg-emerald-600 px-2 py-1 font-medium text-white">
                  shared
                </span>
              ) : null}
              <FancyCheckbox
                className="tile-control absolute left-2 top-2 z-10 text-xs"
                checked={selected.has(image.id)}
                onChange={(checked) => {
                  const next = new Set(selected);
                  if (checked) {
                    next.add(image.id);
                  } else {
                    next.delete(image.id);
                  }
                  setSelected(next);
                }}
              />
              <button
                type="button"
                onClick={() => setImageToDelete(image)}
                className="tile-control absolute right-2 top-2 z-10 rounded p-1"
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
              <button type="button" onClick={() => openModal(image)} className="block w-full">
                <img
                  src={image.thumbUrl}
                  alt="Uploaded"
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
              </button>
              <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-500">
                <span className="truncate">{image.baseName}</span>
                <span>
                  {image.width}×{image.height}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            openPreviousImage();
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            openNextImage();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            closeModal();
          }
        }}>
          <div className="max-h-full w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-md bg-white p-6 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">img details</h2>
                <p className="text-xs text-neutral-500">{active.baseName}</p>
                {activeIndex >= 0 ? (
                  <p className="text-xs text-neutral-500">
                    {activeIndex + 1} / {displayItems.length}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openPreviousImage}
                  disabled={!hasPrevious}
                  className="rounded border border-neutral-200 px-2 py-1 text-xs disabled:opacity-50"
                >
                  <LightCaretLeft className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={openNextImage}
                  disabled={!hasNext}
                  className="rounded border border-neutral-200 px-2 py-1 text-xs disabled:opacity-50"
                >
                  <LightCaretRight className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const downloadUrl = `/image/${active.id}/${active.baseName}.${active.ext}`;
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = `${active.baseName}.${active.ext}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="rounded border border-neutral-200 px-2 py-1 text-xs"
                  aria-label="Download image"
                  title="Download image"
                >
                  <LightDownload className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded border border-neutral-200 px-2 py-1 text-xs"
                >
                  <LightTimes className="h-4 w-4" fill="currentColor" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[2fr,1fr]">
              <img
                src={`/image/${active.id}/${active.baseName}-lg.${active.ext}`}
                alt="Uploaded"
                className="max-h-[60vh] w-full rounded border border-neutral-200 object-contain"
              />

              <div className="min-w-0 space-y-3">
                <div className="rounded border border-neutral-200 p-3 text-xs text-neutral-600">
                  <div>Dimensions: {active.width}×{active.height}</div>
                  <div>Uploaded: {new Date(active.uploadedAt).toLocaleString()}</div>
                </div>

                <div className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-xs">
                  <span className="text-neutral-600">
                    sharing: {share ? "enabled" : "disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      share ? disableShare(active) : enableShare(active)
                    }
                    className={`rounded px-3 py-1 text-xs ${
                      share ? "bg-black text-white" : "border border-neutral-200"
                    }`}
                  >
                    {share ? "disable" : "enable"}
                  </button>
                </div>

                {shareError ? <p className="text-xs text-red-600">{shareError}</p> : null}

                {share ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-600">Direct link</label>
                      <button
                        type="button"
                        onClick={() => copyText(`${origin}${share.urls.original}`, "direct")}
                        className="w-full max-w-full break-all rounded border border-neutral-200 px-3 py-2 text-left text-xs"
                      >
                        {origin}
                        {share.urls.original}
                      </button>
                      {copied === "direct" ? (
                        <span className="text-[11px] text-emerald-600">Copied</span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-600">BBCode</label>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(`[img]${origin}${share.urls.original}[/img]`, "bbcode")
                        }
                        className="w-full max-w-full break-all rounded border border-neutral-200 px-3 py-2 text-left text-xs"
                      >
                        [img]{origin}
                        {share.urls.original}[/img]
                      </button>
                      {copied === "bbcode" ? (
                        <span className="text-[11px] text-emerald-600">Copied</span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-600">
                        Linked BBCode
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `[url=${origin}${share.urls.original}][img]${origin}${share.urls.sm}[/img][/url]`,
                            "linked",
                          )
                        }
                        className="w-full max-w-full break-all rounded border border-neutral-200 px-3 py-2 text-left text-xs"
                      >
                        [url={origin}
                        {share.urls.original}][img]{origin}
                        {share.urls.sm}[/img][/url]
                      </button>
                      {copied === "linked" ? (
                        <span className="text-[11px] text-emerald-600">Copied</span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Share links are disabled for this image.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md bg-white p-6 text-sm">
            <h3 className="text-lg font-semibold">Add to album</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Choose an album to add {selectedIds.length} image
              {selectedIds.length === 1 ? "" : "s"} to.
            </p>
            <select
              value={selectedAlbumId}
              onChange={(event) => setSelectedAlbumId(event.target.value)}
              className="mt-4 w-full rounded border px-3 py-2"
            >
              <option value="">Select an album</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
            {bulkError ? <p className="mt-2 text-xs text-red-600">{bulkError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded border border-neutral-200 px-3 py-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddToAlbum}
                className="rounded bg-black px-3 py-1 text-xs text-white"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {imageToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md bg-white p-6 text-sm">
            <h3 className="text-lg font-semibold">Delete image?</h3>
            <p className="mt-1 text-xs text-neutral-500">
              This will permanently delete the image and its share links.
            </p>
            {deleteError ? (
              <p className="mt-2 text-xs text-red-600">{deleteError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                className="rounded border border-neutral-200 px-3 py-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteSingleImage(imageToDelete)}
                className="rounded bg-red-600 px-3 py-1 text-xs text-white"
              >
                Delete image
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

