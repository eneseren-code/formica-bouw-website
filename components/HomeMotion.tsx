"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 768px)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean; effectiveType?: string } }).connection;
    const constrainedConnection = () => Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ""));
    const video = document.querySelector<HTMLVideoElement>("[data-home-video]");
    const hero = document.querySelector<HTMLElement>("[data-home-hero]");
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const revealedTargets = new WeakSet<Element>();
    const sourceEntries = video
      ? Array.from(video.querySelectorAll<HTMLSourceElement>("source")).map((source) => ({ source, src: source.getAttribute("src") ?? "" }))
      : [];
    let revealObserver: IntersectionObserver | null = null;
    let heroObserver: IntersectionObserver | null = null;
    let revealEnabled = false;
    let parallaxEnabled = false;
    let videoEnabled: boolean | null = null;
    let videoSourcesAttached = Boolean(sourceEntries.some(({ src }) => src));
    let heroVisible = true;
    let playbackAllowed = true;
    let frame = 0;

    const update = () => {
      if (!parallaxEnabled) return;
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
      if (parallaxEnabled && !frame) frame = window.requestAnimationFrame(update);
    };

    const setParallaxEnabled = (enabled: boolean) => {
      if (enabled === parallaxEnabled) return;
      parallaxEnabled = enabled;
      if (enabled) {
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate);
        requestUpdate();
        return;
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      targets.forEach((target) => target.style.removeProperty("--parallax-y"));
    };

    const setRevealsEnabled = (enabled: boolean) => {
      if (enabled === revealEnabled) return;
      revealEnabled = enabled;

      if (!enabled) {
        document.documentElement.classList.remove("home-motion-ready");
        revealObserver?.disconnect();
        revealObserver = null;
        return;
      }

      document.documentElement.classList.add("home-motion-ready");
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          revealedTargets.add(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8%", threshold: 0.12 });

      revealTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        if (revealedTargets.has(target) || rect.top < window.innerHeight * 0.92) {
          target.classList.add("is-revealed");
          revealedTargets.add(target);
          return;
        }
        target.classList.remove("is-revealed");
        revealObserver?.observe(target);
      });
    };

    const detachVideoSources = () => {
      if (!video || !videoSourcesAttached) return;
      video.pause();
      video.preload = "none";
      video.removeAttribute("src");
      sourceEntries.forEach(({ source }) => source.removeAttribute("src"));
      video.load();
      videoSourcesAttached = false;
    };

    const attachVideoSources = () => {
      if (!video) return;
      if (videoSourcesAttached) {
        video.preload = "auto";
        video.load();
        return;
      }
      sourceEntries.forEach(({ source, src }) => {
        if (src) source.setAttribute("src", src);
      });
      video.preload = "auto";
      videoSourcesAttached = true;
      video.load();
    };

    const updatePlayback = () => {
      if (!video) return;
      if (!videoEnabled || document.hidden || !heroVisible || !playbackAllowed) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        playbackAllowed = false;
        video.pause();
        hero?.classList.remove("is-video-playing");
      });
    };

    const setVideoEnabled = (enabled: boolean) => {
      if (enabled === videoEnabled) return;
      videoEnabled = enabled;
      playbackAllowed = enabled;

      if (!enabled) {
        video?.pause();
        hero?.classList.remove("is-video-playing");
        detachVideoSources();
        return;
      }

      attachVideoSources();
      updatePlayback();
    };

    const syncMotionPreferences = () => {
      const motionAllowed = !reducedMotion.matches;
      setRevealsEnabled(motionAllowed);
      setParallaxEnabled(motionAllowed);
      setVideoEnabled(Boolean(video && hero && motionAllowed && desktop.matches && !constrainedConnection()));
    };

    const markPlaying = () => {
      if (videoEnabled) hero?.classList.add("is-video-playing");
    };
    const onVisibilityChange = () => updatePlayback();
    const onConnectionChange = () => syncMotionPreferences();

    if (video && hero) {
      heroObserver = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        updatePlayback();
      }, { threshold: 0.08 });
      heroObserver.observe(hero);
      video.addEventListener("playing", markPlaying);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    reducedMotion.addEventListener("change", syncMotionPreferences);
    desktop.addEventListener("change", syncMotionPreferences);
    connection?.addEventListener?.("change", onConnectionChange);
    syncMotionPreferences();

    return () => {
      reducedMotion.removeEventListener("change", syncMotionPreferences);
      desktop.removeEventListener("change", syncMotionPreferences);
      connection?.removeEventListener?.("change", onConnectionChange);
      setRevealsEnabled(false);
      setParallaxEnabled(false);
      setVideoEnabled(false);
      revealObserver?.disconnect();
      heroObserver?.disconnect();
      video?.removeEventListener("playing", markPlaying);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.documentElement.classList.remove("home-motion-ready");
    };
  }, []);

  return null;
}
