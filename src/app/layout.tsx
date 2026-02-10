import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserTheme } from "@/lib/metadata-store";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
  title: "TanglePic",
  description: "Upload images, organize albums, and share direct links.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const theme = userId ? await getUserTheme(userId) : "default";

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning={true}>
      {!userId ? (
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  const stored = localStorage.getItem("tanglepic-theme");
                  if (stored) {
                    document.documentElement.dataset.theme = stored;
                  }
                } catch {}
              `,
            }}
          />
        </head>
      ) : null}
      <body className="min-h-screen bg-white text-neutral-900">
        <ThemeProvider initialTheme={theme} preferLocalStorage={!userId}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

