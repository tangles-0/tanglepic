"use client";

import Link from "next/link";
import { useState } from "react";
import GalleryClient from "@/components/gallery-client";

type AlbumPreview = {
  id: string;
  name: string;
  previews: { id: string; baseName: string }[];
};

type GalleryImage = {
  id: string;
  baseName: string;
  width: number;
  height: number;
  uploadedAt: string;
};

export default function GalleryTabs({
  albums,
  images,
}: {
  albums: AlbumPreview[];
  images: GalleryImage[];
}) {
  const [activeTab, setActiveTab] = useState<"albums" | "images">("images");

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
        albums.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
            No albums yet. Create one on the upload page.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
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
                        src={`/image/${image.id}/${image.baseName}-sm.jpg`}
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
        )
      ) : (
        <GalleryClient images={images} />
      )}
    </div>
  );
}

