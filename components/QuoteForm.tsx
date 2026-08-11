"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ContentEntry, Locale } from "@/lib/types";
import { getLocalized, pathFor } from "@/lib/site-data";

export function QuoteForm({ locale, services }: { locale: Locale; services: ContentEntry[] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const startedAt = useRef("");
  const isNl = locale === "nl";

  useEffect(() => {
    startedAt.current = Date.now().toString();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const result = (await response.json()) as { error?: string; whatsappUrl?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to submit your request");
      setWhatsappUrl(result.whatsappUrl ?? "");
      setStatus("success");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form-success" role="status">
        <span className="success-mark">✓</span>
        <h2>{isNl ? "Bedankt, uw aanvraag is ontvangen." : "Thank you, your request has been received."}</h2>
        <p>{isNl ? "We nemen persoonlijk contact met u op. Wilt u direct iets toevoegen? Ga dan verder via WhatsApp." : "We will contact you personally. Want to add something right away? Continue on WhatsApp."}</p>
        {whatsappUrl && <a className="button button-dark" href={whatsappUrl} target="_blank" rel="noreferrer">{isNl ? "Verder via WhatsApp" : "Continue on WhatsApp"}</a>}
        <a className="text-link" href={pathFor("home", locale)}>{isNl ? "Terug naar home" : "Back to home"}</a>
      </div>
    );
  }

  return (
    <form className="quote-form" onSubmit={submit} encType="multipart/form-data">
      <div className="form-grid">
        <label><span>{isNl ? "Naam" : "Name"} *</span><input name="name" autoComplete="name" required maxLength={120} /></label>
        <label><span>{isNl ? "E-mail" : "Email"} *</span><input name="email" type="email" autoComplete="email" required maxLength={160} /></label>
        <label><span>{isNl ? "Telefoon" : "Phone"} *</span><input name="phone" type="tel" autoComplete="tel" required maxLength={40} /></label>
        <label><span>{isNl ? "Postcode" : "Postcode"}</span><input name="postcode" autoComplete="postal-code" maxLength={16} /></label>
        <label className="form-wide"><span>{isNl ? "Waarmee kunnen we helpen?" : "How can we help?"} *</span>
          <select name="service" required defaultValue="">
            <option value="" disabled>{isNl ? "Kies een dienst" : "Choose a service"}</option>
            {services.map((service) => <option key={service.id} value={service.slug}>{getLocalized(service, locale).title}</option>)}
            <option value="other">{isNl ? "Anders / nog niet zeker" : "Other / not sure yet"}</option>
          </select>
        </label>
        <label className="form-wide"><span>{isNl ? "Vertel iets over uw project" : "Tell us about your project"} *</span><textarea name="projectDescription" rows={6} required minLength={20} maxLength={4000} /></label>
        <fieldset className="form-wide contact-choice">
          <legend>{isNl ? "Voorkeur voor contact" : "Preferred contact"}</legend>
          <label><input type="radio" name="preferredContact" value="phone" defaultChecked /> {isNl ? "Telefoon" : "Phone"}</label>
          <label><input type="radio" name="preferredContact" value="email" /> Email</label>
          <label><input type="radio" name="preferredContact" value="whatsapp" /> WhatsApp</label>
        </fieldset>
        <label className="form-wide file-field"><span>{isNl ? "Projectfoto’s (optioneel, max. 5 × 8 MB)" : "Project photos (optional, max. 5 × 8 MB)"}</span><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
        <label className="form-wide consent"><input type="checkbox" name="consent" value="yes" required /><span>{isNl ? "Ik ga akkoord met de verwerking van mijn gegevens voor deze aanvraag." : "I agree to my details being processed for this request."} <a href={pathFor("privacy", locale)}>{isNl ? "Lees het privacybeleid" : "Read the privacy policy"}</a>.</span></label>
        <label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {status === "error" && <p className="form-error" role="alert">{message}</p>}
      <button className="button button-dark submit-button" type="submit" disabled={status === "sending"}>{status === "sending" ? (isNl ? "Versturen…" : "Sending…") : (isNl ? "Aanvraag versturen" : "Send request")}</button>
    </form>
  );
}
