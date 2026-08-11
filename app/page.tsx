import type { Metadata } from "next";
import { PublicSite } from "@/components/PublicSite";
import { loadPublicContent } from "@/lib/content-store";
import { metadataFor } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadPublicContent();
  return metadataFor("home", "nl", data);
}

export default async function Home() {
  const data = await loadPublicContent();
  return <PublicSite locale="nl" pageKey="home" data={data} />;
}

