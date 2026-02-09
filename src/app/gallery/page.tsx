import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { listAlbums, listImagesForUser } from "@/lib/metadata-store";
import GalleryTabs from "@/components/gallery-tabs";
import Link from "next/link";

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const [albums, images] = await Promise.all([
    listAlbums(userId),
    listImagesForUser(userId),
  ]);

  const albumPreviews = albums.map((album) => {
    const previews = images
      .filter((image) => image.albumId === album.id)
      .slice(0, 3)
      .map((image) => ({ id: image.id, baseName: image.baseName }));

    return { id: album.id, name: album.name, previews };
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Your gallery</h1>
          <p className="text-neutral-600">
            {images.length} image{images.length === 1 ? "" : "s"} uploaded.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
          <Link href="/upload" className="underline">
            Upload images
          </Link>
          <Link href="/api/auth/signout" className="underline">
            Sign out
          </Link>
        </div>
      </header>

      <GalleryTabs albums={albumPreviews} images={images} />
    </main>
  );
}

