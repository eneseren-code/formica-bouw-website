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

const bathroomDetails = {
  nl: [
    ["01", "Inloopdouche", "Ruimtelijk, comfortabel en zorgvuldig waterdicht afgewerkt.", "/media/details/renovation-modern-bath.jpg"],
    ["02", "Tegelwerk", "Een rustig lijnenspel met voegen en aansluitingen die precies kloppen.", "/media/details/renovation-bathroom.jpg"],
    ["03", "Sanitair", "Sanitair en kranen gekozen op comfort, uitstraling en dagelijks gebruik.", "/media/details/renovation-bathroom.jpg"],
    ["04", "Verlichting", "Functioneel licht waar nodig en sfeer voor ieder moment van de dag.", "/media/details/renovation-modern-bath.jpg"],
    ["05", "Maatwerk", "Slimme opbergruimte en meubels die perfect passen bij de ruimte.", "/media/details/kitchen-closet.jpg"],
  ],
  en: [
    ["01", "Walk-in shower", "Spacious, comfortable and finished with careful waterproofing.", "/media/details/renovation-modern-bath.jpg"],
    ["02", "Tiling", "Calm lines with joints and connections that align precisely.", "/media/details/renovation-bathroom.jpg"],
    ["03", "Sanitaryware", "Sanitaryware and taps chosen for comfort, appearance and daily use.", "/media/details/renovation-bathroom.jpg"],
    ["04", "Lighting", "Practical light where needed and atmosphere for every moment of the day.", "/media/details/renovation-modern-bath.jpg"],
    ["05", "Bespoke work", "Smart storage and furniture designed to fit the space perfectly.", "/media/details/kitchen-closet.jpg"],
  ],
};

function WhatsApp({ phone, locale }: { phone: string; locale: Locale }) {
  const message = locale === "nl"
    ? "Hallo Formica Bouw, ik wil graag mijn badkamerplannen bespreken."
    : "Hello Formica Bouw, I would like to discuss my bathroom plans.";
  return (
    <a className="whatsapp-float" href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
      <span className="whatsapp-icon">WA</span><span className="whatsapp-label">WhatsApp</span>
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
    <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><span aria-hidden="true">WA</span>WhatsApp</a>
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
  return (
    <>
      <HomeMotion />
      <section className="home-hero bathroom-hero">
        <img className="hero-photo" data-parallax src="/media/details/renovation-modern-bath.jpg" alt={isNl ? "Lichte, compleet gerenoveerde badkamer" : "Bright, fully renovated bathroom"} />
        <div className="hero-overlay" />
        <div className="hero-copy hero-copy-bathroom">
          <p className="eyebrow">{isNl ? "Badkamerrenovatie · van sloop tot oplevering" : "Bathroom renovation · from demolition to handover"}</p>
          <h1>{copy.title}</h1><p>{copy.summary}</p>
          <div className="hero-actions">
            <a className="button button-accent" href={pathFor("quote", locale)}>{isNl ? "Bespreek uw badkamer" : "Discuss your bathroom"}</a>
            <a className="play-link" href={pathFor("renovations", locale)}>{isNl ? "Zo werken wij" : "How we work"} <span>↘</span></a>
          </div>
        </div>
        <div className="hero-specialist-card"><strong>{isNl ? "Badkamer-specialist" : "Bathroom specialist"}</strong><span>{isNl ? "Eén aanspreekpunt. Alles geregeld." : "One point of contact. Fully managed."}</span></div>
        <div className="hero-index"><span>FORMICA BOUW</span><span>{isNl ? data.settings.serviceAreaNl : data.settings.serviceAreaEn}</span></div>
      </section>

      <section className="trust-strip"><span>KVK {data.settings.kvk}</span><span>{isNl ? "Complete badkamers" : "Complete bathrooms"}</span><span>{isNl ? "Eén vast aanspreekpunt" : "One dedicated contact"}</span><span>{data.settings.phoneDisplay}</span></section>

      <section className="section bathroom-focus">
        <div className="bathroom-focus-copy">
          <p className="eyebrow">{isNl ? "Van lege ruimte naar dagelijks comfort" : "From empty space to everyday comfort"}</p>
          <h2>{isNl ? "Alles komt samen in één goed ontworpen badkamer." : "Everything comes together in one well-designed bathroom."}</h2>
          <p>{copy.body}</p>
          <ul className="check-list">
            <li>{isNl ? "Sloop- en voorbereidingswerk" : "Demolition and preparation"}</li>
            <li>{isNl ? "Leidingwerk en elektra" : "Plumbing and electrical work"}</li>
            <li>{isNl ? "Tegelwerk en sanitairmontage" : "Tiling and sanitaryware installation"}</li>
            <li>{isNl ? "Afwerking tot de laatste kitnaad" : "Finishing down to the final seal"}</li>
          </ul>
          <a className="button button-dark" href={pathFor("renovations", locale)}>{isNl ? "Bekijk badkamerrenovatie" : "Explore bathroom renovation"}</a>
        </div>
        <div className="bathroom-collage">
          <figure className="bathroom-image-main"><img data-parallax src="/media/details/renovation-bathroom.jpg" alt={isNl ? "Moderne badkamer met vrijstaand bad" : "Modern bathroom with freestanding bath"} /></figure>
          <div className="bathroom-detail-card"><span>01</span><strong>{isNl ? "Ontwerp" : "Design"}</strong><small>{isNl ? "Rust, ruimte en slimme keuzes" : "Calm, space and smart choices"}</small></div>
          <div className="bathroom-detail-card bathroom-detail-dark"><span>02</span><strong>{isNl ? "Uitvoering" : "Delivery"}</strong><small>{isNl ? "Technisch sterk. Strak afgewerkt." : "Technically sound. Precisely finished."}</small></div>
        </div>
      </section>

      <div className="moving-line" aria-hidden="true"><div><span>{isNl ? "BADKAMERS • TEGELWERK • SANITAIR • LEIDINGWERK • AFWERKING •" : "BATHROOMS • TILING • SANITARYWARE • PLUMBING • FINISHES •"}</span><span>{isNl ? "BADKAMERS • TEGELWERK • SANITAIR • LEIDINGWERK • AFWERKING •" : "BATHROOMS • TILING • SANITARYWARE • PLUMBING • FINISHES •"}</span></div></div>

      <section className="section services-section"><div className="section-heading"><div><p className="eyebrow">{isNl ? "Expertise" : "Expertise"}</p><h2>{isNl ? "Badkamers voorop. Alles eromheen geregeld." : "Bathrooms first. Everything around them handled."}</h2></div><p>{isNl ? "Wij combineren onze badkamerspecialisatie met de vakmensen en disciplines die nodig zijn voor een compleet resultaat." : "We combine our bathroom specialism with the trades and disciplines needed for a complete result."}</p></div><ServiceCards services={data.services} locale={locale} /></section>

      <section className="bathroom-details-showcase">
        <div className="detail-showcase-heading"><div><p className="eyebrow">{isNl ? "De details maken de badkamer" : "The details make the bathroom"}</p><h2>{isNl ? "Mooi om te zien. Fijn om iedere dag te gebruiken." : "Beautiful to see. A pleasure to use every day."}</h2></div><p>{isNl ? "Ontdek de onderdelen die samen zorgen voor rust, comfort en een tijdloos geheel." : "Explore the elements that come together to create calm, comfort and a timeless whole."}</p></div>
        <div className="detail-track" aria-label={isNl ? "Badkamerdetails" : "Bathroom details"}>
          {bathroomDetails[locale].map(([number, title, description, image], index) => <article className="detail-slide" key={number}>
            <div className="detail-slide-image"><img src={image} alt="" loading="lazy" data-parallax={index === 0 ? "" : undefined} /></div>
            <div className="detail-slide-copy"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>
          </article>)}
        </div>
        <p className="swipe-cue"><span>←</span>{isNl ? "Sleep om meer details te bekijken" : "Drag to explore more details"}<span>→</span></p>
      </section>

      <section className="statement-section"><p className="eyebrow">{isNl ? "Waarom Formica Bouw" : "Why Formica Bouw"}</p><p className="large-statement">{isNl ? "Een badkamer gebruikt u iedere dag. Daarom moet elk detail niet alleen mooi zijn, maar ook jarenlang goed blijven werken." : "You use a bathroom every day. That is why every detail must not only look right, but keep working beautifully for years."}</p><div className="statement-notes"><span>{isNl ? "Heldere afspraken" : "Clear expectations"}</span><span>{isNl ? "Nette uitvoering" : "Considered delivery"}</span><span>{isNl ? "Oog voor detail" : "Attention to detail"}</span></div></section>

      <section className="section process-section"><div className="section-heading"><div><p className="eyebrow">{isNl ? "Van idee naar badkamer" : "From idea to bathroom"}</p><h2>{isNl ? "Vier stappen. Eén aanspreekpunt." : "Four steps. One point of contact."}</h2></div><p>{isNl ? "We houden het proces overzichtelijk en stemmen iedere discipline zorgvuldig op de volgende af." : "We keep the process clear and carefully coordinate every trade with the next."}</p></div><div className="process-grid">{processCopy[locale].map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>

      <section className="section projects-preview"><div className="section-heading"><div><p className="eyebrow">{isNl ? "Geselecteerd werk" : "Selected work"}</p><h2>{isNl ? "Vakmanschap dat u kunt zien." : "Craftsmanship you can see."}</h2></div><a className="arrow-link" href={pathFor("projects", locale)}>{isNl ? "Bekijk alle projecten" : "View all projects"}<span>↗</span></a></div><ProjectGallery projects={data.projects} locale={locale} compact /></section>

      <section className="conversion-band">
        <div><p className="eyebrow">{isNl ? "Heeft u al een badkamer in gedachten?" : "Already have a bathroom in mind?"}</p><h2>{isNl ? "Stuur ons een foto. Wij denken met u mee." : "Send us a photo. We will think along with you."}</h2></div>
        <div className="conversion-actions"><a className="button button-light" href={pathFor("quote", locale)}>{isNl ? "Vraag een gesprek aan" : "Request a conversation"}</a><a className="conversion-phone" href={`tel:${data.settings.phone}`}>{isNl ? "Of bel direct" : "Or call now"}<strong>{data.settings.phoneDisplay}</strong></a></div>
      </section>
      <section className="partner-section"><p className="eyebrow">{isNl ? "Partners" : "Partners"}</p><div className="partner-row">{data.partners.map((partner) => <img key={partner.id} src={imageFor(partner)} alt={getLocalized(partner, locale).title} loading="lazy" />)}</div></section>
    </>
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
            <span className="contact-action-icon" aria-hidden="true">WA</span><span><small>{isNl ? "Snel en makkelijk" : "Quick and easy"}</small><strong>{isNl ? "Stuur een WhatsApp" : "Send a WhatsApp"}</strong></span><b aria-hidden="true">↗</b>
          </a>
          <a className="contact-action contact-action-phone" href={`tel:${data.settings.phone}`}>
            <span className="contact-action-icon" aria-hidden="true">☎</span><span><small>{isNl ? "Bel ons direct" : "Call us directly"}</small><strong>{data.settings.phoneDisplay}</strong></span><b aria-hidden="true">↗</b>
          </a>
        </div>
        <a className="contact-email-link" href={`mailto:${data.settings.email}`}><span>{isNl ? "Of mail naar" : "Or email"}</span><strong>{data.settings.email}</strong><b aria-hidden="true">→</b></a>
        <div className="contact-promises"><span>✓ {isNl ? "Persoonlijk contact" : "Personal contact"}</span><span>✓ {isNl ? "Foto’s zijn welkom" : "Photos are welcome"}</span><span>✓ {isNl ? "Vrijblijvend kennismaken" : "No-obligation introduction"}</span></div>
      </div>
      <div className="contact-visual">
        <img src="/media/details/renovation-modern-bath.jpg" alt={isNl ? "Moderne badkamer door Formica Bouw" : "Modern bathroom by Formica Bouw"} />
        <div className="contact-visual-note"><span aria-hidden="true">✦</span><p>{isNl ? "Een foto van uw huidige badkamer zegt vaak al veel." : "A photo of your current bathroom often tells us a lot."}</p></div>
        <a className="contact-visual-call" href={whatsappUrl} target="_blank" rel="noreferrer"><small>{isNl ? "Heeft u al een foto?" : "Already have a photo?"}</small><strong>{isNl ? "Stuur hem, dan kijken we mee" : "Send it and let’s take a look"}</strong><span>↗</span></a>
      </div>
    </section>
    <section className="section contact-choice-section"><div className="section-heading"><div><p className="eyebrow">{isNl ? "U kiest hoe we beginnen" : "You choose how we start"}</p><h2>{isNl ? "Eén klik dichter bij uw nieuwe badkamer." : "One click closer to your new bathroom."}</h2></div><p>{isNl ? "Geen uitgebreid plan nodig. Deel wat u bezighoudt via het kanaal dat voor u prettig voelt." : "No detailed plan needed. Share what is on your mind through whichever channel feels right for you."}</p></div>
      <div className="contact-choice-grid">
        <a className="contact-option contact-option-primary" href={whatsappUrl} target="_blank" rel="noreferrer"><span className="contact-option-number">01</span><div><small>{isNl ? "Een vraag of foto sturen" : "Send a question or photo"}</small><h3>WhatsApp</h3><p>{isNl ? "Laagdrempelig uw badkameridee delen." : "An easy way to share your bathroom idea."}</p></div><b aria-hidden="true">↗</b></a>
        <a className="contact-option" href={`tel:${data.settings.phone}`}><span className="contact-option-number">02</span><div><small>{isNl ? "Even persoonlijk overleggen" : "Talk it through personally"}</small><h3>{data.settings.phoneDisplay}</h3><p>{isNl ? "Tik om Formica Bouw direct te bellen." : "Tap to call Formica Bouw directly."}</p></div><b aria-hidden="true">↗</b></a>
        <a className="contact-option" href={`mailto:${data.settings.email}`}><span className="contact-option-number">03</span><div><small>{isNl ? "Meer informatie delen" : "Share more information"}</small><h3>{isNl ? "Stuur een e-mail" : "Send an email"}</h3><p>{data.settings.email}</p></div><b aria-hidden="true">↗</b></a>
      </div>
    </section>
    <section className="section contact-form-section"><div className="form-aside"><p className="eyebrow">{isNl ? "Uw idee is het begin" : "Your idea is the beginning"}</p><h2>{isNl ? "Laat ons even met u meekijken." : "Let us take a look with you."}</h2><p>{isNl ? "Vertel wat u mooi vindt, wat nu niet werkt en wat u graag anders ziet. Met een paar gegevens en foto’s kunnen we het gesprek gericht beginnen." : "Tell us what you like, what is not working now and what you would love to change. A few details and photos help us start a focused conversation."}</p><div className="form-aside-points"><span>01 — {isNl ? "Deel uw wensen" : "Share your wishes"}</span><span>02 — {isNl ? "Voeg foto’s toe" : "Add photos"}</span><span>03 — {isNl ? "Wij nemen contact op" : "We contact you"}</span></div><a className="form-aside-call" href={`tel:${data.settings.phone}`}><small>{isNl ? "Liever bellen?" : "Prefer to call?"}</small><strong>{data.settings.phoneDisplay}</strong></a></div><QuoteForm locale={locale} services={data.services} /></section>
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
