import "./globals.css";

export const metadata = {
  title: "TanglePic",
  description: "Upload images, organize albums, and share direct links.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900">
        {children}
      </body>
    </html>
  );
}

