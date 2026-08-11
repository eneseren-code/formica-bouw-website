type LeadNotification = {
  id: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  service: string;
  projectDescription: string;
  preferredContact: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export async function sendLeadNotification(lead: LeadNotification, idempotencyKey: string) {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const from = process.env.RESEND_FROM_EMAIL ?? "";
  const to = process.env.LEAD_NOTIFICATION_EMAIL ?? "info@formicabouw.com";
  if (!apiKey || !from) return { status: "pending_configuration" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `formicabouw-lead-${idempotencyKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: lead.email,
      subject: `Nieuwe offerteaanvraag — ${lead.name}`,
      html: `<h1>Nieuwe offerteaanvraag</h1>
        <p><strong>Referentie:</strong> ${escapeHtml(lead.id)}</p>
        <p><strong>Naam:</strong> ${escapeHtml(lead.name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(lead.email)}</p>
        <p><strong>Telefoon:</strong> ${escapeHtml(lead.phone)}</p>
        <p><strong>Postcode:</strong> ${escapeHtml(lead.postcode || "—")}</p>
        <p><strong>Dienst:</strong> ${escapeHtml(lead.service)}</p>
        <p><strong>Contactvoorkeur:</strong> ${escapeHtml(lead.preferredContact)}</p>
        <h2>Projectomschrijving</h2><p>${escapeHtml(lead.projectDescription).replace(/\n/g, "<br>")}</p>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend notification failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  return { status: "sent" as const };
}
