import type { Metadata, Viewport } from "next";
import { loadPublicContent } from "@/lib/content-store";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Formica Bouw", template: "%s | Formica Bouw" },
  description: "Complete badkamerrenovatie door heel Nederland: van sloop en leidingwerk tot tegelwerk, sanitair en afwerking.",
  icons: { icon: "/media/brand/logo.png", apple: "/media/brand/logo.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17372d" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const data = await loadPublicContent();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Formica Bouw",
    url: siteUrl,
    email: data.settings.email,
    telephone: data.settings.phone,
    areaServed: { "@type": "Country", name: data.settings.serviceAreaEn || "Netherlands" },
    sameAs: data.settings.instagram ? [data.settings.instagram] : [],
  };
  return (
    <html lang="nl" suppressHydrationWarning>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
