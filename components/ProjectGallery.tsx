"use client";

import { useEffect, useState } from "react";
import type { ContentEntry, Locale } from "@/lib/types";
import { getLocalized } from "@/lib/site-data";

const filters = ["all", "renovation", "custom", "finishing", "insulation", "electrical"];
const filterLabels = {
  nl: { all: "Alles", renovation: "Renovatie", custom: "Maatwerk", finishing: "Afwerking", insulation: "Isolatie", electrical: "Elektra" },
  en: { all: "All", renovation: "Renovation", custom: "Bespoke", finishing: "Finishes", insulation: "Insulation", electrical: "Electrical" },
};

function imageFor(project: ContentEntry) {
  return project.metadata.mediaId ? `/api/media/${project.metadata.mediaId}` : String(project.metadata.image ?? "");
}

export function ProjectGallery({ projects, locale, compact = false }: { projects: ContentEntry[]; locale: Locale; compact?: boolean }) {
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<ContentEntry | null>(null);
  const labels = filterLabels[locale];
  const filtered = projects.filter((project) => filter === "all" || project.metadata.category === filter);
  const shown = compact ? filtered.slice(0, 4) : filtered;

  useEffect(() => {
    if (!active) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setActive(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [active]);

  return (
    <>
      {!compact && (
        <div className="project-filters" role="group" aria-label={locale === "nl" ? "Projectfilters" : "Project filters"}>
          {filters.map((item) => (
            <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)} type="button">
              {labels[item as keyof typeof labels]}
            </button>
          ))}
        </div>
      )}
      <div className={compact ? "project-grid project-grid-compact" : "project-grid"}>
        {shown.map((project, index) => {
          const copy = getLocalized(project, locale);
          return (
            <button className="project-card" type="button" key={project.id} onClick={() => setActive(project)} aria-label={`${copy.title} — ${locale === "nl" ? "vergroot afbeelding" : "enlarge image"}`}>
              <img src={imageFor(project)} alt={copy.title} loading={index > 2 ? "lazy" : "eager"} />
              <span className="project-caption"><strong>{copy.title}</strong><small>{labels[(project.metadata.category ?? "all") as keyof typeof labels]}</small></span>
            </button>
          );
        })}
      </div>
      {active && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={getLocalized(active, locale).title}>
          <button type="button" className="lightbox-close" onClick={() => setActive(null)} aria-label={locale === "nl" ? "Sluiten" : "Close"}>×</button>
          <img src={imageFor(active)} alt={getLocalized(active, locale).title} />
          <p>{getLocalized(active, locale).title}</p>
        </div>
      )}
    </>
  );
}
