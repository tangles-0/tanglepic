import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getAlbumForUser,
  getLatestPatchNote,
  getUserLastPatchNoteDismissed,
  listImagesForAlbum,
} from "@/lib/metadata-store";
import GalleryClient from "@/components/gallery-client";
import AlbumShareControls from "@/components/album-share-controls";
import PatchNoteBanner from "@/components/patch-note-banner";
import PageHeader from "@/components/ui/page-header";

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

  const [images, latestPatchNote, dismissedAt] = await Promise.all([
    listImagesForAlbum(userId, albumId),
    getLatestPatchNote(),
    getUserLastPatchNoteDismissed(userId),
  ]);
  const shouldShowPatchBanner =
    latestPatchNote &&
    (!dismissedAt || new Date(latestPatchNote.publishedAt).getTime() > new Date(dismissedAt).getTime());

  return (
    <main className="flex min-h-screen w-full flex-col gap-6 px-6 py-10 text-sm">
      <PageHeader
        title={album.name}
        subtitle={`${images.length} image${images.length === 1 ? "" : "s"} in this album.`}
        backLink={{ href: "/gallery?tab=albums", label: "cd .. (albums)" }}
      >
        {images.length === 0 ? (
          <p className="text-xs text-neutral-500">
            go 2 the imgs tab, select some imgs, then choose “add 2 album”.
          </p>
        ) : null}
      </PageHeader>

      {shouldShowPatchBanner ? (
        <PatchNoteBanner
          publishedAt={latestPatchNote.publishedAt}
          firstLine={latestPatchNote.firstLine}
        />
      ) : null}

      <AlbumShareControls albumId={albumId} />

      <GalleryClient
        images={images}
        showAlbumImageToggle={false}
        uploadAlbumId={albumId}
      />
    </main>
  );
}

