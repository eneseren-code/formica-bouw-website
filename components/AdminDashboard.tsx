"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ContentEntry, Lead, MediaAsset } from "@/lib/types";

type Tab = "overview" | "content" | "media" | "leads" | "settings";
type Session = { configured: boolean; authenticated: boolean; username?: string | null };

const blankEntry: ContentEntry = {
  id: "", contentType: "page", slug: "", status: "draft", titleNl: "", titleEn: "", summaryNl: "", summaryEn: "",
  bodyNl: "", bodyEn: "", metadata: {}, sortOrder: 0,
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (response.status === 401) {
    const refreshed = await fetch("/api/admin/session", { method: "PUT" });
    if (refreshed.ok) return api<T>(url, init);
    window.location.href = "/admin/login";
    throw new Error("Session expired");
  }
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [content, setContent] = useState<ContentEntry[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<ContentEntry>(blankEntry);
  const [metadataText, setMetadataText] = useState("{}");
  const [search, setSearch] = useState("");
  const [leadStatus, setLeadStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    const [contentResult, mediaResult, leadsResult] = await Promise.all([
      api<{ entries: ContentEntry[] }>("/api/admin/content"),
      api<{ media: MediaAsset[] }>("/api/admin/media"),
      api<{ leads: Lead[] }>("/api/admin/leads"),
    ]);
    setContent(contentResult.entries);
    setMedia(mediaResult.media);
    setLeads(leadsResult.leads);
  }

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((response) => response.json()).then((data: Session) => {
      setSession(data);
      if (!data.authenticated) window.location.href = "/admin/login";
      else loadAll().catch((error: Error) => setNotice(error.message));
    });
  }, []);

  const published = content.filter((entry) => entry.status === "published").length;
  const draft = content.length - published;
  const filteredContent = useMemo(() => content.filter((entry) => tab !== "settings" || entry.contentType === "settings" || entry.contentType === "claim"), [content, tab]);
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const matchesStatus = leadStatus === "all" || lead.status === leadStatus;
    const haystack = `${lead.name} ${lead.email} ${lead.phone} ${lead.postcode} ${lead.service}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  }), [leads, leadStatus, search]);

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const metadata = JSON.parse(metadataText) as Record<string, string | number | boolean | undefined>;
      const method = selected.id ? "PATCH" : "POST";
      await api("/api/admin/content", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...selected, metadata }) });
      await loadAll(); setNotice("Content saved.");
      if (!selected.id) { setSelected(blankEntry); setMetadataText("{}"); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed"); }
    setBusy(false);
  }

  async function removeContent() {
    if (!selected.id || window.prompt("Type DELETE to permanently delete this content entry") !== "DELETE") return;
    await api("/api/admin/content", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, confirmation: "DELETE" }) });
    setSelected(blankEntry); await loadAll(); setNotice("Content deleted.");
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      await api("/api/admin/media", { method: "POST", body: new FormData(event.currentTarget) });
      event.currentTarget.reset(); await loadAll(); setNotice("Image uploaded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed"); }
    setBusy(false);
  }

  async function updateMedia(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await api("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, altNl: values.get("altNl"), altEn: values.get("altEn"), isPublic: values.get("isPublic") === "true" }) });
      await loadAll(); setNotice("Media details saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Media update failed"); }
  }

  async function deleteMedia(id: string) {
    if (window.prompt("Type DELETE to permanently remove this file") !== "DELETE") return;
    try {
      await api("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, confirmation: "DELETE" }) });
      await loadAll(); setNotice("Media deleted.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Media deletion failed"); }
  }

  async function updateLead(id: string, action: string, value?: string) {
    const body = action === "status" ? { id, action, status: value } : action === "note" ? { id, action, note: value } : { id, action };
    try { await api("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); await loadAll(); setNotice("Lead updated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Update failed"); }
  }

  async function deleteLead(id: string) {
    if (window.prompt("Type PERMANENTLY DELETE to erase this lead and its photos") !== "PERMANENTLY DELETE") return;
    await api("/api/admin/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, confirmation: "PERMANENTLY DELETE" }) });
    await loadAll(); setNotice("Lead permanently deleted.");
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  if (!session?.authenticated) return <main className="admin-loading">Checking secure session…</main>;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/"><img src="/media/brand/logo.png" alt="" /> Formica Bouw</Link>
        <nav aria-label="Admin navigation">
          {(["overview", "content", "media", "leads", "settings"] as Tab[]).map((item) => <button key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        </nav>
        <div className="admin-user"><small>Signed in as</small><span>{session.username}</span><button onClick={signOut}>Sign out</button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar"><div><p>Formica Bouw CMS</p><h1>{tab}</h1></div><Link href="/" target="_blank" rel="noreferrer">View website ↗</Link></header>
        {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        {tab === "overview" && <div className="admin-overview">
          <div className="admin-stats"><article><span>{published}</span><p>Published entries</p></article><article><span>{draft}</span><p>Draft entries</p></article><article><span>{leads.filter((lead) => lead.status === "new").length}</span><p>New leads</p></article><article><span>{media.length}</span><p>Uploaded files</p></article></div>
          <section className="admin-panel"><h2>Launch checklist</h2><ul><li className={session.configured ? "done" : ""}>Private superadmin authentication configured</li><li>Verify the Resend sending domain and API key</li><li>Review draft privacy and cookie text with the business/legal owner</li><li>Review all draft claims before publishing</li><li>No public deployment has been performed</li></ul></section>
        </div>}

        {(tab === "content" || tab === "settings") && <div className="admin-editor-layout">
          <section className="admin-list"><button className="admin-primary" onClick={() => { setSelected({ ...blankEntry, contentType: tab === "settings" ? "settings" : "page" }); setMetadataText("{}"); }}>+ New entry</button>
            {filteredContent.map((entry) => <button key={entry.id} className={selected.id === entry.id ? "is-active" : ""} onClick={() => { setSelected(entry); setMetadataText(JSON.stringify(entry.metadata, null, 2)); }}><span>{entry.titleEn || entry.slug}</span><small>{entry.contentType} · {entry.status}</small></button>)}
          </section>
          <form className="admin-editor" onSubmit={saveContent}>
            <div className="admin-form-row"><label>Content type<select value={selected.contentType} onChange={(event) => setSelected({ ...selected, contentType: event.target.value as ContentEntry["contentType"] })}>{["page", "service", "project", "partner", "settings", "claim"].map((type) => <option key={type}>{type}</option>)}</select></label><label>Status<select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as ContentEntry["status"] })}><option>draft</option><option>published</option></select></label></div>
            <div className="admin-form-row"><label>Slug<input value={selected.slug} onChange={(event) => setSelected({ ...selected, slug: event.target.value })} required /></label><label>Sort order<input type="number" value={selected.sortOrder} onChange={(event) => setSelected({ ...selected, sortOrder: Number(event.target.value) })} /></label></div>
            <div className="admin-locale-grid"><fieldset><legend>Dutch (NL)</legend><label>Title<input value={selected.titleNl} onChange={(event) => setSelected({ ...selected, titleNl: event.target.value })} /></label><label>Summary<textarea rows={4} value={selected.summaryNl} onChange={(event) => setSelected({ ...selected, summaryNl: event.target.value })} /></label><label>Body<textarea rows={10} value={selected.bodyNl} onChange={(event) => setSelected({ ...selected, bodyNl: event.target.value })} /></label></fieldset><fieldset><legend>English (EN)</legend><label>Title<input value={selected.titleEn} onChange={(event) => setSelected({ ...selected, titleEn: event.target.value })} /></label><label>Summary<textarea rows={4} value={selected.summaryEn} onChange={(event) => setSelected({ ...selected, summaryEn: event.target.value })} /></label><label>Body<textarea rows={10} value={selected.bodyEn} onChange={(event) => setSelected({ ...selected, bodyEn: event.target.value })} /></label></fieldset></div>
            <label>Metadata (JSON)<textarea className="admin-code" rows={8} value={metadataText} onChange={(event) => setMetadataText(event.target.value)} /></label>
            <div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save entry"}</button>{selected.id && <button type="button" className="admin-danger" onClick={removeContent}>Delete</button>}</div>
          </form>
        </div>}

        {tab === "media" && <div><form className="admin-panel admin-upload" onSubmit={uploadMedia}><h2>Upload image</h2><div className="admin-form-row"><label>Image (JPEG, PNG or WebP, max. 8 MB)<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Visibility<select name="isPublic" defaultValue="true"><option value="true">Public website</option><option value="false">Private admin/lead</option></select></label></div><div className="admin-form-row"><label>Dutch alt text<input name="altNl" /></label><label>English alt text<input name="altEn" /></label></div><button className="admin-primary" disabled={busy}>Upload</button></form>
          <div className="admin-media-grid">{media.map((item) => <article key={item.id}><img src={`/api/media/${item.id}`} alt={item.altEn || item.fileName} /><form onSubmit={(event) => updateMedia(event, item.id)}><strong>{item.fileName}</strong><small>{Math.round(item.size / 1024)} KB</small><code>/api/media/{item.id}</code><label>Dutch alt text<input name="altNl" defaultValue={item.altNl} /></label><label>English alt text<input name="altEn" defaultValue={item.altEn} /></label><label>Visibility<select name="isPublic" defaultValue={item.isPublic ? "true" : "false"}><option value="true">Public</option><option value="false">Private</option></select></label><div className="admin-form-actions"><button className="admin-secondary">Save</button><button type="button" className="admin-danger" onClick={() => deleteMedia(item.id)}>Delete</button></div></form></article>)}</div>
        </div>}

        {tab === "leads" && <div><div className="admin-lead-tools"><input placeholder="Search name, email, phone or postcode" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><form action="/api/admin/export" method="get"><button className="admin-primary">Export CSV</button></form></div>
          <div className="admin-leads">{filteredLeads.map((lead) => <details key={lead.id}><summary><span><strong>{lead.name}</strong><small>{lead.email} · {lead.postcode || "No postcode"}</small></span><span className={`lead-status ${lead.status}`}>{lead.status}</span><time>{new Date(lead.createdAt).toLocaleDateString("en-NL")}</time></summary><div className="lead-detail"><div><h3>Contact</h3><p><a href={`mailto:${lead.email}`}>{lead.email}</a><br /><a href={`tel:${lead.phone}`}>{lead.phone}</a><br />Preferred: {lead.preferredContact}</p><h3>Project</h3><p><strong>{lead.service}</strong><br />{lead.projectDescription}</p>{lead.media?.length ? <div className="lead-photos">{lead.media.map((item) => <a key={item.id} href={`/api/media/${item.id}`} target="_blank" rel="noreferrer"><img src={`/api/media/${item.id}`} alt={item.fileName} /></a>)}</div> : null}</div><div><label>Status<select value={lead.status} onChange={(event) => updateLead(lead.id, "status", event.target.value)}><option>new</option><option>contacted</option><option>closed</option></select></label><p className="notification-state">Email notification: <strong>{lead.notificationStatus}</strong></p>{lead.notificationStatus !== "sent" && <button className="admin-secondary" onClick={() => updateLead(lead.id, "resend")}>Retry notification</button>}<form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); updateLead(lead.id, "note", String(data.get("note") || "")); event.currentTarget.reset(); }}><label>Internal note<textarea name="note" rows={3} required /></label><button className="admin-secondary">Add note</button></form>{lead.notes?.map((note) => <p className="lead-note" key={note.id}>{note.note}<small>{new Date(note.createdAt).toLocaleString("en-NL")}</small></p>)}{lead.eligibleForDeletion && <button className="admin-danger" onClick={() => deleteLead(lead.id)}>Permanently delete</button>}</div></div></details>)}</div>
        </div>}
      </section>
    </main>
  );
}
