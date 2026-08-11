import type { Locale } from "@/lib/types";
import { pathFor } from "@/lib/site-data";

type Settings = Record<string, string | number | boolean | undefined>;

export function SiteFooter({ locale, settings }: { locale: Locale; settings: Settings }) {
  const isNl = locale === "nl";
  return (
    <footer className="site-footer">
      <div className="footer-intro">
        <p className="eyebrow">Formica Bouw</p>
        <h2>{isNl ? "Droomt u van een nieuwe badkamer? Laten we beginnen." : "Dreaming of a new bathroom? Let’s get started."}</h2>
        <a className="button button-light" href={pathFor("quote", locale)}>{isNl ? "Bespreek uw badkamer" : "Discuss your bathroom"}</a>
      </div>
      <div className="footer-grid">
        <div>
          <p className="footer-label">{isNl ? "Contact" : "Contact"}</p>
          <a href={`tel:${settings.phone}`}>{settings.phoneDisplay}</a>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </div>
        <div>
          <p className="footer-label">{isNl ? "Werkgebied" : "Service area"}</p>
          <p>{isNl ? settings.serviceAreaNl : settings.serviceAreaEn}</p>
          <p>KVK {settings.kvk}</p>
        </div>
        <div>
          <p className="footer-label">{isNl ? "Volg ons" : "Follow us"}</p>
          <a href={String(settings.instagram)} target="_blank" rel="noreferrer">Instagram ↗</a>
        </div>
        <div>
          <p className="footer-label">{isNl ? "Juridisch" : "Legal"}</p>
          <a href={pathFor("privacy", locale)}>{isNl ? "Privacybeleid" : "Privacy policy"}</a>
          <a href={pathFor("cookies", locale)}>{isNl ? "Cookiebeleid" : "Cookie policy"}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Formica Bouw</span>
        <span>{isNl ? "Badkamers met aandacht. Helder geregeld." : "Bathrooms with care. Clearly managed."}</span>
      </div>
    </footer>
  );
}
