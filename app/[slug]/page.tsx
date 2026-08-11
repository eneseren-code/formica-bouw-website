import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicSite } from "@/components/PublicSite";
import { loadPublicContent } from "@/lib/content-store";
import { nlRouteKeys } from "@/lib/site-data";
import { metadataFor } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "book-online") return {};
  const pageKey = nlRouteKeys[slug];
  if (!pageKey) return {};
  return metadataFor(pageKey, "nl", await loadPublicContent());
}

export default async function DutchPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "book-online") redirect("/offerte");
  const pageKey = nlRouteKeys[slug];
  if (!pageKey) notFound();
  return <PublicSite locale="nl" pageKey={pageKey} data={await loadPublicContent()} />;
}

