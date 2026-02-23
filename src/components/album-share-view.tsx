"use client";

type AlbumImage = {
  id: string;
  baseName: string;
  ext: string;
  width: number;
  height: number;
  albumCaption?: string;
  uploadedAt: string;
};

export default function AlbumShareView({
  shareId,
  albumName,
  images,
}: {
  shareId: string;
  albumName: string;
  images: AlbumImage[];
}) {
  const formatTimestamp = (value: string) =>
    `${new Date(value).toISOString().replace("T", " ").slice(0, 19)} UTC`;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-2 sm:gap-6 px-2 sm:px-6 py-2 sm:py-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{albumName}</h1>
        <p className="text-neutral-600">
          {images.length} image{images.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="space-y-6">
        {images.map((image) => (
          <div key={image.id} className="rounded-md border border-neutral-200 p-4">
            <img
              src={`/share/album/${shareId}/image/${image.id}/lg.${image.ext}`}
              alt="Shared album image"
              className="w-full rounded border border-neutral-200 object-contain"
            />
            <div className="mt-3 text-xs text-neutral-500">
              {image.width}×{image.height} • {formatTimestamp(image.uploadedAt)}
            </div>
            {image.albumCaption ? (
              <p className="mt-2 text-xs text-neutral-700">{image.albumCaption}</p>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}

