// ABADÁ Capoeira Israel — shared front-end behavior (no build step, no deps)

(function () {
  "use strict";

  /* ---------- Theme (light/dark) with sun/moon icons ---------- */
  const THEME_KEY = "aci-theme";
  const root = document.documentElement;
  const savedTheme = localStorage.getItem(THEME_KEY);

  function getIsraelHour() {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jerusalem",
        hour: "numeric",
        hour12: false,
      });
      return parseInt(fmt.format(new Date()), 10);
    } catch (e) {
      return new Date().getHours();
    }
  }

  function autoThemeForNow() {
    const hour = getIsraelHour();
    // Dark from 18:00 to 06:00 Israel time, light otherwise
    return (hour >= 18 || hour < 6) ? "dark" : "light";
  }

  if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
  } else {
    root.setAttribute("data-theme", autoThemeForNow());
  }

  function updateThemeIcons() {
    const isDark = root.getAttribute("data-theme") === "dark";
    const sunIcon = document.querySelector(".sun-icon");
    const moonIcon = document.querySelector(".moon-icon");
    if (sunIcon) sunIcon.style.display = isDark ? "block" : "none";
    if (moonIcon) moonIcon.style.display = isDark ? "none" : "block";
  }

  updateThemeIcons();

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next); // explicit user choice overrides auto-detection from now on
    updateThemeIcons();
  });

  /* ---------- Scroll reveal animations ---------- */
  const revealSelectors = [
    ".hero-copy", ".hero-logo-mobile",
    ".section-head", ".card", ".stat", ".belt-chip", ".faq-item",
    ".trainer-card", ".masonry figure", ".contact-info-card", "form[data-contact-form]",
    ".page-header .hero-eyebrow, .page-header h1, .page-header p.lead",
  ];
  const revealEls = document.querySelectorAll(revealSelectors.join(","));
  revealEls.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.setProperty("--reveal-delay", `${Math.min(i % 8, 8) * 60}ms`);
  });

  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------- Header shadow on scroll (subtle "alive" feedback) ---------- */
  const siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    let lastY = window.scrollY;
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        siteHeader.classList.toggle("scrolled", y > 8);
        lastY = y;
      },
      { passive: true }
    );
  }
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (toggle && nav) {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      return;
    }
    // Close nav when a link inside it is clicked
    if (nav && nav.classList.contains("open") && e.target.closest("[data-nav] a")) {
      nav.classList.remove("open");
    }
  });

  /* ---------- Trainer city filters ---------- */
  const filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    const chips = Array.from(filterBar.querySelectorAll(".filter-chip"));
    const cards = Array.from(document.querySelectorAll("[data-trainer-card]"));
    filterBar.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
      chip.setAttribute("aria-pressed", "true");
      const city = chip.dataset.city;
      cards.forEach((card) => {
        const cities = (card.dataset.cities || "").split(",");
        const show = city === "all" || cities.includes(city);
        card.style.display = show ? "" : "none";
      });
    });
  }

  /* ---------- Contact form (client-side only placeholder) ---------- */
  const form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = form.querySelector("[data-form-status]");
      const name = form.querySelector("#name")?.value?.trim();
      const email = form.querySelector("#email")?.value?.trim();
      const message = form.querySelector("#message")?.value?.trim();
      if (!name || !email || !message) {
        if (status) status.textContent = form.dataset.msgIncomplete || "Please fill in all fields.";
        return;
      }
      const subject = encodeURIComponent(`Website contact from ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:${form.dataset.mailto}?subject=${subject}&body=${body}`;
      if (status) status.textContent = form.dataset.msgSent || "Opening your email app…";
    });
  }

  /* ---------- PWA: service worker + install prompt ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  let deferredPrompt = null;
  const banner = document.getElementById("install-banner");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner) banner.classList.add("visible");
  });
  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-install-btn]") && deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (banner) banner.classList.remove("visible");
    }
    if (e.target.closest("[data-install-dismiss]") && banner) {
      banner.classList.remove("visible");
    }
  });
})();
