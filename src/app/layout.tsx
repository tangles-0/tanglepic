import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserTheme } from "@/lib/metadata-store";
import { ThemeProvider } from "@/components/theme/theme-provider";
import FloatingThemeSelector from "@/components/theme/floating-theme-selector";
import { FloatingLogo } from "@/components/theme/floating-logo";

export const metadata = {
  title: "latex",
  description: "Upload images, organize albums, and share direct links.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const theme = userId ? await getUserTheme(userId) : "dark";

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
            <FloatingThemeSelector />
            {children}
            <FloatingLogo />
          </ThemeProvider>
          
      </body>
    </html>
  );
}

