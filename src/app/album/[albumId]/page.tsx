import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAlbumForUser, listImagesForAlbum } from "@/lib/metadata-store";
import AlbumView from "@/components/album-view";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const { albumId } = await params;
  const album = await getAlbumForUser(albumId, userId);
  if (!album) {
    redirect("/gallery");
  }

  const images = await listImagesForAlbum(userId, albumId);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-3">
        <Link href="/gallery" className="text-sm text-neutral-500 underline">
          Back to gallery
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{album.name}</h1>
          <p className="text-xs text-neutral-500">
            {images.length} image{images.length === 1 ? "" : "s"}
          </p>
          {images.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-500">
              Go to the Images tab, select images, then choose “Add to album”.
            </p>
          ) : null}
        </div>
      </header>

      <AlbumView albumId={albumId} images={images} />
    </main>
  );
}

