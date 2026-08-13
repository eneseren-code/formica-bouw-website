(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menuButton = document.querySelector(".menu-button");
  const navigation = document.querySelector(".main-nav");
  const closeMenu = () => {
    navigation?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
  };

  menuButton?.addEventListener("click", () => {
    const open = !navigation?.classList.contains("is-open");
    navigation?.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) navigation?.querySelector("a")?.focus();
  });
  navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const revealTargets = [...document.querySelectorAll("[data-reveal]")];
  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    document.documentElement.classList.add("home-motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.12 });
    revealTargets.forEach((target) => observer.observe(target));
  } else revealTargets.forEach((target) => target.classList.add("is-revealed"));

  const hero = document.querySelector("[data-home-hero]");
  const video = document.querySelector("[data-home-video]");
  const connection = navigator.connection;
  const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "");
  if (hero && video && !reducedMotion.matches && !constrained) {
    const variant = window.matchMedia("(min-width: 768px)").matches ? "desktopSrc" : "mobileSrc";
    video.querySelectorAll("source").forEach((source) => {
      const nextSource = source.dataset[variant];
      if (nextSource) source.setAttribute("src", nextSource);
    });
    video.addEventListener("playing", () => hero.classList.add("is-video-playing"));
    video.addEventListener("error", () => hero.classList.remove("is-video-playing"));
    const heroObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.08 });
    heroObserver.observe(hero);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) video.pause();
      else void video.play().catch(() => {});
    });
    video.load();
    void video.play().catch(() => {});
  }

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => {
      const sourceImage = card.querySelector("img");
      if (!sourceImage) return;
      const dialog = document.createElement("div");
      dialog.className = "lightbox";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "lightbox-close";
      closeButton.setAttribute("aria-label", "Close");
      closeButton.textContent = "×";
      const image = sourceImage.cloneNode();
      image.removeAttribute("loading");
      const caption = document.createElement("p");
      caption.textContent = sourceImage.alt;
      dialog.append(closeButton, image, caption);
      const close = () => {
        dialog.remove();
        document.documentElement.style.overflow = "";
        card.focus();
      };
      closeButton.addEventListener("click", close);
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) close();
      });
      window.addEventListener("keydown", function escape(event) {
        if (event.key !== "Escape") return;
        window.removeEventListener("keydown", escape);
        close();
      });
      document.body.append(dialog);
      document.documentElement.style.overflow = "hidden";
      closeButton.focus();
    });
  });

  document.querySelectorAll(".quote-form").forEach((form) => {
    const isDutch = document.documentElement.lang === "nl";
    const notice = document.createElement("p");
    notice.className = "static-pages-notice";
    notice.textContent = isDutch
      ? "Het online formulier is in deze preview niet actief. Neem contact op via WhatsApp, telefoon of e-mail."
      : "The online form is not active in this preview. Please contact us by WhatsApp, phone or email.";
    form.prepend(notice);
    form.addEventListener("submit", (event) => event.preventDefault());
  });
})();
