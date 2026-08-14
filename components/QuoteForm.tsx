"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import type { ContentEntry, Locale } from "@/lib/types";
import { getLocalized, pathFor } from "@/lib/site-data";

const TOTAL_STEPS = 3;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function QuoteForm({ locale, services }: { locale: Locale; services: ContentEntry[] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [step, setStep] = useState(0);
  const [animateStep, setAnimateStep] = useState(false);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [photoStatus, setPhotoStatus] = useState("");
  const startedAt = useRef("");
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadings = useRef<Array<HTMLHeadingElement | null>>([]);
  const hasNavigated = useRef(false);
  const isNl = locale === "nl";

  const stepLabels = isNl
    ? ["Uw plan", "De ruimte", "Uw gegevens"]
    : ["Your plan", "The space", "Your details"];

  useEffect(() => {
    startedAt.current = Date.now().toString();
  }, []);

  useEffect(() => {
    if (!hasNavigated.current) return;
    const frame = requestAnimationFrame(() => stepHeadings.current[step]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [step]);

  function validateStep(index: number) {
    const stepElement = formRef.current?.querySelector<HTMLElement>(`[data-quote-step="${index}"]`);
    if (!stepElement) return false;
    const fields = Array.from(stepElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"));
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    return true;
  }

  function moveTo(nextStep: number, withMotion: boolean) {
    hasNavigated.current = true;
    setAnimateStep(withMotion);
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)));
    setMessage("");
  }

  function next(withMotion: boolean) {
    if (validateStep(step)) moveTo(step + 1, withMotion);
  }

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    let error = "";
    if (files.length > MAX_FILES) {
      error = isNl ? "Kies maximaal 5 foto’s." : "Choose no more than 5 photos.";
    } else if (files.some((file) => file.size > MAX_FILE_SIZE)) {
      error = isNl ? "Elke foto mag maximaal 8 MB zijn." : "Each photo may be up to 8 MB.";
    } else if (files.some((file) => !ACCEPTED_FILE_TYPES.has(file.type))) {
      error = isNl ? "Gebruik alleen JPEG-, PNG- of WebP-foto’s." : "Use JPEG, PNG or WebP photos only.";
    }
    input.setCustomValidity(error);
    if (error) setPhotoStatus(error);
    else if (files.length) setPhotoStatus(isNl ? `${files.length} foto${files.length === 1 ? "" : "’s"} geselecteerd` : `${files.length} photo${files.length === 1 ? "" : "s"} selected`);
    else setPhotoStatus("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < TOTAL_STEPS - 1) {
      next(false);
      return;
    }
    if (!validateStep(step)) return;

    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("startedAt", startedAt.current);
    data.set("locale", locale);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        body: data,
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const result = (await response.json()) as { error?: string; whatsappUrl?: string };
      if (!response.ok) throw new Error(result.error || (isNl ? "De aanvraag kon niet worden verstuurd." : "Your request could not be sent."));
      setWhatsappUrl(result.whatsappUrl ?? "");
      setStatus("success");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isNl ? "Er ging iets mis. Probeer het opnieuw." : "Something went wrong. Please try again."));
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form-success" role="status">
        <span className="success-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">{isNl ? "Aanvraag ontvangen" : "Request received"}</p>
        <h2>{isNl ? "Bedankt. We kijken persoonlijk met u mee." : "Thank you. We will review it personally."}</h2>
        <p>{isNl ? "We nemen contact met u op over de volgende stap. Wilt u nog iets toevoegen? Stuur het gerust via WhatsApp." : "We will contact you about the next step. Want to add anything? Feel free to send it via WhatsApp."}</p>
        <div className="form-success-actions">
          {whatsappUrl && <a className="button button-dark" href={whatsappUrl} target="_blank" rel="noreferrer">{isNl ? "Aanvullen via WhatsApp" : "Add via WhatsApp"}</a>}
          <a className="text-link" href={pathFor("home", locale)}>{isNl ? "Terug naar home" : "Back to home"}</a>
        </div>
      </div>
    );
  }

  const progressStyle = { "--quote-progress": (step + 1) / TOTAL_STEPS } as CSSProperties;

  return (
    <form ref={formRef} className="quote-form" onSubmit={submit} encType="multipart/form-data" noValidate data-animate={animateStep ? "true" : "false"}>
      <header className="quote-form-header">
        <div>
          <p className="quote-form-kicker">{isNl ? "Vrijblijvende aanvraag" : "No-obligation request"}</p>
          <strong>{isNl ? "Vertel ons over uw badkamer" : "Tell us about your bathroom"}</strong>
        </div>
        <span>{String(step + 1).padStart(2, "0")} / 03</span>
      </header>

      <nav className="quote-progress" aria-label={isNl ? "Stappen van de aanvraag" : "Request steps"} style={progressStyle}>
        <div className="quote-progress-track" aria-hidden="true"><span /></div>
        <ol>
          {stepLabels.map((label, index) => (
            <li key={label}>
              <button type="button" aria-current={index === step ? "step" : undefined} disabled={index > step || status === "sending"} onClick={(event) => index < step && moveTo(index, event.detail > 0)}>
                <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>
                <small>{label}</small>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="quote-step" data-quote-step="0" hidden={step !== 0} data-active={step === 0 ? "true" : "false"}>
        <div className="quote-step-heading">
          <p>01 — {isNl ? "De eerste keuze" : "The first choice"}</p>
          <h2 ref={(node) => { stepHeadings.current[0] = node; }} tabIndex={-1}>{isNl ? "Waar kunnen we u mee helpen?" : "How can we help?"}</h2>
          <span>{isNl ? "Kies wat het beste past. Twijfelen mag ook." : "Choose what fits best. It is fine not to be sure yet."}</span>
        </div>
        <fieldset className="quote-options">
          <legend>{isNl ? "Kies een dienst" : "Choose a service"}</legend>
          {services.map((service, index) => {
            const serviceCopy = getLocalized(service, locale);
            return (
              <label className="quote-option" key={service.id} htmlFor={`quote-service-${service.id}`}>
                <input id={`quote-service-${service.id}`} type="radio" name="service" value={service.slug} required aria-label={serviceCopy.title} />
                <span className="quote-option-body"><small>{String(index + 1).padStart(2, "0")}</small><strong>{serviceCopy.title}</strong><b aria-hidden="true">↗</b></span>
              </label>
            );
          })}
          <label className="quote-option" htmlFor="quote-service-other">
            <input id="quote-service-other" type="radio" name="service" value="other" required aria-label={isNl ? "Anders of nog niet zeker" : "Other or not sure yet"} />
            <span className="quote-option-body"><small>{String(services.length + 1).padStart(2, "0")}</small><strong>{isNl ? "Anders / nog niet zeker" : "Other / not sure yet"}</strong><b aria-hidden="true">↗</b></span>
          </label>
        </fieldset>
        <div className="quote-step-actions quote-step-actions-end">
          <button className="button button-dark quote-next" type="button" onClick={(event) => next(event.detail > 0)}>{isNl ? "Volgende: de ruimte" : "Next: the space"}<span aria-hidden="true">→</span></button>
        </div>
      </section>

      <section className="quote-step" data-quote-step="1" hidden={step !== 1} data-active={step === 1 ? "true" : "false"}>
        <div className="quote-step-heading">
          <p>02 — {isNl ? "Wat wilt u veranderen?" : "What would you like to change?"}</p>
          <h2 ref={(node) => { stepHeadings.current[1] = node; }} tabIndex={-1}>{isNl ? "Laat ons de ruimte alvast begrijpen." : "Help us understand the space."}</h2>
          <span>{isNl ? "Een korte uitleg is genoeg. Foto’s maken het gesprek nog concreter." : "A short explanation is enough. Photos make the conversation more concrete."}</span>
        </div>
        <div className="quote-fields">
          <label className="quote-field quote-field-wide">
            <span>{isNl ? "Vertel iets over uw project" : "Tell us about your project"} *</span>
            <textarea name="projectDescription" rows={6} required minLength={20} maxLength={4000} placeholder={isNl ? "Bijvoorbeeld: de huidige badkamer is verouderd en we willen graag een inloopdouche…" : "For example: the current bathroom is dated and we would like a walk-in shower…"} onChange={(event) => setDescriptionLength(event.currentTarget.value.length)} />
            <small className="quote-field-meta"><span>{isNl ? "Minimaal 20 tekens" : "At least 20 characters"}</span><span>{descriptionLength} / 4000</span></small>
          </label>
          <label className="quote-field">
            <span>{isNl ? "Postcode" : "Postcode"}</span>
            <input name="postcode" autoComplete="postal-code" maxLength={16} inputMode="text" placeholder="1234 AB" />
            <small>{isNl ? "Zo weten we waar het project is." : "This tells us where the project is."}</small>
          </label>
          <label className="quote-upload">
            <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} aria-describedby="quote-photo-help" />
            <span className="quote-upload-mark" aria-hidden="true">＋</span>
            <span><strong>{isNl ? "Voeg foto’s van de ruimte toe" : "Add photos of the space"}</strong><small id="quote-photo-help">JPEG, PNG of WebP · max. 5 × 8 MB</small></span>
          </label>
          {photoStatus && <p className="quote-photo-status" aria-live="polite">{photoStatus}</p>}
        </div>
        <div className="quote-step-actions">
          <button className="quote-back" type="button" onClick={(event) => moveTo(0, event.detail > 0)}>← {isNl ? "Terug" : "Back"}</button>
          <button className="button button-dark quote-next" type="button" onClick={(event) => next(event.detail > 0)}>{isNl ? "Volgende: uw gegevens" : "Next: your details"}<span aria-hidden="true">→</span></button>
        </div>
      </section>

      <section className="quote-step" data-quote-step="2" hidden={step !== 2} data-active={step === 2 ? "true" : "false"}>
        <div className="quote-step-heading">
          <p>03 — {isNl ? "Bijna klaar" : "Almost there"}</p>
          <h2 ref={(node) => { stepHeadings.current[2] = node; }} tabIndex={-1}>{isNl ? "Hoe kunnen we u bereiken?" : "How can we reach you?"}</h2>
          <span>{isNl ? "We gebruiken uw gegevens alleen om deze aanvraag persoonlijk op te volgen." : "We only use your details to follow up on this request personally."}</span>
        </div>
        <div className="quote-fields quote-contact-fields">
          <label className="quote-field"><span>{isNl ? "Naam" : "Name"} *</span><input name="name" autoComplete="name" required maxLength={120} /></label>
          <label className="quote-field"><span>{isNl ? "E-mail" : "Email"} *</span><input name="email" type="email" autoComplete="email" required maxLength={160} inputMode="email" /></label>
          <label className="quote-field quote-field-wide"><span>{isNl ? "Telefoonnummer" : "Phone number"} *</span><input name="phone" type="tel" autoComplete="tel" required maxLength={40} inputMode="tel" /></label>
          <fieldset className="quote-contact-choice quote-field-wide">
            <legend>{isNl ? "Hoe wilt u het liefst benaderd worden?" : "How would you prefer to be contacted?"}</legend>
            <div>
              {[["phone", isNl ? "Telefoon" : "Phone", isNl ? "Even persoonlijk bellen" : "A personal call"], ["whatsapp", "WhatsApp", isNl ? "Snel een bericht" : "A quick message"], ["email", "Email", isNl ? "Rustig teruglezen" : "Easy to revisit"]].map(([value, label, detail], index) => (
                <label key={value} htmlFor={`quote-contact-${value}`}><input id={`quote-contact-${value}`} type="radio" name="preferredContact" value={value} defaultChecked={index === 0} aria-label={label} /><span><strong>{label}</strong><small>{detail}</small></span></label>
              ))}
            </div>
          </fieldset>
          <label className="quote-consent quote-field-wide"><input type="checkbox" name="consent" value="yes" required /><span>{isNl ? "Ik ga akkoord met de verwerking van mijn gegevens voor deze aanvraag." : "I agree to my details being processed for this request."} <a href={pathFor("privacy", locale)}>{isNl ? "Lees het privacybeleid" : "Read the privacy policy"}</a>.</span></label>
        </div>
        <label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
        {status === "error" && <p className="form-error" role="alert">{message}</p>}
        <div className="quote-step-actions">
          <button className="quote-back" type="button" disabled={status === "sending"} onClick={(event) => moveTo(1, event.detail > 0)}>← {isNl ? "Terug" : "Back"}</button>
          <button className="button button-dark submit-button" type="submit" disabled={status === "sending"}>{status === "sending" ? (isNl ? "Aanvraag versturen…" : "Sending request…") : (isNl ? "Bespreek mijn badkamer" : "Discuss my bathroom")}<span aria-hidden="true">↗</span></button>
        </div>
      </section>

      <footer className="quote-form-footer"><span aria-hidden="true">✓</span><p>{isNl ? "Vrijblijvend · persoonlijk contact · foto’s blijven privé" : "No obligation · personal contact · photos remain private"}</p></footer>
    </form>
  );
}
