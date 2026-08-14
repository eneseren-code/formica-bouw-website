"use client";

import { useEffect, useRef, useState } from "react";
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
  const lightbox = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const labels = filterLabels[locale];
  const filtered = projects.filter((project) => filter === "all" || project.metadata.category === filter);
  const shown = compact ? filtered.slice(0, 4) : filtered;

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeButton.current?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActive(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(lightbox.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? []);
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
      previousFocus?.focus();
    };
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
      <div className={compact ? "project-grid project-grid-compact" : "project-grid"} data-reveal-group>
        {shown.map((project, index) => {
          const copy = getLocalized(project, locale);
          return (
            <button className="project-card" type="button" key={project.id} data-motion-item onClick={() => setActive(project)} aria-label={`${copy.title} — ${locale === "nl" ? "vergroot afbeelding" : "enlarge image"}`}>
              <img src={imageFor(project)} alt={copy.title} loading={index > 2 ? "lazy" : "eager"} />
              <span className="project-caption"><strong>{copy.title}</strong><small>{labels[(project.metadata.category ?? "all") as keyof typeof labels]}</small></span>
            </button>
          );
        })}
      </div>
      {active && (
        <div ref={lightbox} className="lightbox" role="dialog" aria-modal="true" aria-label={getLocalized(active, locale).title}>
          <button ref={closeButton} type="button" className="lightbox-close" onClick={() => setActive(null)} aria-label={locale === "nl" ? "Sluiten" : "Close"}>×</button>
          <img src={imageFor(active)} alt={getLocalized(active, locale).title} />
          <p>{getLocalized(active, locale).title}</p>
        </div>
      )}
    </>
  );
}
