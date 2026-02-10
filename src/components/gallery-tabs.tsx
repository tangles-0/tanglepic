"use client";

import Link from "next/link";
import { useState } from "react";
import GalleryClient from "@/components/gallery-client";

type AlbumInfo = {
  id: string;
  name: string;
};

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

export default function GalleryTabs({
  albums,
  images,
}: {
  albums: AlbumInfo[];
  images: GalleryImage[];
}) {
  const [imageItems, setImageItems] = useState<GalleryImage[]>(images);
  const [activeTab, setActiveTab] = useState<"albums" | "images">("images");
  const [albumItems, setAlbumItems] = useState(albums);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const albumPreviews = albumItems.map((album) => {
    const previews = imageItems
      .filter((image) => image.albumId === album.id)
      .slice(0, 3)
      .map((image) => ({ id: image.id, baseName: image.baseName, ext: image.ext }));
    return { ...album, previews };
  });

  async function createAlbum() {
    const name = newAlbumName.trim();
    if (!name) {
      setCreateError("Album name is required.");
      return;
    }
    setCreateError(null);
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setCreateError(payload.error ?? "Unable to create album.");
      return;
    }

    const payload = (await response.json()) as { album: { id: string; name: string } };
    setAlbumItems((current) => [...current, payload.album].sort((a, b) => a.name.localeCompare(b.name)));
    setNewAlbumName("");
    setIsCreateOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("albums")}
          className={`rounded px-3 py-1 ${
            activeTab === "albums" ? "bg-black text-white" : "border border-neutral-200"
          }`}
        >
          Albums
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("images")}
          className={`rounded px-3 py-1 ${
            activeTab === "images" ? "bg-black text-white" : "border border-neutral-200"
          }`}
        >
          Images
        </button>
      </div>

      {activeTab === "albums" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Albums</h2>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              className="rounded border border-neutral-200 px-3 py-1 text-xs"
            >
              Create album
            </button>
          </div>

          {albumPreviews.length === 0 ? (
            <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
              No albums yet. Create one to get started.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albumPreviews.map((album) => (
                <Link
                  key={album.id}
                  href={`/album/${album.id}`}
                  className="rounded-md border border-neutral-200 p-3"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {album.previews.length > 0 ? (
                      album.previews.map((image) => (
                        <img
                          key={image.id}
                          src={`/image/${image.id}/${image.baseName}-sm.${image.ext}`}
                          alt="Album preview"
                          className="h-20 w-full rounded object-cover"
                        />
                      ))
                    ) : (
                      <div className="col-span-3 flex h-20 items-center justify-center rounded border border-dashed text-xs text-neutral-400">
                        No images yet
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-sm font-medium">{album.name}</div>
                  <div className="text-xs text-neutral-500">
                    {album.previews.length} preview{album.previews.length === 1 ? "" : "s"}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {isCreateOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-md rounded-md bg-white p-6 text-sm">
                <h3 className="text-lg font-semibold">Create album</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Give the album a short name.
                </p>
                <input
                  className="mt-4 w-full rounded border px-3 py-2"
                  placeholder="Album name"
                  value={newAlbumName}
                  onChange={(event) => setNewAlbumName(event.target.value)}
                />
                {createError ? (
                  <p className="mt-2 text-xs text-red-600">{createError}</p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded border border-neutral-200 px-3 py-1 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void createAlbum()}
                    className="rounded bg-black px-3 py-1 text-xs text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <GalleryClient images={imageItems} onImagesChange={setImageItems} />
      )}
    </div>
  );
}

