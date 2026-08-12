"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { enPaths, nlPaths, pathFor } from "@/lib/site-data";

const navKeys = ["services", "projects", "about", "contact"];

const labels = {
  nl: { services: "Diensten", projects: "Projecten", about: "Over ons", contact: "Contact", quote: "Bespreek uw badkamer", menu: "Menu openen", close: "Menu sluiten" },
  en: { services: "Services", projects: "Projects", about: "About", contact: "Contact", quote: "Discuss your bathroom", menu: "Open menu", close: "Close menu" },
};

export function SiteHeader({ locale, pageKey }: { locale: Locale; pageKey: string }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const text = labels[locale];
  const alternateLocale: Locale = locale === "nl" ? "en" : "nl";
  const alternatePath = (alternateLocale === "nl" ? nlPaths : enPaths)[pageKey] ?? pathFor("home", alternateLocale);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.documentElement.style.overflow;
    const trigger = menuButton.current;
    const firstLink = navigation.current?.querySelector<HTMLElement>("a[href]");
    document.documentElement.style.overflow = "hidden";
    firstLink?.focus();

    const containFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [menuButton.current, ...Array.from(navigation.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])]
        .filter((item): item is HTMLElement => Boolean(item));
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
      trigger?.focus();
    };
  }, [open]);

  return (
    <header className="site-header">
      <a className="brand" href={pathFor("home", locale)} aria-label="Formica Bouw home">
        <img src="/media/brand/logo.png" alt="" width="42" height="42" />
        <span><strong>Formica</strong> Bouw</span>
      </a>
      <button
        ref={menuButton}
        className="menu-button"
        type="button"
        aria-label={open ? text.close : text.menu}
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
      </button>
      <nav ref={navigation} id="main-navigation" className={open ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
        <div className="nav-links">
          {navKeys.map((key) => (
            <a key={key} href={pathFor(key, locale)} onClick={() => setOpen(false)}>
              {text[key as keyof typeof text]}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <a className="language-link" href={alternatePath} hrefLang={alternateLocale} aria-label={`Switch to ${alternateLocale === "nl" ? "Dutch" : "English"}`}>
            {alternateLocale.toUpperCase()}
          </a>
          <a className="button button-dark header-quote" href={pathFor("quote", locale)} onClick={() => setOpen(false)}>
            {text.quote}
          </a>
        </div>
      </nav>
    </header>
  );
}
