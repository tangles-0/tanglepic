import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAppSettings, getUserUploadStats } from "@/lib/metadata-store";
import AuthForms from "@/components/auth-forms";
import AlertBanner from "@/components/ui/alert-banner";
import TextLink from "@/components/ui/text-link";
import { BrandsGithub } from '@energiz3r/icon-library/Icons/Brands/BrandsGithub';
import Link from "next/link";

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
        {/* <div className="flex items-center gap-2">
          <img src="/latex-logo.png" alt="TanglePic"  width="24px" />
        
        </div> */}
        <h1 className="text-2xl font-semibold">LaTeX <span className="font-medium">img_srv</span></h1>
        <p className="text-neutral-600">
          create acct to upload imgs, mkdir albums, and create symlinks to send to frendz/foez
        </p>
      </header>

      <section className="rounded-md border border-neutral-200 p-4 text-sm relative">
        <h2 className="text-lg font-medium">patch notes</h2>
        <p className="mt-2 text-xs text-neutral-600">{settings.motd}</p>
        <div className="absolute top-0 right-0">
          <Link
            href="https://github.com/tangles-0/tanglepic"
            target="_blank"
            rel="noopener noreferrer"

          >
            <BrandsGithub className="p-2 h-10 w-10" fill="currentColor" />
          </Link>
        </div>
      </section>

      {userId ? (
        <section className="space-y-2 rounded-md border border-neutral-200 p-4 text-sm">
          <h2 className="text-lg font-medium">I C U AGAIN</h2>
          <p className="text-xs text-neutral-600">
            u r <span className="font-bold">{session?.user?.email ?? session?.user?.name ?? "user"}</span>. wb &lt;3
          </p>
          <p className="text-xs text-neutral-600">
            u hav {userStats?.imageCount ?? 0} imgs uploaded using{" "}
            {formatBytes(userStats?.totalBytes ?? 0)} of spinning rust
          </p>
          <TextLink
            href="/gallery"
            variant="loud"
            className="inline-flex items-center gap-1 text-lg font-medium"
          >
            clk here 2 go 2 ur gallery <span aria-hidden="true">&gt;</span>
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
          <h2 className="text-lg font-medium">Support this thing</h2>
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
        <h2 className="text-lg font-medium"><span className="text-emerald-500 animate-pulse">pro tip:</span> thumbnail links</h2>
        <p className="text-xs text-neutral-600">
          creat a share link, then append <code>-sm</code> or <code>-lg</code> before the file
          extension for thumbnails.
        </p>
        <p className="text-neutral-500 text-xs">
          eg: <code>/share/&lt;file&gt;.png</code>{" "} becomes {" "}
          <code>/share/&lt;file&gt;-sm.png</code>
        </p>
      </section>
    </main>
  );
}

