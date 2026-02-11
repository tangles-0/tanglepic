import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAppSettings, getUserUploadStats } from "@/lib/metadata-store";
import AuthForms from "@/components/auth-forms";
import AlertBanner from "@/components/ui/alert-banner";
import TextLink from "@/components/ui/text-link";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let next = value;
  let unitIndex = -1;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex += 1;
  }
  return `${next.toFixed(next < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const settings = await getAppSettings();
  const funded = settings.fundedThisMonth;
  const cost = settings.costThisMonth;
  const progress = cost > 0 ? Math.min(100, Math.round((funded / cost) * 100)) : 0;
  const userStats = userId ? await getUserUploadStats(userId) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">TanglePic</h1>
        <p className="text-neutral-600">
          Create an account to upload images, organize albums, and generate direct share
          links.
        </p>
      </header>

      <section className="rounded-md border border-neutral-200 p-4 text-sm">
        <h2 className="text-lg font-medium">Message of the day</h2>
        <p className="mt-2 text-xs text-neutral-600">{settings.motd}</p>
      </section>

      {userId ? (
        <section className="space-y-2 rounded-md border border-neutral-200 p-4 text-sm">
          <h2 className="text-lg font-medium">Welcome back</h2>
          <p className="text-xs text-neutral-600">
            Logged in as {session?.user?.email ?? session?.user?.name ?? "user"}.
          </p>
          <p className="text-xs text-neutral-600">
            You have {userStats?.imageCount ?? 0} images uploaded using{" "}
            {formatBytes(userStats?.totalBytes ?? 0)} of disk space.
          </p>
          <TextLink
            href="/gallery"
            variant="default"
            className="inline-flex items-center gap-1 text-lg font-medium"
          >
            Click here to go to your gallery <span aria-hidden="true">&gt;</span>
          </TextLink>
        </section>
      ) : (
        <>
          {!settings.signupsEnabled ? (
            <AlertBanner>
              New signups are currently disabled. Existing users can still log in.
            </AlertBanner>
          ) : null}

          <AuthForms signupsEnabled={settings.signupsEnabled} />
        </>
      )}

      {settings.supportEnabled ? (
        <section className="space-y-3 rounded-md border border-neutral-200 p-4">
          <h2 className="text-lg font-medium">Support this project</h2>
          <p className="text-xs text-neutral-600">
            This site is developed and maintained by a single dev. If you found it useful, please
            consider supporting it :)
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>
                ${funded} / ${cost} funded this month
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-200">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {settings.donateUrl ? (
            <a
              href={settings.donateUrl}
              className="inline-flex rounded border border-emerald-500 px-4 py-2 text-xs text-emerald-600"
            >
              Donate
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded border border-neutral-300 px-4 py-2 text-xs text-neutral-400"
            >
              Donate
            </button>
          )}
        </section>
      ) : null}

      <section className="space-y-2 rounded-md border border-neutral-200 p-4">
        <h2 className="text-lg font-medium"><span className="text-emerald-500 animate-pulse">Hot tip:</span> Share link format</h2>
        <p className="text-xs text-neutral-600">
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

