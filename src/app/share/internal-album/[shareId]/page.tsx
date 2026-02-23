export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import {
  getAlbumPublic,
  getAlbumShareById,
} from "@/lib/metadata-store";
import { listMediaForAlbumPublic } from "@/lib/media-store";
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

  const [album, media] = await Promise.all([
    getAlbumPublic(share.albumId),
    listMediaForAlbumPublic(share.albumId),
  ]);

  if (!album) {
    notFound();
  }

  return <AlbumShareView shareId={shareId} albumName={album.name} media={media} />;
}

