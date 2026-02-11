import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminUser, listAlbums, listImagesForUser } from "@/lib/metadata-store";
import GalleryTabs from "@/components/gallery-tabs";
import PageHeader from "@/components/ui/page-header";
import TextLink from "@/components/ui/text-link";

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const [albums, images, isAdmin] = await Promise.all([
    listAlbums(userId),
    listImagesForUser(userId),
    isAdminUser(userId),
  ]);


  return (
    <main className="flex min-h-screen w-full flex-col gap-6 px-6 py-10 text-sm">
      <PageHeader
        title="Your gallery"
        subtitle={`${images.length} image${images.length === 1 ? "" : "s"} uploaded.`}
        backLink={{ href: "/", label: "Back to home" }}
        actions={
          <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
            <TextLink href="/upload" className="text-sm">
              Upload images
            </TextLink>
            {isAdmin ? (
              <TextLink href="/admin" className="text-sm">
                Admin
              </TextLink>
            ) : null}
            <TextLink href="/signout" className="text-sm">
              Sign out
            </TextLink>
          </div>
        }
      />

      <GalleryTabs
        albums={albums.map((album) => ({ id: album.id, name: album.name }))}
        images={images}
      />
    </main>
  );
}

