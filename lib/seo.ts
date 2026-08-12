import type { Metadata } from "next";
import type { Locale } from "./types";
import type { loadPublicContent } from "./content-store";
import { enPaths, getLocalized, nlPaths, pathFor } from "./site-data";

type PublicData = Awaited<ReturnType<typeof loadPublicContent>>;

export function metadataFor(pageKey: string, locale: Locale, data: PublicData): Metadata {
  const entry = data.pages.find((item) => item.slug === pageKey) ?? data.services.find((item) => item.slug === pageKey);
  const copy = entry ? getLocalized(entry, locale) : { title: "Formica Bouw", summary: "" };
  const seoTitle = entry?.metadata[locale === "nl" ? "seoTitleNl" : "seoTitleEn"];
  const seoDescription = entry?.metadata[locale === "nl" ? "seoDescriptionNl" : "seoDescriptionEn"];
  const title = typeof seoTitle === "string" && seoTitle.trim() ? seoTitle.trim() : copy.title;
  const description = typeof seoDescription === "string" && seoDescription.trim() ? seoDescription.trim() : copy.summary;
  const socialTitle = `${title} | Formica Bouw`;
  const path = pathFor(pageKey, locale);
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: {
      canonical: path,
      languages: { "nl-NL": nlPaths[pageKey], "en-GB": enPaths[pageKey], "x-default": nlPaths[pageKey] },
    },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: "Formica Bouw",
      locale: locale === "nl" ? "nl_NL" : "en_GB",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Formica Bouw" }],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: ["/og.png"] },
  };
}
