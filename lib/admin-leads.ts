import type { Lead, LeadStatus, LeadSummary } from "./types";

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  service: string;
  project_description: string;
  preferred_contact: string;
  status: LeadStatus;
  notification_status: string;
  consent_at: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

function eligibleForDeletion(row: LeadRow) {
  const deletionDate = row.closed_at ? new Date(row.closed_at) : null;
  return row.status === "closed"
    && Boolean(deletionDate && deletionDate.getTime() <= Date.now() - 365 * 24 * 60 * 60 * 1000);
}

export function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    postcode: row.postcode,
    service: row.service,
    projectDescription: row.project_description,
    preferredContact: row.preferred_contact,
    status: row.status,
    notificationStatus: row.notification_status,
    consentAt: row.consent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    eligibleForDeletion: eligibleForDeletion(row),
  };
}

export function toLeadSummary(row: LeadRow): LeadSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    postcode: row.postcode,
    service: row.service,
    preferredContact: row.preferred_contact,
    status: row.status,
    notificationStatus: row.notification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    eligibleForDeletion: eligibleForDeletion(row),
  };
}
