"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function GalleryClient({
  images,
  onImagesChange,
}: {
  images: GalleryImage[];
  onImagesChange?: (next: GalleryImage[]) => void;
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    setItems(images);
  }, [images]);

  const displayItems = useMemo(
    () =>
      items.map((image) => ({
        ...image,
        thumbUrl: `/image/${image.id}/${image.baseName}-sm.${image.ext}`,
        fullUrl: `/image/${image.id}/${image.baseName}.${image.ext}`,
      })),
    [items],
  );

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

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

  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(items);
    }
  }, [items, onImagesChange]);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
        No uploads yet. Head to the upload page to add your first image.
      </div>
    );
  }

  return (
    <>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayItems.map((image) => (
          <div
            key={image.id}
            className="relative overflow-hidden rounded-md border border-neutral-200 text-left"
          >
            {image.shared ? (
              <span className="absolute right-2 top-2 z-10 rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white">
                Shared
              </span>
            ) : null}
            <label className="absolute left-2 top-2 z-10 rounded bg-white/80 px-2 py-1 text-xs">
              <input
                type="checkbox"
                checked={selected.has(image.id)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) {
                    next.add(image.id);
                  } else {
                    next.delete(image.id);
                  }
                  setSelected(next);
                }}
              />
            </label>
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

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-full w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-md bg-white p-6 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Image details</h2>
                <p className="text-xs text-neutral-500">{active.baseName}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded border border-neutral-200 px-2 py-1 text-xs"
              >
                Close
              </button>
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
                    Share links: {share ? "enabled" : "disabled"}
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
                    {share ? "Disable" : "Enable"}
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
    </>
  );
}

