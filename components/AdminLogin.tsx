"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

export function AdminLogin() {
  const [configured, setConfigured] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { configured?: boolean; authenticated?: boolean }) => {
        setConfigured(Boolean(data.configured));
        if (data.authenticated) window.location.href = "/admin";
      })
      .catch(() => setConfigured(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus("error");
      setMessage(result.error || "Sign in failed");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <Link className="admin-brand" href="/"><img src="/media/brand/logo.png" alt="" /> Formica Bouw</Link>
        <p className="admin-kicker">Secure content management</p>
        <h1>Admin sign in</h1>
        <p>Sign in with the private superadmin username and password configured for this website.</p>
        {!configured && <div className="admin-alert">Superadmin credentials are not configured. Add the required values from <code>.env.example</code>.</div>}
        <form onSubmit={submit} className="admin-login-form">
          <label><span>Username</span><input name="username" type="text" autoComplete="username" required minLength={3} maxLength={120} /></label>
          <label><span>Password</span><input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={256} /></label>
          {message && <p className="admin-error" role="alert">{message}</p>}
          <button className="admin-primary" disabled={status === "sending" || !configured}>{status === "sending" ? "Signing in…" : "Sign in"}</button>
        </form>
        <Link className="admin-back" href="/">← Back to website</Link>
      </section>
    </main>
  );
}
