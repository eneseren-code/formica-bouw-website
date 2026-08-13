import type { ReactNode } from "react";
import type { ContentEntry, Locale } from "@/lib/types";
import { getLocalized, pathFor } from "@/lib/site-data";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ProjectGallery } from "./ProjectGallery";
import { QuoteForm } from "./QuoteForm";
import { HomeMotion } from "./HomeMotion";

type PublicData = {
  pages: ContentEntry[];
  services: ContentEntry[];
  projects: ContentEntry[];
  partners: ContentEntry[];
  settings: Record<string, string | number | boolean | undefined>;
};

function imageFor(entry: ContentEntry) {
  return entry.metadata.mediaId ? `/api/media/${entry.metadata.mediaId}` : String(entry.metadata.image ?? "");
}

const processCopy = {
  nl: [
    ["01", "Wensen & opname", "We bekijken de ruimte en bespreken indeling, sfeer, sanitair en budget."],
    ["02", "Plan & offerte", "U ontvangt een duidelijke scope, materiaalafspraken en een heldere offerte."],
    ["03", "Complete uitvoering", "Sloop, techniek, tegelwerk en montage worden zorgvuldig op elkaar afgestemd."],
    ["04", "Perfect opgeleverd", "We controleren samen ieder detail en leveren de badkamer netjes op."],
  ],
  en: [
    ["01", "Ideas & survey", "We inspect the space and discuss layout, style, sanitaryware and budget."],
    ["02", "Plan & proposal", "You receive a clear scope, material choices and transparent proposal."],
    ["03", "Complete delivery", "Demolition, services, tiling and installation are carefully coordinated."],
    ["04", "Perfect handover", "Together we check every detail and hand over a clean, finished bathroom."],
  ],
};

function WhatsAppLogo() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 11.7a8.4 8.4 0 0 1-12.5 7.4L3.5 20.5l1.4-4.2A8.4 8.4 0 1 1 20.4 11.7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.1 7.8c.2-.5.5-.5.8-.5h.6c.2 0 .4.1.5.4l.8 1.9c.1.3.1.5-.1.7l-.7.8c-.2.2-.1.4 0 .6.5 1 1.3 1.8 2.3 2.4.2.1.4.2.6 0l.9-1.1c.2-.2.4-.3.7-.2l1.9.9c.3.1.4.3.4.5 0 .6-.3 1.4-.8 1.8-.5.5-1.3.7-2 .6-1.1-.2-2.6-.8-4.2-2.2-1.3-1.2-2.3-2.8-2.6-4.1-.2-.9 0-1.8.4-2.5Z" fill="currentColor" /></svg>;
}

function InstagramLogo() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" /></svg>;
}

function WhatsApp({ phone, locale }: { phone: string; locale: Locale }) {
  const message = locale === "nl"
    ? "Hallo Formica Bouw, ik wil graag mijn badkamerplannen bespreken."
    : "Hello Formica Bouw, I would like to discuss my bathroom plans.";
  return (
    <a className="whatsapp-float" href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
      <span className="whatsapp-icon"><WhatsAppLogo /></span><span className="whatsapp-label">WhatsApp</span>
    </a>
  );
}

function MobileActionBar({ locale, settings }: { locale: Locale; settings: PublicData["settings"] }) {
  const isNl = locale === "nl";
  const phone = String(settings.phone);
  const whatsapp = String(settings.whatsapp || settings.phone).replace(/\D/g, "");
  const message = isNl ? "Hallo Formica Bouw, ik wil graag mijn badkamerplannen bespreken." : "Hello Formica Bouw, I would like to discuss my bathroom plans.";
  return <nav className="mobile-action-bar" aria-label={isNl ? "Snel contact" : "Quick contact"}>
    <a href={`tel:${phone}`}><span aria-hidden="true">☎</span>{isNl ? "Bellen" : "Call"}</a>
    <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><span><WhatsAppLogo /></span>WhatsApp</a>
    <a href={pathFor("quote", locale)}><span aria-hidden="true">↗</span>{isNl ? "Offerte" : "Quote"}</a>
  </nav>;
}

function ServiceCards({ services, locale }: { services: ContentEntry[]; locale: Locale }) {
  return (
    <div className="service-grid">
      {services.map((service, index) => {
        const copy = getLocalized(service, locale);
        return (
          <article className={`service-card${index === 0 ? " service-card-featured" : ""}`} key={service.id}>
            <a className="service-image" href={pathFor(service.slug, locale)}>
              <img src={imageFor(service)} alt={copy.title} loading={index > 2 ? "lazy" : "eager"} />
              {index === 0 && <span className="specialism-tag">{locale === "nl" ? "Ons specialisme" : "Our speciality"}</span>}
            </a>
            <div className="service-card-body">
              <span className="service-number">0{index + 1}</span><h3>{copy.title}</h3><p>{copy.summary}</p>
              <a className="arrow-link" href={pathFor(service.slug, locale)}>{locale === "nl" ? "Ontdek de mogelijkheden" : "Explore the possibilities"}<span>↗</span></a>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function HomePage({ locale, data }: { locale: Locale; data: PublicData }) {
  const isNl = locale === "nl";
  const home = data.pages.find((entry) => entry.slug === "home")!;
  const copy = getLocalized(home, locale);
  const partnerLegacyNames: Record<string, string> = {
    "partner-winkel2": "Winkel2",
    "partner-sani4all": "Sani4All",
    "partner-03": "Partner",
    "partner-04": "Partner",
  };
  const verifiedPartnerNames: Record<string, string> = {
    "partner-winkel2": "Sanitair Winkel.",
    "partner-sani4all": "Sani4All",
    "partner-03": "Jan Bochman Architecten",
    "partner-04": "Label UP",
  };
  const featuredProjects = [
    ...data.projects.filter((project) => project.metadata.featured),
    ...data.projects.filter((project) => !project.metadata.featured),
  ].filter((project, index, projects) => projects.findIndex((item) => item.id === project.id) === index).slice(0, 3);
  const whatsappMessage = isNl
    ? "Hallo Formica Bouw, ik wil graag mijn badkamerplannen bespreken."
    : "Hello Formica Bouw, I would like to discuss my bathroom plans.";
  const whatsappUrl = `https://wa.me/${String(data.settings.whatsapp || data.settings.phone).replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
  const heroWords = copy.title.trim().split(/\s+/);
  const expertisePoints = isNl
    ? ["Eén aanspreekpunt", "Alle vakdisciplines afgestemd", "Heldere planning en offerte"]
    : ["One point of contact", "Every trade coordinated", "Clear planning and proposal"];

  return (
    <div className="home-redesign">
      <HomeMotion />
      <section className="home-hero home-cinematic-hero" data-home-hero>
        <div className="home-hero-media" aria-hidden="true">
          <picture className="home-hero-poster-frame">
            <source media="(max-width: 767px)" srcSet="/media/generated/formica-hero-mobile-poster.webp" />
            <img className="home-hero-poster" src="/media/generated/formica-hero-poster.webp" alt="" fetchPriority="high" />
          </picture>
          <video
            className="home-hero-video"
            data-home-video
            muted
            loop
            playsInline
            preload="none"
          >
            <source data-desktop-src="/media/generated/formica-hero.webm" data-mobile-src="/media/generated/formica-hero-mobile.webm" type="video/webm" />
            <source data-desktop-src="/media/generated/formica-hero.mp4" data-mobile-src="/media/generated/formica-hero-mobile.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-grid" aria-hidden="true" />
        <div className="home-waterline" aria-hidden="true">
          <span>water / flow</span>
          <i /><i /><i />
        </div>
        <div className="home-hero-copy">
          <p className="eyebrow home-hero-kicker">{isNl ? "Complete badkamerrenovatie · heel Nederland" : "Complete bathroom renovation · across the Netherlands"}</p>
          <h1 aria-label={copy.title}>
            {heroWords.map((word, index) => <span className="home-word" aria-hidden="true" key={`${word}-${index}`} style={{ animationDelay: `${180 + index * 55}ms` }}>{word}&nbsp;</span>)}
          </h1>
          <p className="home-hero-summary">{copy.summary}</p>
          <div className="home-hero-actions">
            <a className="button button-accent" href={pathFor("quote", locale)}>{isNl ? "Bespreek uw badkamer" : "Discuss your bathroom"}<span aria-hidden="true">↗</span></a>
            <a className="home-text-link" href={pathFor("projects", locale)}>{isNl ? "Bekijk projecten" : "View projects"}<span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <dl className="home-hero-proof" aria-label={isNl ? "Formica Bouw in het kort" : "Formica Bouw at a glance"}>
          <div><dt>{isNl ? "Specialisme" : "Speciality"}</dt><dd>{isNl ? "Complete badkamers" : "Complete bathrooms"}</dd></div>
          <div><dt>{isNl ? "Werkgebied" : "Service area"}</dt><dd>{isNl ? data.settings.serviceAreaNl : data.settings.serviceAreaEn}</dd></div>
          <div><dt>{isNl ? "Contact" : "Contact"}</dt><dd>{isNl ? "Eén vast aanspreekpunt" : "One dedicated contact"}</dd></div>
        </dl>
      </section>

      <section className="home-partners" aria-labelledby="home-partners-title">
        <div className="home-partners-heading" data-reveal>
          <p className="eyebrow">{isNl ? "Samenwerking" : "Collaboration"}</p>
          <h2 id="home-partners-title">{isNl ? "Vakwerk ontstaat samen met sterke partners." : "Craftsmanship grows through strong partnerships."}</h2>
          <span>{isNl ? "Merken en professionals waarmee wij samenwerken" : "Brands and professionals we work with"}</span>
        </div>
        <div className="home-partner-grid">
          {data.partners.slice(0, 4).map((partner, index) => {
            const savedName = getLocalized(partner, locale).title.trim();
            const partnerName = savedName === partnerLegacyNames[partner.id] ? verifiedPartnerNames[partner.id] : savedName;
            const content = <><span className="home-partner-index">0{index + 1}</span><img src={imageFor(partner)} alt={partnerName} loading="eager" /><strong>{partnerName}</strong>{partner.metadata.href && <span className="home-partner-arrow" aria-hidden="true">↗</span>}</>;
            return partner.metadata.href
              ? <a className="home-partner-card" href={String(partner.metadata.href)} target="_blank" rel="noreferrer" key={partner.id} data-reveal>{content}</a>
              : <div className="home-partner-card" key={partner.id} data-reveal>{content}</div>;
          })}
        </div>
      </section>

      <section className="home-expertise" aria-labelledby="home-expertise-title">
        <img
          className="home-scroll-sketch home-scroll-sketch-floorplan"
          src="/media/generated/sketch-floorplan.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          data-parallax
          data-parallax-distance="40"
        />
        <div className="home-expertise-feature" data-reveal>
          <figure className="home-expertise-image">
            <img src="/media/details/renovation-bathroom.jpg" alt={isNl ? "Zorgvuldig ontworpen moderne badkamer" : "Carefully designed modern bathroom"} loading="lazy" data-parallax />
            <figcaption><span>01</span>{isNl ? "Ontwerp, techniek en afwerking als één geheel" : "Design, engineering and finishing as one"}</figcaption>
          </figure>
          <div className="home-expertise-copy">
            <p className="eyebrow">{isNl ? "Badkamerspecialist" : "Bathroom specialist"}</p>
            <h2 id="home-expertise-title">{isNl ? "Een badkamer die klopt. Van eerste leiding tot laatste voeg." : "A bathroom that works. From the first pipe to the final joint."}</h2>
            <p>{copy.body}</p>
            <ul>{expertisePoints.map((point) => <li key={point}>{point}</li>)}</ul>
            <a className="arrow-link" href={pathFor("renovations", locale)}>{isNl ? "Ontdek onze aanpak" : "Discover our approach"}<span>↗</span></a>
          </div>
        </div>
        <div className="home-service-index" data-reveal>
          <div className="home-service-index-heading"><span>{isNl ? "Meer expertise" : "More expertise"}</span><span>{isNl ? "05 disciplines · één team" : "05 disciplines · one team"}</span></div>
          {data.services.map((service, index) => {
            const serviceCopy = getLocalized(service, locale);
            return <a href={pathFor(service.slug, locale)} className={index === 0 ? "is-primary" : ""} key={service.id}>
              <span className="home-service-number">0{index + 1}</span>
              <strong>{serviceCopy.title}</strong>
              <p>{serviceCopy.summary}</p>
              <span className="home-service-arrow" aria-hidden="true">↗</span>
            </a>;
          })}
        </div>
      </section>

      <section className="home-projects" aria-labelledby="home-projects-title">
        <img
          className="home-scroll-sketch home-scroll-sketch-vanity"
          src="/media/generated/sketch-vanity-elevation.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          data-parallax
          data-parallax-distance="40"
        />
        <div className="home-section-heading" data-reveal>
          <div><p className="eyebrow">{isNl ? "Geselecteerd werk" : "Selected work"}</p><h2 id="home-projects-title">{isNl ? "Vakmanschap dat u van dichtbij wilt bekijken." : "Craftsmanship worth a closer look."}</h2></div>
          <a className="arrow-link" href={pathFor("projects", locale)}>{isNl ? "Alle projecten" : "All projects"}<span>↗</span></a>
        </div>
        <div data-reveal><ProjectGallery projects={featuredProjects} locale={locale} compact /></div>
      </section>

      <section className="home-approach" aria-labelledby="home-approach-title">
        <div className="home-approach-statement" data-reveal>
          <p className="eyebrow">{isNl ? "Waarom Formica Bouw" : "Why Formica Bouw"}</p>
          <h2 id="home-approach-title">{isNl ? "Mooi op de eerste dag. Goed uitgevoerd voor iedere dag daarna." : "Beautiful on day one. Built right for every day after."}</h2>
          <p>{isNl ? "We brengen ontwerp, techniek en uitvoering samen in één overzichtelijk proces." : "We bring design, engineering and delivery together in one clear process."}</p>
          <span className="home-approach-mark" aria-hidden="true">F / B</span>
        </div>
        <ol className="home-process-list" data-reveal>
          {processCopy[locale].map(([number, title, description]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}
        </ol>
      </section>

      <section className="home-conversion" data-reveal>
        <div className="home-conversion-image"><img src="/media/projects/project-08.jpg" alt="" loading="lazy" /></div>
        <div className="home-conversion-copy">
          <p className="eyebrow">{isNl ? "Uw badkamer begint met een bericht" : "Your bathroom starts with a message"}</p>
          <h2>{isNl ? "Een idee, vraag of foto is genoeg voor de eerste stap." : "An idea, question or photo is enough for the first step."}</h2>
          <p>{isNl ? "Vertel ons wat u wilt veranderen. Wij bekijken de mogelijkheden en nemen persoonlijk contact met u op." : "Tell us what you would like to change. We will review the possibilities and contact you personally."}</p>
          <div className="home-conversion-actions">
            <a className="button home-whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppLogo />{isNl ? "Stuur een WhatsApp" : "Send a WhatsApp"}</a>
            <a className="button button-light" href={pathFor("quote", locale)}>{isNl ? "Vraag een offerte aan" : "Request a quote"}<span aria-hidden="true">↗</span></a>
          </div>
          <a className="home-conversion-phone" href={`tel:${data.settings.phone}`}>{isNl ? "Liever bellen?" : "Prefer to call?"} <strong>{data.settings.phoneDisplay}</strong></a>
        </div>
      </section>
    </div>
  );
}

function ServicesPage({ locale, data }: { locale: Locale; data: PublicData }) {
  const copy = getLocalized(data.pages.find((entry) => entry.slug === "services")!, locale);
  return <><PageHero eyebrow={locale === "nl" ? "Diensten" : "Services"} title={copy.title} summary={copy.summary} image="/media/details/renovation-bathroom.jpg" /><section className="section"><ServiceCards services={data.services} locale={locale} /></section></>;
}

function ServicePage({ locale, data, serviceKey }: { locale: Locale; data: PublicData; serviceKey: string }) {
  const service = data.services.find((entry) => entry.slug === serviceKey);
  if (!service) return null;
  const copy = getLocalized(service, locale);
  const related = data.projects.filter((project) => project.metadata.category === service.metadata.category);
  const isBathroom = serviceKey === "renovations";
  return <><PageHero eyebrow={isBathroom ? (locale === "nl" ? "Ons specialisme" : "Our speciality") : (locale === "nl" ? "Dienst" : "Service")} title={copy.title} summary={copy.summary} image={imageFor(service)} /><section className="section service-detail"><div><p className="eyebrow">{locale === "nl" ? "Onze aanpak" : "Our approach"}</p><h2>{isBathroom ? (locale === "nl" ? "Eén partij voor uw complete badkamer." : "One partner for your complete bathroom.") : (locale === "nl" ? "Zorgvuldig van plan naar uitvoering." : "Carefully moving from plan to delivery.")}</h2></div><div><p className="body-large">{copy.body}</p><a className="button button-dark" href={pathFor("quote", locale)}>{locale === "nl" ? "Bespreek uw badkamer" : "Discuss your bathroom"}</a></div></section>{related.length > 0 && <section className="section related-projects"><div className="section-heading"><div><p className="eyebrow">{locale === "nl" ? "Gerelateerd werk" : "Related work"}</p><h2>{locale === "nl" ? "Bekijk het van dichtbij." : "Take a closer look."}</h2></div></div><ProjectGallery projects={related} locale={locale} compact /></section>}</>;
}

function PageHero({ eyebrow, title, summary, image }: { eyebrow: string; title: string; summary: string; image: string }) {
  return <section className="page-hero"><div className="page-hero-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{summary}</p></div><img src={image} alt="" /></section>;
}

function ContactPage({ locale, data, copy }: { locale: Locale; data: PublicData; copy: ReturnType<typeof getLocalized> }) {
  const isNl = locale === "nl";
  const whatsappMessage = isNl ? "Hallo Formica Bouw, ik wil graag mijn badkamerplannen bespreken." : "Hello Formica Bouw, I would like to discuss my bathroom plans.";
  const whatsappUrl = `https://wa.me/${String(data.settings.whatsapp || data.settings.phone).replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
  return <>
    <section className="contact-hero">
      <div className="contact-hero-copy">
        <p className="eyebrow">{isNl ? "Direct contact met Formica Bouw" : "Direct contact with Formica Bouw"}</p>
        <h1>{copy.title}</h1>
        <p>{copy.summary}</p>
        <div className="contact-hero-actions">
          <a className="contact-action contact-action-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
            <span className="contact-action-icon"><WhatsAppLogo /></span><span><small>{isNl ? "Snel en makkelijk" : "Quick and easy"}</small><strong>{isNl ? "Stuur een WhatsApp" : "Send a WhatsApp"}</strong></span><b aria-hidden="true">↗</b>
          </a>
          <a className="contact-action contact-action-phone" href={`tel:${data.settings.phone}`}>
            <span className="contact-action-icon" aria-hidden="true">☎</span><span><small>{isNl ? "Bel ons direct" : "Call us directly"}</small><strong>{data.settings.phoneDisplay}</strong></span><b aria-hidden="true">↗</b>
          </a>
        </div>
        <div className="contact-secondary-links">
          <a className="contact-email-link" href={`mailto:${data.settings.email}`}><span>{isNl ? "Of mail naar" : "Or email"}</span><strong>{data.settings.email}</strong><b aria-hidden="true">→</b></a>
          <a className="contact-instagram-link" href={String(data.settings.instagram)} target="_blank" rel="noreferrer"><InstagramLogo /><span>{isNl ? "Volg ons op" : "Follow us on"}</span><strong>Instagram</strong><b aria-hidden="true">↗</b></a>
        </div>
        <div className="contact-promises"><span>✓ {isNl ? "Persoonlijk contact" : "Personal contact"}</span><span>✓ {isNl ? "Foto’s zijn welkom" : "Photos are welcome"}</span><span>✓ {isNl ? "Vrijblijvend kennismaken" : "No-obligation introduction"}</span></div>
      </div>
      <div className="contact-visual">
        <img src="/media/details/renovation-modern-bath.jpg" alt={isNl ? "Sfeervolle moderne badkamer" : "Atmospheric modern bathroom"} />
        <div className="contact-visual-note"><span aria-hidden="true">✦</span><p>{isNl ? "Een foto van uw huidige badkamer zegt vaak al veel." : "A photo of your current bathroom often tells us a lot."}</p></div>
        <a className="contact-visual-call" href={whatsappUrl} target="_blank" rel="noreferrer"><small>{isNl ? "Heeft u al een foto?" : "Already have a photo?"}</small><strong>{isNl ? "Stuur hem, dan kijken we mee" : "Send it and let’s take a look"}</strong><span>↗</span></a>
      </div>
    </section>
    <section className="section contact-form-section"><div className="form-aside"><p className="eyebrow">{isNl ? "Uw idee is het begin" : "Your idea is the beginning"}</p><h2>{isNl ? "Laat ons even met u meekijken." : "Let us take a look with you."}</h2><p>{isNl ? "Vertel wat u mooi vindt, wat nu niet werkt en wat u graag anders ziet. Met een paar gegevens en foto’s kunnen we het gesprek gericht beginnen." : "Tell us what you like, what is not working now and what you would love to change. A few details and photos help us start a focused conversation."}</p><div className="form-aside-points"><span>01 — {isNl ? "Deel uw wensen" : "Share your wishes"}</span><span>02 — {isNl ? "Voeg foto’s toe" : "Add photos"}</span><span>03 — {isNl ? "Wij nemen contact op" : "We contact you"}</span></div></div><QuoteForm locale={locale} services={data.services} /></section>
  </>;
}

function StandardPage({ locale, data, pageKey }: { locale: Locale; data: PublicData; pageKey: string }) {
  const page = data.pages.find((entry) => entry.slug === pageKey)!;
  const copy = getLocalized(page, locale);
  const isNl = locale === "nl";
  if (pageKey === "projects") return <><PageHero eyebrow="Portfolio" title={copy.title} summary={copy.summary} image="/media/projects/project-01.jpg" /><section className="section"><ProjectGallery projects={data.projects} locale={locale} /></section></>;
  if (pageKey === "quote") return <><PageHero eyebrow={isNl ? "Uw badkamerplan" : "Your bathroom plan"} title={copy.title} summary={copy.summary} image="/media/details/renovation-bathroom.jpg" /><section className="section form-section"><div className="form-aside"><p className="eyebrow">{isNl ? "Persoonlijk contact" : "Personal contact"}</p><h2>{isNl ? "Uw plan, in een paar heldere stappen." : "Your plan, in a few clear steps."}</h2><p>{isNl ? "Vertel ons wat u wilt veranderen. Foto’s helpen ons de ruimte direct beter te begrijpen." : "Tell us what you would like to change. Photos help us understand the space immediately."}</p><div className="form-aside-points"><span>✓ {isNl ? "Vrijblijvende aanvraag" : "No-obligation request"}</span><span>✓ {isNl ? "Persoonlijke reactie" : "Personal response"}</span><span>✓ {isNl ? "Heel Nederland" : "Across the Netherlands"}</span></div><a href={`tel:${data.settings.phone}`}>{data.settings.phoneDisplay}</a><a href={`mailto:${data.settings.email}`}>{data.settings.email}</a></div><QuoteForm locale={locale} services={data.services} /></section></>;
  if (pageKey === "contact") return <ContactPage locale={locale} data={data} copy={copy} />;
  if (pageKey === "about") return <><PageHero eyebrow={isNl ? "Over ons" : "About"} title={copy.title} summary={copy.summary} image="/media/projects/project-07.jpg" /><section className="section editorial"><p className="eyebrow">Formica Bouw</p><h2>{copy.body}</h2><div className="editorial-grid"><div><span>01</span><h3>{isNl ? "Aandacht" : "Attention"}</h3><p>{isNl ? "Voor de woning, het detail en de mensen die er leven." : "For the home, the detail and the people who live there."}</p></div><div><span>02</span><h3>{isNl ? "Duidelijkheid" : "Clarity"}</h3><p>{isNl ? "Heldere verwachtingen en direct contact tijdens het project." : "Clear expectations and direct contact throughout the project."}</p></div><div><span>03</span><h3>{isNl ? "Samenhang" : "Coherence"}</h3><p>{isNl ? "Ontwerp, techniek en afwerking als één geheel bekeken." : "Design, technology and finishes considered as one whole."}</p></div></div></section></>;
  return <><PageHero eyebrow={pageKey === "privacy" ? (isNl ? "Juridisch concept" : "Legal draft") : "Cookies"} title={copy.title} summary={copy.summary} image="/media/projects/project-03.jpg" /><section className="section legal-copy"><p>{copy.body}</p><div className="legal-note"><strong>{isNl ? "Let op" : "Please note"}</strong><span>{isNl ? "Deze tekst moet vóór livegang worden gecontroleerd en goedgekeurd." : "This text must be reviewed and approved before launch."}</span></div></section></>;
}

export function PublicSite({ locale, pageKey, data }: { locale: Locale; pageKey: string; data: PublicData }) {
  let content: ReactNode;
  if (pageKey === "home") content = <HomePage locale={locale} data={data} />;
  else if (pageKey === "services") content = <ServicesPage locale={locale} data={data} />;
  else if (data.services.some((entry) => entry.slug === pageKey)) content = <ServicePage locale={locale} data={data} serviceKey={pageKey} />;
  else content = <StandardPage locale={locale} data={data} pageKey={pageKey} />;
  return <><SiteHeader locale={locale} pageKey={pageKey} /><main>{content}</main><SiteFooter locale={locale} settings={data.settings} /><WhatsApp phone={String(data.settings.whatsapp || data.settings.phone)} locale={locale} /><MobileActionBar locale={locale} settings={data.settings} /></>;
}
