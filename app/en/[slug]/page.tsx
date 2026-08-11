import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSite } from "@/components/PublicSite";
import { loadPublicContent } from "@/lib/content-store";
import { enRouteKeys } from "@/lib/site-data";
import { metadataFor } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageKey = enRouteKeys[slug];
  if (!pageKey) return {};
  return metadataFor(pageKey, "en", await loadPublicContent());
}

export default async function EnglishPage({ params }: Props) {
  const { slug } = await params;
  const pageKey = enRouteKeys[slug];
  if (!pageKey) notFound();
  return <PublicSite locale="en" pageKey={pageKey} data={await loadPublicContent()} />;
}

