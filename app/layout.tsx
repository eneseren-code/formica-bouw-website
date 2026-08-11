import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Formica Bouw", template: "%s | Formica Bouw" },
  description: "Complete badkamerrenovatie door heel Nederland: van sloop en leidingwerk tot tegelwerk, sanitair en afwerking.",
  icons: { icon: "/media/brand/logo.png", apple: "/media/brand/logo.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17372d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Formica Bouw",
    url: siteUrl,
    email: "info@formicabouw.com",
    telephone: "+31851091145",
    areaServed: { "@type": "Country", name: "Netherlands" },
    sameAs: ["https://www.instagram.com/formicabouw/"],
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
