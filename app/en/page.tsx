import type { Metadata } from "next";
import { PublicSite } from "@/components/PublicSite";
import { loadPublicContent } from "@/lib/content-store";
import { metadataFor } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadPublicContent();
  return metadataFor("home", "en", data);
}

export default async function EnglishHome() {
  return <PublicSite locale="en" pageKey="home" data={await loadPublicContent()} />;
}

