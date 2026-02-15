import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAlbumForUser, listImagesForAlbum } from "@/lib/metadata-store";
import GalleryClient from "@/components/gallery-client";
import AlbumShareControls from "@/components/album-share-controls";
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

  const images = await listImagesForAlbum(userId, albumId);

  return (
    <main className="flex min-h-screen w-full flex-col gap-6 px-6 py-10 text-sm">
      <PageHeader
        title={album.name}
        subtitle={`${images.length} image${images.length === 1 ? "" : "s"} in this album.`}
        backLink={{ href: "/gallery?tab=albums", label: "Return to albums" }}
      >
        {images.length === 0 ? (
          <p className="text-xs text-neutral-500">
            Go to the Images tab, select images, then choose “Add to album”.
          </p>
        ) : null}
      </PageHeader>

      <AlbumShareControls albumId={albumId} />

      <GalleryClient
        images={images}
        showAlbumImageToggle={false}
        uploadAlbumId={albumId}
      />
    </main>
  );
}

