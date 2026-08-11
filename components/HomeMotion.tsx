"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let frame = 0;

    const update = () => {
      const viewportCenter = window.innerHeight / 2;
      targets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const progress = (elementCenter - viewportCenter) / (window.innerHeight + rect.height);
        const distance = Math.max(-1, Math.min(1, progress)) * -34;
        target.style.setProperty("--parallax-y", `${distance.toFixed(2)}px`);
      });
      frame = 0;
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
