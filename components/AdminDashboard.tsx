"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  AdminOverview,
  ContentEntry,
  ContentMetadata,
  ContentType,
  Lead,
  LeadSummary,
  MediaAsset,
  PublicationStatus,
} from "@/lib/types";

type Section =
  | "dashboard"
  | "pages"
  | "services"
  | "projects"
  | "partners"
  | "media"
  | "leads"
  | "site-settings"
  | "legal";

type LocaleTab = "nl" | "en";
type Session = { configured: boolean; authenticated: boolean; username?: string | null };
type DeleteTarget = {
  kind: "content" | "media" | "lead";
  id: string;
  label: string;
  phrase: "DELETE" | "PERMANENTLY DELETE";
} | null;

const navigation: Array<{ section: Section; label: string; short: string }> = [
  { section: "dashboard", label: "Dashboard", short: "DB" },
  { section: "pages", label: "Pages", short: "PG" },
  { section: "services", label: "Services", short: "SV" },
  { section: "projects", label: "Projects", short: "PR" },
  { section: "partners", label: "Partners", short: "PT" },
  { section: "media", label: "Media", short: "MD" },
  { section: "leads", label: "Leads", short: "LD" },
  { section: "site-settings", label: "Site settings", short: "ST" },
  { section: "legal", label: "Legal & claims", short: "LG" },
];

const sectionCopy: Record<Section, { title: string; eyebrow: string; description: string }> = {
  dashboard: { title: "Dashboard", eyebrow: "Today at a glance", description: "Keep the website current and respond to new enquiries." },
  pages: { title: "Pages", eyebrow: "Website content", description: "Edit the core Dutch and English pages shown on the public website." },
  services: { title: "Services", eyebrow: "What Formica Bouw offers", description: "Maintain the five fixed services and their public presentation." },
  projects: { title: "Projects", eyebrow: "Portfolio", description: "Curate project stories, images and the work featured on the website." },
  partners: { title: "Partners", eyebrow: "Professional network", description: "Manage verified partner names, logos and destinations." },
  media: { title: "Media library", eyebrow: "Images", description: "Upload approved imagery and keep accessible descriptions complete." },
  leads: { title: "Leads", eyebrow: "Customer enquiries", description: "Follow up, add private notes and keep every request moving." },
  "site-settings": { title: "Site settings", eyebrow: "Business details", description: "Update the contact details used throughout both language versions." },
  legal: { title: "Legal & claims", eyebrow: "Review before publishing", description: "Maintain legal drafts and keep unverified claims out of the public site." },
};

const contentSections: Section[] = ["pages", "services", "projects", "partners", "site-settings", "legal"];
const fixedContentTypes: ContentType[] = ["page", "service", "settings", "claim"];

const emptyOverview: AdminOverview = {
  stats: {
    published: 0,
    drafts: 0,
    newLeads: 0,
    failedNotifications: 0,
    media: 0,
    missingAltText: 0,
    draftClaims: 0,
  },
  recentLeads: [],
};

const blankEntry = (contentType: ContentType, sortOrder = 0): ContentEntry => ({
  id: "",
  contentType,
  slug: "",
  status: "draft",
  titleNl: "",
  titleEn: "",
  summaryNl: "",
  summaryEn: "",
  bodyNl: "",
  bodyEn: "",
  metadata: {},
  sortOrder,
});

const serialiseEntry = (entry: ContentEntry) => JSON.stringify(entry);
const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, "");
const formatDate = (value: string, includeTime = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return includeTime
    ? date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

function parseLocation(): { section: Section; id: string } {
  if (typeof window === "undefined") return { section: "dashboard", id: "" };
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("section") as Section | null;
  return {
    section: navigation.some((item) => item.section === requested) ? requested! : "dashboard",
    id: params.get("id") ?? "",
  };
}

function writeLocation(section: Section, id = "", mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href);
  if (section === "dashboard") url.searchParams.delete("section");
  else url.searchParams.set("section", section);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", `${url.pathname}${url.search}`);
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (response.status === 401) {
    const refreshed = await fetch("/api/admin/session", { method: "PUT" });
    if (refreshed.ok) return api<T>(url, init);
    window.location.href = "/admin/login";
    throw new Error("Your session expired. Please sign in again.");
  }
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

function sectionEntries(section: Section, content: ContentEntry[]) {
  if (section === "pages") return content.filter((entry) => entry.contentType === "page" && !["privacy", "cookies"].includes(entry.slug));
  if (section === "services") return content.filter((entry) => entry.contentType === "service");
  if (section === "projects") return content.filter((entry) => entry.contentType === "project");
  if (section === "partners") return content.filter((entry) => entry.contentType === "partner");
  if (section === "site-settings") return content.filter((entry) => entry.contentType === "settings");
  if (section === "legal") return content.filter((entry) => entry.contentType === "claim" || (entry.contentType === "page" && ["privacy", "cookies"].includes(entry.slug)));
  return [];
}

function contentTypesForSection(section: Section): ContentType[] {
  if (section === "pages") return ["page"];
  if (section === "services") return ["service"];
  if (section === "projects") return ["project"];
  if (section === "partners") return ["partner"];
  if (section === "site-settings") return ["settings"];
  if (section === "legal") return ["page", "claim"];
  return [];
}

function sectionUsesMedia(section: Section) {
  return ["services", "projects", "partners", "media"].includes(section);
}

function StatusBadge({ status }: { status: PublicationStatus | Lead["status"] }) {
  return <span className={`fb-admin-status fb-admin-status--${status}`}>{status}</span>;
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fb-admin-empty">
      <span aria-hidden="true">+</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [routeId, setRouteId] = useState("");
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [content, setContent] = useState<ContentEntry[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<ContentEntry>(blankEntry("project"));
  const [baseline, setBaseline] = useState(serialiseEntry(blankEntry("project")));
  const [localeTab, setLocaleTab] = useState<LocaleTab>("nl");
  const [contentSearch, setContentSearch] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");
  const [search, setSearch] = useState("");
  const [leadStatus, setLeadStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const dirtyRef = useRef(false);
  const loadedContentTypesRef = useRef<Set<ContentType>>(new Set());
  const mediaLoadedRef = useRef(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const drawerWasOpenRef = useRef(false);
  const creatingRef = useRef(false);

  const isDirty = serialiseEntry(selected) !== baseline;
  const activeCopy = sectionCopy[section];
  const entries = useMemo(() => sectionEntries(section, content), [section, content]);
  const visibleEntries = useMemo(() => {
    const needle = contentSearch.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => `${entry.titleNl} ${entry.titleEn} ${entry.slug}`.toLowerCase().includes(needle));
  }, [contentSearch, entries]);
  const filteredMedia = useMemo(() => {
    const needle = mediaSearch.trim().toLowerCase();
    if (!needle) return media;
    return media.filter((item) => `${item.fileName} ${item.altNl} ${item.altEn}`.toLowerCase().includes(needle));
  }, [media, mediaSearch]);
  const selectedMedia = useMemo(() => media.find((item) => item.id === routeId), [media, routeId]);

  const loadOverview = useCallback(async () => {
    const result = await api<AdminOverview>("/api/admin/overview");
    setOverview(result);
    return result;
  }, []);

  const loadContentTypes = useCallback(async (types: ContentType[], force = false) => {
    const requested = force ? types : types.filter((type) => !loadedContentTypesRef.current.has(type));
    if (!requested.length) return [] as ContentEntry[];
    const results = await Promise.all(requested.map((type) =>
      api<{ entries: ContentEntry[] }>(`/api/admin/content?type=${encodeURIComponent(type)}`),
    ));
    const entries = results.flatMap((result) => result.entries);
    setContent((current) => [
      ...current.filter((entry) => !requested.includes(entry.contentType)),
      ...entries,
    ]);
    requested.forEach((type) => loadedContentTypesRef.current.add(type));
    return entries;
  }, []);

  const loadMedia = useCallback(async (force = false) => {
    if (mediaLoadedRef.current && !force) return [] as MediaAsset[];
    const result = await api<{ media: MediaAsset[] }>("/api/admin/media");
    setMedia(result.media);
    mediaLoadedRef.current = true;
    return result.media;
  }, []);

  const loadLeadList = useCallback(async (status: string, query: string) => {
    const params = new URLSearchParams({ mode: "list", status });
    if (query.trim()) params.set("search", query.trim());
    const result = await api<{ leads: LeadSummary[]; total: number }>(`/api/admin/leads?${params.toString()}`);
    setLeads(result.leads);
    setLeadsTotal(result.total);
    return result.leads;
  }, []);

  const loadLeadDetail = useCallback(async (id: string) => {
    const result = await api<{ lead: Lead }>(`/api/admin/leads?id=${encodeURIComponent(id)}`);
    setSelectedLead(result.lead);
    return result.lead;
  }, []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Session) => {
        const location = parseLocation();
        setSection(location.section);
        setRouteId(location.id);
        setSession(data);
        if (!data.authenticated) window.location.href = "/admin/login";
        else loadOverview().catch((error: Error) => setNotice(error.message));
      })
      .catch(() => setNotice("The secure session could not be checked."));
  }, [loadOverview]);

  useEffect(() => {
    if (!session?.authenticated) return;
    const types = contentTypesForSection(section);
    if (types.length) {
      loadContentTypes(types).catch((error: Error) => setNotice(error.message));
    }
    if (sectionUsesMedia(section)) {
      loadMedia().catch((error: Error) => setNotice(error.message));
    }
  }, [loadContentTypes, loadMedia, section, session?.authenticated]);

  useEffect(() => {
    if (!session?.authenticated || section !== "leads") return;
    const timeout = window.setTimeout(() => {
      loadLeadList(leadStatus, search).catch((error: Error) => setNotice(error.message));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [leadStatus, loadLeadList, search, section, session?.authenticated]);

  useEffect(() => {
    if (!session?.authenticated || section !== "leads" || !routeId) return;
    if (selectedLead?.id === routeId) return;
    let cancelled = false;
    api<{ lead: Lead }>(`/api/admin/leads?id=${encodeURIComponent(routeId)}`)
      .then((result) => { if (!cancelled) setSelectedLead(result.lead); })
      .catch((error: Error) => {
        if (cancelled) return;
        setNotice(error.message);
        setSelectedLead(null);
      });
    return () => { cancelled = true; };
  }, [routeId, section, selectedLead?.id, session?.authenticated]);

  useEffect(() => {
    dirtyRef.current = isDirty;
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    const onPopState = () => {
      const next = parseLocation();
      if (dirtyRef.current && !window.confirm("Discard your unsaved changes?")) {
        writeLocation(section, routeId, "push");
        return;
      }
      dirtyRef.current = false;
      creatingRef.current = false;
      setSelected(blankEntry("project"));
      setBaseline(serialiseEntry(blankEntry("project")));
      setSection(next.section);
      setRouteId(next.id);
      setSelectedLead(null);
      setDrawerOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [routeId, section]);

  useEffect(() => {
    if (!contentSections.includes(section) || !entries.length) return;
    if (creatingRef.current) return;
    const next = entries.find((entry) => entry.id === routeId) ?? entries[0];
    if (selected.id === next.id) return;
    if (dirtyRef.current) return;
    const copy = { ...next, metadata: { ...next.metadata } };
    setSelected(copy);
    setBaseline(serialiseEntry(copy));
    setRouteId(next.id);
    writeLocation(section, next.id, "replace");
  }, [content, entries, routeId, section, selected.id]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (deleteTarget) {
        setDeleteTarget(null);
        setDeleteConfirmation("");
      } else if (selectedLead || selectedMedia) {
        closeDetail();
      } else {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  });

  useEffect(() => {
    if (drawerOpen) {
      drawerWasOpenRef.current = true;
      const previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      sidebarCloseRef.current?.focus();
      const containFocus = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      window.addEventListener("keydown", containFocus);
      return () => {
        document.documentElement.style.overflow = previousOverflow;
        window.removeEventListener("keydown", containFocus);
      };
    }
    if (!drawerWasOpenRef.current) return;
    drawerWasOpenRef.current = false;
    menuButtonRef.current?.focus();
  }, [drawerOpen]);

  function navigate(nextSection: Section, id = "") {
    const leavesEditor = contentSections.includes(section) && (nextSection !== section || (id && id !== selected.id));
    const leavesCurrentEntry = leavesEditor || creatingRef.current;
    if (isDirty && leavesCurrentEntry && !window.confirm("Discard your unsaved changes?")) return;
    if (leavesCurrentEntry) {
      dirtyRef.current = false;
      creatingRef.current = false;
      setSelected(blankEntry("project"));
      setBaseline(serialiseEntry(blankEntry("project")));
    }
    setSection(nextSection);
    setRouteId(id);
    setSelectedLead(null);
    setDrawerOpen(false);
    setContentSearch("");
    writeLocation(nextSection, id);
  }

  function selectEntry(entry: ContentEntry) {
    if (isDirty && selected.id !== entry.id && !window.confirm("Discard your unsaved changes?")) return;
    const copy = { ...entry, metadata: { ...entry.metadata } };
    creatingRef.current = false;
    setSelected(copy);
    setBaseline(serialiseEntry(copy));
    setRouteId(entry.id);
    setLocaleTab("nl");
    writeLocation(section, entry.id);
  }

  function createEntry(type: "project" | "partner") {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    const nextOrder = Math.max(0, ...content.filter((entry) => entry.contentType === type).map((entry) => entry.sortOrder)) + 1;
    const fresh = blankEntry(type, nextOrder);
    creatingRef.current = true;
    setSelected(fresh);
    setBaseline(serialiseEntry(fresh));
    setRouteId("");
    setLocaleTab("nl");
    writeLocation(type === "project" ? "projects" : "partners");
  }

  function updateSelected<K extends keyof ContentEntry>(key: K, value: ContentEntry[K]) {
    setSelected((current) => ({ ...current, [key]: value }));
  }

  function updateMetadata(key: string, value: string | number | boolean | undefined) {
    setSelected((current) => {
      const metadata: ContentMetadata = { ...current.metadata };
      if (value === undefined || value === "") delete metadata[key];
      else metadata[key] = value;
      return { ...current, metadata };
    });
  }

  function setMediaValue(value: string) {
    setSelected((current) => {
      const metadata = { ...current.metadata };
      if (!value) {
        delete metadata.mediaId;
        delete metadata.image;
      } else if (value.startsWith("media:")) {
        metadata.mediaId = value.slice(6);
        delete metadata.image;
      }
      return { ...current, metadata };
    });
  }

  async function persistContent(statusOverride?: PublicationStatus) {
    setBusy(true);
    setNotice("");
    try {
      const payload = { ...selected, status: statusOverride ?? selected.status };
      const method = selected.id ? "PATCH" : "POST";
      const result = await api<{ id?: string }>("/api/admin/content", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const id = selected.id || result.id || "";
      const [refreshed] = await Promise.all([
        loadContentTypes([payload.contentType], true),
        loadOverview(),
      ]);
      const saved = refreshed.find((entry) => entry.id === id);
      if (saved) {
        const copy = { ...saved, metadata: { ...saved.metadata } };
        creatingRef.current = false;
        setSelected(copy);
        setBaseline(serialiseEntry(copy));
        setRouteId(saved.id);
        writeLocation(section, saved.id, "replace");
      }
      setNotice(statusOverride === "published" ? "Published successfully." : "Changes saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The entry could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setNotice("");
    try {
      await api("/api/admin/media", { method: "POST", body: new FormData(form) });
      form.reset();
      await Promise.all([loadMedia(true), loadOverview()]);
      setNotice("Image uploaded to the media library.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The image could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function updateMedia(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          altNl: values.get("altNl"),
          altEn: values.get("altEn"),
          isPublic: values.get("isPublic") === "true",
        }),
      });
      await Promise.all([loadMedia(true), loadOverview()]);
      setNotice("Media details saved.");
      closeDetail();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The media details could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function updateLead(id: string, action: string, value?: string) {
    const body = action === "status" ? { id, action, status: value } : action === "note" ? { id, action, note: value } : { id, action };
    setBusy(true);
    try {
      await api("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await Promise.all([
        loadLeadList(leadStatus, search),
        loadLeadDetail(id),
        loadOverview(),
      ]);
      setNotice(action === "resend" ? "The notification was sent again." : "Lead updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The lead could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(target: NonNullable<DeleteTarget>) {
    setDeleteTarget(target);
    setDeleteConfirmation("");
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.phrase) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === "content") {
        await api("/api/admin/content", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id, confirmation: "DELETE" }),
        });
        const refreshed = await loadContentTypes([selected.contentType], true);
        await loadOverview();
        const remaining = sectionEntries(section, refreshed)[0];
        if (remaining) {
          const copy = { ...remaining, metadata: { ...remaining.metadata } };
          setSelected(copy);
          setBaseline(serialiseEntry(copy));
          setRouteId(remaining.id);
          writeLocation(section, remaining.id, "replace");
        } else {
          setRouteId("");
          writeLocation(section, "", "replace");
        }
        setNotice("Entry permanently deleted.");
      } else if (deleteTarget.kind === "media") {
        await api("/api/admin/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id, confirmation: "DELETE" }),
        });
        await Promise.all([loadMedia(true), loadOverview()]);
        closeDetail();
        setNotice("Media permanently deleted.");
      } else {
        await api("/api/admin/leads", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id, confirmation: "PERMANENTLY DELETE" }),
        });
        await Promise.all([loadLeadList(leadStatus, search), loadOverview()]);
        closeDetail();
        setNotice("Lead and attached files permanently deleted.");
      }
      setDeleteTarget(null);
      setDeleteConfirmation("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Deletion failed.");
      setDeleteTarget(null);
      setDeleteConfirmation("");
    } finally {
      setBusy(false);
    }
  }

  function openDetail(id: string) {
    if (section === "leads") setSelectedLead(null);
    setRouteId(id);
    writeLocation(section, id);
  }

  function closeDetail() {
    setSelectedLead(null);
    setRouteId("");
    writeLocation(section, "", "replace");
  }

  async function signOut() {
    if (isDirty && !window.confirm("Discard your unsaved changes and sign out?")) return;
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  if (!session?.authenticated) {
    return <main className="admin-loading">Checking secure session…</main>;
  }

  return (
    <main className="fb-admin">
      <button
        className={`fb-admin-sidebar-shade ${drawerOpen ? "is-visible" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-label="Close navigation"
        tabIndex={drawerOpen ? 0 : -1}
      />

      <aside ref={sidebarRef} className={`fb-admin-sidebar ${drawerOpen ? "is-open" : ""}`} id="admin-navigation">
        <div className="fb-admin-brand-row">
          <Link className="fb-admin-brand" href="/" aria-label="Formica Bouw website">
            <img src="/media/brand/logo.png" alt="" />
            <span>Formica Bouw<small>Content studio</small></span>
          </Link>
          <button ref={sidebarCloseRef} className="fb-admin-sidebar-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">×</button>
        </div>

        <nav className="fb-admin-nav" aria-label="Admin navigation">
          {navigation.map((item) => {
            const count = item.section === "leads" && overview.stats.newLeads
              ? overview.stats.newLeads
              : item.section === "legal" && overview.stats.draftClaims
                ? overview.stats.draftClaims
                : 0;
            return (
              <button key={item.section} className={section === item.section ? "is-active" : ""} onClick={() => navigate(item.section)}>
                <span className="fb-admin-nav-icon" aria-hidden="true">{item.short}</span>
                <span>{item.label}</span>
                {count > 0 && <strong aria-label={`${count} items need attention`}>{count}</strong>}
              </button>
            );
          })}
        </nav>

        <div className="fb-admin-account">
          <span className="fb-admin-avatar" aria-hidden="true">{(session.username || "A").slice(0, 1).toUpperCase()}</span>
          <div><small>Signed in as</small><strong>{session.username}</strong></div>
          <button onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <section className="fb-admin-workspace">
        <header className="fb-admin-topbar">
          <button
            ref={menuButtonRef}
            className="fb-admin-menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="admin-navigation"
          ><span /><span /><span /></button>
          <div>
            <p>{activeCopy.eyebrow}</p>
            <h1>{activeCopy.title}</h1>
            <span>{activeCopy.description}</span>
          </div>
          <Link className="fb-admin-view-site" href="/" target="_blank" rel="noreferrer">View website <span aria-hidden="true">↗</span></Link>
        </header>

        {notice && (
          <div className="fb-admin-notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button>
          </div>
        )}

        {section === "dashboard" && (
          <Dashboard
            overview={overview}
            session={session}
            onNavigate={navigate}
            onOpenLead={(id) => { setSelectedLead(null); setSection("leads"); setRouteId(id); writeLocation("leads", id); }}
          />
        )}

        {contentSections.includes(section) && (
          <ContentWorkspace
            section={section}
            entries={visibleEntries}
            selected={selected}
            localeTab={localeTab}
            media={media}
            search={contentSearch}
            isDirty={isDirty}
            busy={busy}
            onSearch={setContentSearch}
            onSelect={selectEntry}
            onCreate={createEntry}
            onLocale={setLocaleTab}
            onUpdate={updateSelected}
            onMetadata={updateMetadata}
            onMedia={setMediaValue}
            onSave={() => persistContent()}
            onPublish={() => persistContent("published")}
            onDelete={(entry) => requestDelete({ kind: "content", id: entry.id, label: entry.titleEn || entry.slug, phrase: "DELETE" })}
          />
        )}

        {section === "media" && (
          <MediaWorkspace
            media={filteredMedia}
            search={mediaSearch}
            busy={busy}
            onSearch={setMediaSearch}
            onUpload={uploadMedia}
            onSelect={openDetail}
          />
        )}

        {section === "leads" && (
          <LeadsWorkspace
            leads={leads}
            total={leadsTotal}
            search={search}
            status={leadStatus}
            onSearch={setSearch}
            onStatus={setLeadStatus}
            onSelect={openDetail}
          />
        )}
      </section>

      {selectedMedia && section === "media" && (
        <MediaDrawer
          item={selectedMedia}
          busy={busy}
          onClose={closeDetail}
          onSave={updateMedia}
          onDelete={(item) => requestDelete({ kind: "media", id: item.id, label: item.fileName, phrase: "DELETE" })}
        />
      )}

      {selectedLead && selectedLead.id === routeId && section === "leads" && (
        <LeadDrawer
          lead={selectedLead}
          busy={busy}
          onClose={closeDetail}
          onUpdate={updateLead}
          onDelete={(lead) => requestDelete({ kind: "lead", id: lead.id, label: lead.name, phrase: "PERMANENTLY DELETE" })}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          target={deleteTarget}
          value={deleteConfirmation}
          busy={busy}
          onChange={setDeleteConfirmation}
          onCancel={() => { setDeleteTarget(null); setDeleteConfirmation(""); }}
          onConfirm={confirmDelete}
        />
      )}
    </main>
  );
}

function Dashboard({
  overview,
  session,
  onNavigate,
  onOpenLead,
}: {
  overview: AdminOverview;
  session: Session;
  onNavigate: (section: Section, id?: string) => void;
  onOpenLead: (id: string) => void;
}) {
  const { stats, recentLeads } = overview;
  const attention = stats.drafts + stats.missingAltText + stats.failedNotifications;
  return (
    <div className="fb-admin-dashboard">
      <section className="fb-admin-metrics" aria-label="Website summary">
        <button onClick={() => onNavigate("pages")}><span>Published</span><strong>{stats.published}</strong><small>Live content entries</small></button>
        <button onClick={() => onNavigate("legal")}><span>Drafts</span><strong>{stats.drafts}</strong><small>Waiting for review</small></button>
        <button onClick={() => onNavigate("leads")} className={stats.newLeads ? "is-highlighted" : ""}><span>New leads</span><strong>{stats.newLeads}</strong><small>Need a response</small></button>
        <button onClick={() => onNavigate("media")}><span>Media issues</span><strong>{stats.missingAltText}</strong><small>Missing alt text</small></button>
      </section>

      <div className="fb-admin-dashboard-grid">
        <section className="fb-admin-card fb-admin-card--leads">
          <div className="fb-admin-card-heading">
            <div><p>Customer enquiries</p><h2>Latest leads</h2></div>
            <button onClick={() => onNavigate("leads")}>View all</button>
          </div>
          {recentLeads.length ? (
            <div className="fb-admin-recent-leads">
              {recentLeads.map((lead) => (
                <button key={lead.id} onClick={() => onOpenLead(lead.id)}>
                  <span className="fb-admin-avatar" aria-hidden="true">{lead.name.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{lead.name}</strong><small>{lead.service || "General enquiry"} · {lead.postcode || "No postcode"}</small></span>
                  <time>{formatDate(lead.createdAt)}</time>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          ) : <EmptyState title="Inbox clear">Customer enquiries will appear here.</EmptyState>}
        </section>

        <section className="fb-admin-card fb-admin-attention">
          <div className="fb-admin-card-heading"><div><p>Quality control</p><h2>Needs attention</h2></div><strong>{attention}</strong></div>
          <button onClick={() => onNavigate("legal")}><span className={stats.drafts ? "is-warning" : "is-complete"} aria-hidden="true">{stats.drafts ? "!" : "✓"}</span><span><strong>{stats.drafts} draft entries</strong><small>Review before publishing</small></span></button>
          <button onClick={() => onNavigate("media")}><span className={stats.missingAltText ? "is-warning" : "is-complete"} aria-hidden="true">{stats.missingAltText ? "!" : "✓"}</span><span><strong>{stats.missingAltText} incomplete images</strong><small>Dutch or English alt text is missing</small></span></button>
          <button onClick={() => onNavigate("leads")}><span className={stats.failedNotifications ? "is-danger" : "is-complete"} aria-hidden="true">{stats.failedNotifications ? "!" : "✓"}</span><span><strong>{stats.failedNotifications} email notifications need attention</strong><small>Lead data remains safely stored</small></span></button>
          <div className="fb-admin-auth-state"><span className={session.configured ? "is-complete" : "is-danger"} aria-hidden="true">{session.configured ? "✓" : "!"}</span><span><strong>Superadmin access</strong><small>{session.configured ? "Private sign-in is configured" : "Credentials require configuration"}</small></span></div>
        </section>

        <section className="fb-admin-card fb-admin-quick-actions">
          <div className="fb-admin-card-heading"><div><p>Shortcuts</p><h2>Quick actions</h2></div></div>
          <div>
            <button onClick={() => onNavigate("projects")}><span aria-hidden="true">PR</span><strong>Curate projects</strong><small>Choose the work featured on the homepage</small></button>
            <button onClick={() => onNavigate("partners")}><span aria-hidden="true">PT</span><strong>Review partners</strong><small>Keep names and logos verified</small></button>
            <button onClick={() => onNavigate("site-settings")}><span aria-hidden="true">ST</span><strong>Business details</strong><small>Phone, email, Instagram and service area</small></button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ContentWorkspace({
  section,
  entries,
  selected,
  localeTab,
  media,
  search,
  isDirty,
  busy,
  onSearch,
  onSelect,
  onCreate,
  onLocale,
  onUpdate,
  onMetadata,
  onMedia,
  onSave,
  onPublish,
  onDelete,
}: {
  section: Section;
  entries: ContentEntry[];
  selected: ContentEntry;
  localeTab: LocaleTab;
  media: MediaAsset[];
  search: string;
  isDirty: boolean;
  busy: boolean;
  onSearch: (value: string) => void;
  onSelect: (entry: ContentEntry) => void;
  onCreate: (type: "project" | "partner") => void;
  onLocale: (locale: LocaleTab) => void;
  onUpdate: <K extends keyof ContentEntry>(key: K, value: ContentEntry[K]) => void;
  onMetadata: (key: string, value: string | number | boolean | undefined) => void;
  onMedia: (value: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onDelete: (entry: ContentEntry) => void;
}) {
  const canCreate = section === "projects" || section === "partners";
  const isFixed = Boolean(selected.id && fixedContentTypes.includes(selected.contentType));
  const isSettings = selected.contentType === "settings";
  const isClaim = selected.contentType === "claim";
  const showMedia = ["service", "project", "partner"].includes(selected.contentType);
  const localImage = selected.metadata.image ? String(selected.metadata.image) : "";
  const currentMedia = selected.metadata.mediaId ? `media:${selected.metadata.mediaId}` : localImage ? "local" : "";
  const locale = localeTab === "nl" ? "Dutch" : "English";
  const titleKey = localeTab === "nl" ? "titleNl" : "titleEn";
  const summaryKey = localeTab === "nl" ? "summaryNl" : "summaryEn";
  const bodyKey = localeTab === "nl" ? "bodyNl" : "bodyEn";
  const seoTitleKey = localeTab === "nl" ? "seoTitleNl" : "seoTitleEn";
  const seoDescriptionKey = localeTab === "nl" ? "seoDescriptionNl" : "seoDescriptionEn";
  const imagePreview = selected.metadata.mediaId
    ? `/api/media/${selected.metadata.mediaId}`
    : localImage;

  return (
    <div className="fb-admin-content-layout">
      <aside className="fb-admin-entry-list" aria-label={`${sectionCopy[section].title} list`}>
        <div className="fb-admin-entry-tools">
          <label><span className="fb-admin-sr-only">Search entries</span><input type="search" placeholder="Search…" value={search} onChange={(event) => onSearch(event.target.value)} /></label>
          {canCreate && <button className="fb-admin-icon-button" onClick={() => onCreate(section === "projects" ? "project" : "partner")} aria-label={`Add ${section === "projects" ? "project" : "partner"}`}>+</button>}
        </div>
        <p className="fb-admin-list-count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
        <div className="fb-admin-entry-scroll">
          {entries.map((entry) => (
            <button key={entry.id} className={selected.id === entry.id ? "is-active" : ""} onClick={() => onSelect(entry)}>
              <span><strong>{entry.titleEn || entry.titleNl || entry.slug}</strong><small>/{entry.slug}</small></span>
              <StatusBadge status={entry.status} />
            </button>
          ))}
          {!entries.length && <p className="fb-admin-list-empty">No matching entries.</p>}
        </div>
      </aside>

      <form className="fb-admin-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div className="fb-admin-editor-heading">
          <div>
            <p>{selected.id ? "Editing entry" : `New ${selected.contentType}`}</p>
            <h2>{selected.titleEn || selected.titleNl || "Untitled entry"}</h2>
            <div><StatusBadge status={selected.status} />{isDirty && <span className="fb-admin-unsaved">Unsaved changes</span>}</div>
          </div>
          {isFixed && <span className="fb-admin-lock"><span aria-hidden="true">●</span> System record</span>}
        </div>

        {section === "legal" && (
          <div className="fb-admin-warning-box">
            <strong>Review required</strong>
            <p>Legal text and commercial claims must be approved by the business or legal owner before publication.</p>
          </div>
        )}

        {isSettings ? (
          <SettingsEditor selected={selected} onUpdate={onUpdate} onMetadata={onMetadata} />
        ) : (
          <>
            <section className="fb-admin-editor-section">
              <div className="fb-admin-section-heading"><div><h3>General</h3><p>Internal structure and publication order.</p></div></div>
              <div className="fb-admin-field-grid">
                <label>Slug<input value={selected.slug} disabled={isFixed} onChange={(event) => onUpdate("slug", event.target.value)} required /></label>
                <label>Sort order<input type="number" min="0" max="9999" value={selected.sortOrder} onChange={(event) => onUpdate("sortOrder", Number(event.target.value))} /></label>
              </div>
              {isFixed && <p className="fb-admin-field-note">The slug and content type are locked because the website relies on this record.</p>}
            </section>

            <section className="fb-admin-editor-section">
              <div className="fb-admin-section-heading">
                <div><h3>Public content</h3><p>Edit one language at a time. Both versions should be complete before publishing.</p></div>
                <div className="fb-admin-locale-tabs" role="tablist" aria-label="Content language">
                  <button type="button" role="tab" aria-selected={localeTab === "nl"} className={localeTab === "nl" ? "is-active" : ""} onClick={() => onLocale("nl")}><span>NL</span>Dutch</button>
                  <button type="button" role="tab" aria-selected={localeTab === "en"} className={localeTab === "en" ? "is-active" : ""} onClick={() => onLocale("en")}><span>EN</span>English</button>
                </div>
              </div>
              <div className="fb-admin-language-panel" role="tabpanel">
                <label>{locale} title<input value={String(selected[titleKey])} onChange={(event) => onUpdate(titleKey, event.target.value)} /></label>
                <label>{locale} summary<textarea rows={3} value={String(selected[summaryKey])} onChange={(event) => onUpdate(summaryKey, event.target.value)} /></label>
                {selected.contentType !== "partner" && <label>{locale} body<textarea rows={selected.contentType === "page" || selected.contentType === "claim" ? 10 : 7} value={String(selected[bodyKey])} onChange={(event) => onUpdate(bodyKey, event.target.value)} /></label>}
              </div>
            </section>

            {showMedia && (
              <section className="fb-admin-editor-section">
                <div className="fb-admin-section-heading"><div><h3>Presentation</h3><p>Choose the image and display options used on the public website.</p></div></div>
                <div className="fb-admin-media-field">
                  <div className="fb-admin-image-preview">{imagePreview ? <img src={imagePreview} alt="Selected preview" /> : <span>No image selected</span>}</div>
                  <div>
                    <label>Image
                      <select value={currentMedia} onChange={(event) => onMedia(event.target.value)}>
                        <option value="">No image</option>
                        {localImage && <option value="local" disabled>Current site asset: {localImage}</option>}
                        {media.filter((item) => item.isPublic).map((item) => <option value={`media:${item.id}`} key={item.id}>{item.fileName}</option>)}
                      </select>
                    </label>
                    {localImage && <p className="fb-admin-field-note">This entry uses the existing site asset <code>{localImage}</code>. Selecting a media-library image will replace it.</p>}
                    {(selected.contentType === "service" || selected.contentType === "project") && (
                      <label>Category
                        <select value={String(selected.metadata.category ?? "renovation")} onChange={(event) => onMetadata("category", event.target.value)}>
                          <option value="renovation">Bathroom & renovation</option>
                          <option value="insulation">Insulation</option>
                          <option value="custom">Bespoke interiors</option>
                          <option value="finishing">Finishing</option>
                          <option value="electrical">Electrical</option>
                        </select>
                      </label>
                    )}
                    {selected.contentType === "project" && <div className="fb-admin-check"><input id="admin-featured" type="checkbox" checked={Boolean(selected.metadata.featured)} onChange={(event) => onMetadata("featured", event.target.checked)} /><span><label htmlFor="admin-featured">Featured project</label><small>Eligible for prominent placement on the homepage.</small></span></div>}
                    {selected.contentType === "partner" && <label>Partner website URL<input type="url" placeholder="https://…" value={String(selected.metadata.href ?? "")} onChange={(event) => onMetadata("href", event.target.value)} /></label>}
                  </div>
                </div>
              </section>
            )}

            {selected.contentType !== "partner" && (
              <section className="fb-admin-editor-section">
                <div className="fb-admin-section-heading"><div><h3>Search preview</h3><p>Optional page title and description for {locale.toLowerCase()} search results.</p></div></div>
                <label>SEO title<input maxLength={70} value={String(selected.metadata[seoTitleKey] ?? "")} onChange={(event) => onMetadata(seoTitleKey, event.target.value)} /><small>{String(selected.metadata[seoTitleKey] ?? "").length}/70</small></label>
                <label>SEO description<textarea rows={3} maxLength={170} value={String(selected.metadata[seoDescriptionKey] ?? "")} onChange={(event) => onMetadata(seoDescriptionKey, event.target.value)} /><small>{String(selected.metadata[seoDescriptionKey] ?? "").length}/170</small></label>
              </section>
            )}
          </>
        )}

        <footer className="fb-admin-savebar">
          <div><StatusBadge status={selected.status} /><span>{isDirty ? "Changes have not been saved." : "Everything is up to date."}</span></div>
          <div>
            {selected.id && !isFixed && <button type="button" className="fb-admin-button fb-admin-button--danger" onClick={() => onDelete(selected)}>Delete</button>}
            <button type="submit" className="fb-admin-button fb-admin-button--secondary" disabled={busy || !isDirty}>{busy ? "Saving…" : "Save changes"}</button>
            {selected.status === "published" ? (
              <button type="button" className="fb-admin-button fb-admin-button--secondary" disabled={busy} onClick={() => onUpdate("status", "draft")}>Move to draft</button>
            ) : !isClaim ? (
              <button type="button" className="fb-admin-button fb-admin-button--primary" disabled={busy} onClick={onPublish}>Publish</button>
            ) : <span className="fb-admin-field-note">Claims stay in draft until reviewed.</span>}
          </div>
        </footer>
      </form>
    </div>
  );
}

function SettingsEditor({
  selected,
  onUpdate,
  onMetadata,
}: {
  selected: ContentEntry;
  onUpdate: <K extends keyof ContentEntry>(key: K, value: ContentEntry[K]) => void;
  onMetadata: (key: string, value: string | number | boolean | undefined) => void;
}) {
  return (
    <>
      <section className="fb-admin-editor-section">
        <div className="fb-admin-section-heading"><div><h3>Brand</h3><p>The company name and short positioning line.</p></div></div>
        <label>Company name<input value={selected.titleEn} onChange={(event) => { onUpdate("titleEn", event.target.value); onUpdate("titleNl", event.target.value); }} /></label>
        <div className="fb-admin-field-grid">
          <label>Dutch positioning<input value={selected.summaryNl} onChange={(event) => onUpdate("summaryNl", event.target.value)} /></label>
          <label>English positioning<input value={selected.summaryEn} onChange={(event) => onUpdate("summaryEn", event.target.value)} /></label>
        </div>
      </section>
      <section className="fb-admin-editor-section">
        <div className="fb-admin-section-heading"><div><h3>Contact details</h3><p>These details appear in navigation, calls to action and the contact page.</p></div></div>
        <div className="fb-admin-field-grid">
          <label>Phone display<input placeholder="06 17 48 08 56" value={String(selected.metadata.phoneDisplay ?? "")} onChange={(event) => onMetadata("phoneDisplay", event.target.value)} /></label>
          <label>Phone link<input placeholder="+31617480856" value={String(selected.metadata.phone ?? "")} onChange={(event) => onMetadata("phone", event.target.value)} /></label>
          <label>WhatsApp number<input placeholder="+31617480856" value={String(selected.metadata.whatsapp ?? "")} onChange={(event) => onMetadata("whatsapp", event.target.value)} /></label>
          <label>Email address<input type="email" value={String(selected.metadata.email ?? "")} onChange={(event) => onMetadata("email", event.target.value)} /></label>
          <label>Chamber of Commerce (KvK)<input value={String(selected.metadata.kvk ?? "")} onChange={(event) => onMetadata("kvk", event.target.value)} /></label>
          <label>Instagram URL<input type="url" value={String(selected.metadata.instagram ?? "")} onChange={(event) => onMetadata("instagram", event.target.value)} /></label>
        </div>
      </section>
      <section className="fb-admin-editor-section">
        <div className="fb-admin-section-heading"><div><h3>Service area</h3><p>How the operating area is described on each language version.</p></div></div>
        <div className="fb-admin-field-grid">
          <label>Dutch service area<input value={String(selected.metadata.serviceAreaNl ?? "")} onChange={(event) => onMetadata("serviceAreaNl", event.target.value)} /></label>
          <label>English service area<input value={String(selected.metadata.serviceAreaEn ?? "")} onChange={(event) => onMetadata("serviceAreaEn", event.target.value)} /></label>
        </div>
      </section>
    </>
  );
}

function MediaWorkspace({ media, search, busy, onSearch, onUpload, onSelect }: {
  media: MediaAsset[];
  search: string;
  busy: boolean;
  onSearch: (value: string) => void;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="fb-admin-media-workspace">
      <form className="fb-admin-upload-card" onSubmit={onUpload}>
        <div><p>Add to library</p><h2>Upload an image</h2><span>JPEG, PNG or WebP. Maximum 8 MB.</span></div>
        <div className="fb-admin-file-field"><input id="admin-media-upload" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><label htmlFor="admin-media-upload">Choose image<small>Drop a file here or browse your device</small></label></div>
        <div className="fb-admin-field-grid">
          <label>Dutch alt text<input name="altNl" placeholder="Describe what is visible" /></label>
          <label>English alt text<input name="altEn" placeholder="Describe what is visible" /></label>
        </div>
        <div className="fb-admin-upload-actions"><div className="fb-admin-check"><input id="admin-media-public" name="isPublic" type="checkbox" value="true" defaultChecked /><span><label htmlFor="admin-media-public">Available on public website</label><small>Turn off for private admin or lead imagery.</small></span></div><button className="fb-admin-button fb-admin-button--primary" disabled={busy}>{busy ? "Uploading…" : "Upload image"}</button></div>
      </form>

      <section className="fb-admin-library">
        <div className="fb-admin-library-heading"><div><p>Library</p><h2>{media.length} images</h2></div><label><span className="fb-admin-sr-only">Search media</span><input type="search" placeholder="Search filenames or alt text…" value={search} onChange={(event) => onSearch(event.target.value)} /></label></div>
        {media.length ? (
          <div className="fb-admin-media-grid">
            {media.map((item) => {
              const incomplete = item.isPublic && (!item.altNl.trim() || !item.altEn.trim());
              return (
                <button key={item.id} onClick={() => onSelect(item.id)}>
                  <span className="fb-admin-media-thumb"><img src={`/api/media/${item.id}`} alt={item.altEn || item.fileName} />{incomplete && <span>Alt text needed</span>}</span>
                  <span><strong>{item.fileName}</strong><small>{Math.round(item.size / 1024)} KB · {item.isPublic ? "Public" : "Private"}</small></span>
                </button>
              );
            })}
          </div>
        ) : <EmptyState title="No images found">Upload an image or adjust your search.</EmptyState>}
      </section>
    </div>
  );
}

function LeadsWorkspace({ leads, total, search, status, onSearch, onStatus, onSelect }: {
  leads: LeadSummary[];
  total: number;
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="fb-admin-leads-workspace">
      <div className="fb-admin-lead-toolbar">
        <label><span className="fb-admin-sr-only">Search leads</span><input type="search" placeholder="Search name, email, phone or postcode…" value={search} onChange={(event) => onSearch(event.target.value)} /></label>
        <label><span className="fb-admin-sr-only">Filter by status</span><select value={status} onChange={(event) => onStatus(event.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>
        <form action="/api/admin/export" method="get">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="search" value={search} />
          <button className="fb-admin-button fb-admin-button--secondary">Export CSV</button>
        </form>
      </div>
      <p className="fb-admin-list-count">{total} {total === 1 ? "lead" : "leads"}</p>
      <section className="fb-admin-table-card">
        {leads.length ? (
          <div className="fb-admin-table-scroll">
            <table>
              <thead><tr><th>Customer</th><th>Service</th><th>Contact preference</th><th>Status</th><th>Received</th><th><span className="fb-admin-sr-only">Open</span></th></tr></thead>
              <tbody>{leads.map((lead) => (
                <tr key={lead.id}>
                  <td><button className="fb-admin-customer" onClick={() => onSelect(lead.id)}><span className="fb-admin-avatar" aria-hidden="true">{lead.name.slice(0, 1).toUpperCase()}</span><span><strong>{lead.name}</strong><small>{lead.email}<br />{lead.postcode || "No postcode"}</small></span></button></td>
                  <td>{lead.service || "General enquiry"}</td>
                  <td className="fb-admin-capitalise">{lead.preferredContact || "Not specified"}</td>
                  <td><StatusBadge status={lead.status} />{lead.notificationStatus !== "sent" && <span className="fb-admin-email-failed">Email needs attention</span>}</td>
                  <td><time>{formatDate(lead.createdAt)}</time></td>
                  <td><button className="fb-admin-row-open" onClick={() => onSelect(lead.id)} aria-label={`Open ${lead.name}'s enquiry`}>→</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No leads found">New quote requests will appear here. Try adjusting the filters.</EmptyState>}
      </section>
    </div>
  );
}

function DrawerShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawer.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", containFocus);
    return () => {
      window.removeEventListener("keydown", containFocus);
      previous?.focus();
    };
  }, []);
  return (
    <div className="fb-admin-drawer-layer">
      <button className="fb-admin-drawer-shade" onClick={onClose} aria-label="Close details" />
      <aside ref={drawer} className="fb-admin-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header><div><p>{eyebrow}</p><h2 id="drawer-title">{title}</h2></div><button ref={closeButton} onClick={onClose} aria-label="Close details">×</button></header>
        {children}
      </aside>
    </div>
  );
}

function MediaDrawer({ item, busy, onClose, onSave, onDelete }: {
  item: MediaAsset;
  busy: boolean;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>, id: string) => void;
  onDelete: (item: MediaAsset) => void;
}) {
  return (
    <DrawerShell title={item.fileName} eyebrow="Media details" onClose={onClose}>
      <form className="fb-admin-drawer-body" onSubmit={(event) => onSave(event, item.id)}>
        <img className="fb-admin-drawer-image" src={`/api/media/${item.id}`} alt={item.altEn || item.fileName} />
        <div className="fb-admin-file-facts"><span>{item.contentType}</span><span>{Math.round(item.size / 1024)} KB</span><span>{formatDate(item.createdAt)}</span></div>
        <label>Dutch alt text<textarea name="altNl" rows={3} defaultValue={item.altNl} placeholder="Describe the image in Dutch" /></label>
        <label>English alt text<textarea name="altEn" rows={3} defaultValue={item.altEn} placeholder="Describe the image in English" /></label>
        <label>Visibility<select name="isPublic" defaultValue={item.isPublic ? "true" : "false"}><option value="true">Public website</option><option value="false">Private admin/lead</option></select></label>
        <div className="fb-admin-drawer-actions"><button type="button" className="fb-admin-button fb-admin-button--danger" onClick={() => onDelete(item)}>Delete</button><button className="fb-admin-button fb-admin-button--primary" disabled={busy}>{busy ? "Saving…" : "Save details"}</button></div>
      </form>
    </DrawerShell>
  );
}

function LeadDrawer({ lead, busy, onClose, onUpdate, onDelete }: {
  lead: Lead;
  busy: boolean;
  onClose: () => void;
  onUpdate: (id: string, action: string, value?: string) => void;
  onDelete: (lead: Lead) => void;
}) {
  return (
    <DrawerShell title={lead.name} eyebrow={`Received ${formatDate(lead.createdAt)}`} onClose={onClose}>
      <div className="fb-admin-drawer-body">
        <section className="fb-admin-lead-summary">
          <div><StatusBadge status={lead.status} />{lead.notificationStatus !== "sent" && <span className="fb-admin-email-failed">Email notification needs attention</span>}</div>
          <label>Status<select value={lead.status} onChange={(event) => onUpdate(lead.id, "status", event.target.value)} disabled={busy}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>
        </section>
        <section className="fb-admin-drawer-section">
          <h3>Contact</h3>
          <div className="fb-admin-contact-actions">
            {lead.phone && <a href={`https://wa.me/${cleanPhone(lead.phone)}`} target="_blank" rel="noreferrer"><span aria-hidden="true">WA</span><strong>WhatsApp</strong><small>{lead.phone}</small></a>}
            {lead.phone && <a href={`tel:${lead.phone}`}><span aria-hidden="true">PH</span><strong>Call</strong><small>{lead.phone}</small></a>}
            <a href={`mailto:${lead.email}`}><span aria-hidden="true">EM</span><strong>Email</strong><small>{lead.email}</small></a>
          </div>
          <dl><div><dt>Postcode</dt><dd>{lead.postcode || "—"}</dd></div><div><dt>Preferred contact</dt><dd className="fb-admin-capitalise">{lead.preferredContact || "—"}</dd></div><div><dt>Consent recorded</dt><dd>{formatDate(lead.consentAt, true)}</dd></div></dl>
        </section>
        <section className="fb-admin-drawer-section"><h3>Project request</h3><p className="fb-admin-service-label">{lead.service || "General enquiry"}</p><p className="fb-admin-project-description">{lead.projectDescription || "No project description supplied."}</p></section>
        {lead.media?.length ? <section className="fb-admin-drawer-section"><h3>Customer photos</h3><div className="fb-admin-lead-photos">{lead.media.map((item) => <a key={item.id} href={`/api/media/${item.id}`} target="_blank" rel="noreferrer"><img src={`/api/media/${item.id}`} alt={item.fileName} /></a>)}</div></section> : null}
        <section className="fb-admin-drawer-section">
          <div className="fb-admin-drawer-section-heading"><h3>Internal notes</h3><span>Only visible to admins</span></div>
          <form className="fb-admin-note-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const value = String(new FormData(form).get("note") || ""); onUpdate(lead.id, "note", value); form.reset(); }}><label><span className="fb-admin-sr-only">Add an internal note</span><textarea name="note" rows={3} placeholder="Add a private follow-up note…" required /></label><button className="fb-admin-button fb-admin-button--secondary" disabled={busy}>Add note</button></form>
          <div className="fb-admin-notes">{lead.notes?.map((note) => <article key={note.id}><p>{note.note}</p><time>{formatDate(note.createdAt, true)}</time></article>)}{!lead.notes?.length && <p className="fb-admin-field-note">No internal notes yet.</p>}</div>
        </section>
        {lead.notificationStatus !== "sent" && <section className="fb-admin-drawer-section fb-admin-notification-retry"><div><h3>Email notification</h3><p>The enquiry is saved, but the notification needs attention.</p></div><button className="fb-admin-button fb-admin-button--secondary" onClick={() => onUpdate(lead.id, "resend")} disabled={busy}>Retry notification</button></section>}
        {lead.eligibleForDeletion && <section className="fb-admin-drawer-section fb-admin-retention"><h3>Retention period complete</h3><p>This closed lead is more than 12 months old and can now be permanently removed.</p><button className="fb-admin-button fb-admin-button--danger" onClick={() => onDelete(lead)}>Permanently delete</button></section>}
      </div>
    </DrawerShell>
  );
}

function ConfirmDialog({ target, value, busy, onChange, onCancel, onConfirm }: {
  target: NonNullable<DeleteTarget>;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmationInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmationInput.current?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", containFocus);
    return () => {
      window.removeEventListener("keydown", containFocus);
      previous?.focus();
    };
  }, []);
  return (
    <div className="fb-admin-dialog-layer">
      <button className="fb-admin-dialog-shade" onClick={onCancel} aria-label="Cancel deletion" />
      <section ref={dialog} className="fb-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <span className="fb-admin-dialog-icon" aria-hidden="true">!</span>
        <p>Permanent action</p>
        <h2 id="delete-title">Delete “{target.label}”?</h2>
        <span>This cannot be undone. Type <strong>{target.phrase}</strong> to confirm.</span>
        <label><span className="fb-admin-sr-only">Confirmation phrase</span><input ref={confirmationInput} value={value} onChange={(event) => onChange(event.target.value)} placeholder={target.phrase} /></label>
        <div><button className="fb-admin-button fb-admin-button--secondary" onClick={onCancel}>Cancel</button><button className="fb-admin-button fb-admin-button--danger-solid" onClick={onConfirm} disabled={busy || value !== target.phrase}>{busy ? "Deleting…" : "Delete permanently"}</button></div>
      </section>
    </div>
  );
}
