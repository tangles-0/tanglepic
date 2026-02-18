export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import {
  getAlbumPublic,
  getAlbumShareById,
  listImagesForAlbumPublic,
} from "@/lib/metadata-store";
import AlbumShareView from "@/components/album-share-view";

export default async function AlbumSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const share = await getAlbumShareById(shareId);
  if (!share) {
    notFound();
  }

  const [album, images] = await Promise.all([
    getAlbumPublic(share.albumId),
    listImagesForAlbumPublic(share.albumId),
  ]);

  if (!album) {
    notFound();
  }

  return <AlbumShareView shareId={shareId} albumName={album.name} images={images} />;
}

