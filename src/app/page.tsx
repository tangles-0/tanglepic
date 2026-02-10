import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AuthForms from "@/components/auth-forms";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/gallery");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">TanglePic</h1>
        <p className="text-neutral-600">
          Create an account to upload images, organize albums, and generate direct share
          links.
        </p>
      </header>

      <AuthForms />

      <section className="space-y-2 rounded-md border border-neutral-200 p-4">
        <h2 className="text-lg font-medium">Share link format</h2>
        <p className="text-neutral-600">
          After creating a share link, append <code>-sm</code> or <code>-lg</code> before the file
          extension for thumbnails.
        </p>
        <p className="text-neutral-500 text-xs">
          Example: <code>/share/&lt;shareId&gt;/&lt;file&gt;.png</code>,{" "}
          <code>/share/&lt;shareId&gt;/&lt;file&gt;-sm.png</code>
        </p>
      </section>
    </main>
  );
}

