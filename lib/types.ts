export type Locale = "nl" | "en";
export type PublicationStatus = "draft" | "published";
export type ContentType =
  | "page"
  | "service"
  | "project"
  | "partner"
  | "settings"
  | "claim";
export type LeadStatus = "new" | "contacted" | "closed";

export interface ContentMetadata {
  image?: string;
  mediaId?: string;
  category?: string;
  featured?: boolean;
  verified?: boolean;
  href?: string;
  seoTitleNl?: string;
  seoTitleEn?: string;
  seoDescriptionNl?: string;
  seoDescriptionEn?: string;
  phone?: string;
  phoneDisplay?: string;
  whatsapp?: string;
  email?: string;
  kvk?: string;
  instagram?: string;
  serviceAreaNl?: string;
  serviceAreaEn?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ContentEntry {
  id: string;
  contentType: ContentType;
  slug: string;
  status: PublicationStatus;
  titleNl: string;
  titleEn: string;
  summaryNl: string;
  summaryEn: string;
  bodyNl: string;
  bodyEn: string;
  metadata: ContentMetadata;
  sortOrder: number;
  updatedAt?: string;
}

export interface MediaAsset {
  id: string;
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  isPublic: boolean;
  altNl: string;
  altEn: string;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  service: string;
  projectDescription: string;
  preferredContact: string;
  status: LeadStatus;
  notificationStatus: string;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  eligibleForDeletion?: boolean;
  notes?: LeadNote[];
  media?: MediaAsset[];
}

export type LeadSummary = Omit<Lead, "projectDescription" | "consentAt" | "notes" | "media">;

export interface AdminOverview {
  stats: {
    published: number;
    drafts: number;
    newLeads: number;
    failedNotifications: number;
    media: number;
    missingAltText: number;
    draftClaims: number;
  };
  recentLeads: LeadSummary[];
}
