import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sweeply",
  description: "Gmail inbox cleanup",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Keep Neon database warm */}
        <script
          dangerouslySetInnerHTML={{
            __html: `fetch('/api/ping').catch(() => {})`,
          }}
        />
      </body>
    </html>
  );
}
