// ABADÁ Capoeira Israel — shared front-end behavior (no build step, no deps)

(function () {
  "use strict";

  /* ---------- Global scroll progress (drives the atmospheric background:
     rotating globe, moving grid) ---------- */
  let atmoTicking = false;
  function updateAtmoScrollProgress() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const progress = scrollableHeight > 0 ? scrollY / scrollableHeight : 0;
    document.body.style.setProperty("--scroll-p", progress.toFixed(4));
    atmoTicking = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!atmoTicking) {
        window.requestAnimationFrame(updateAtmoScrollProgress);
        atmoTicking = true;
      }
    },
    { passive: true }
  );
  updateAtmoScrollProgress();

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

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next); // explicit user choice overrides auto-detection from now on
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

  /* ---------- Floating menu (bottom-right button opens full-screen overlay) ---------- */
  const menuFab = document.querySelector("[data-menu-fab]");
  const menuOverlay = document.querySelector("[data-menu-overlay]");
  function closeMenu() {
    if (menuFab) menuFab.setAttribute("aria-expanded", "false");
    if (menuOverlay) menuOverlay.classList.remove("open");
  }
  if (menuFab && menuOverlay) {
    menuFab.addEventListener("click", () => {
      const isOpen = menuFab.getAttribute("aria-expanded") === "true";
      menuFab.setAttribute("aria-expanded", String(!isOpen));
      menuOverlay.classList.toggle("open", !isOpen);
    });
    // Close when a nav link inside the overlay is clicked
    menuOverlay.addEventListener("click", (e) => {
      if (e.target.closest(".menu-overlay-nav a")) closeMenu();
      if (e.target === menuOverlay) closeMenu(); // click on backdrop
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Draggable menu button ----------
     The menu button can be dragged anywhere on screen (like a floating
     assistive-touch handle). A short drag threshold distinguishes a tap
     (opens the menu) from an actual drag (repositions it). Position is
     remembered between visits via localStorage. */
  const menuFabFixed = document.querySelector(".menu-fab-fixed");
  if (menuFabFixed) {
    const POS_KEY = "aci-menu-fab-pos";
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY));
      if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
        menuFabFixed.style.left = saved.left + "px";
        menuFabFixed.style.top = saved.top + "px";
        menuFabFixed.style.right = "auto";
      }
    } catch (e) {
      /* ignore corrupt/blocked storage */
    }

    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    menuFabFixed.addEventListener("pointerdown", (e) => {
      dragging = true;
      moved = false;
      const rect = menuFabFixed.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      menuFabFixed.setPointerCapture(e.pointerId);
    });

    menuFabFixed.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      if (!moved) return;
      const rect = menuFabFixed.getBoundingClientRect();
      const newLeft = clamp(origLeft + dx, 8, window.innerWidth - rect.width - 8);
      const newTop = clamp(origTop + dy, 8, window.innerHeight - rect.height - 8);
      menuFabFixed.style.left = newLeft + "px";
      menuFabFixed.style.top = newTop + "px";
      menuFabFixed.style.right = "auto";
    });

    menuFabFixed.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        const rect = menuFabFixed.getBoundingClientRect();
        try {
          localStorage.setItem(POS_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
        } catch (err) {
          /* ignore */
        }
        // Suppress the click that would otherwise fire right after a drag
        const suppressClick = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        menuFabFixed.addEventListener("click", suppressClick, { capture: true, once: true });
      }
    });

    // Keep the button on-screen if the viewport is resized/rotated
    window.addEventListener("resize", () => {
      if (menuFabFixed.style.left === "") return;
      const rect = menuFabFixed.getBoundingClientRect();
      const newLeft = clamp(rect.left, 8, window.innerWidth - rect.width - 8);
      const newTop = clamp(rect.top, 8, window.innerHeight - rect.height - 8);
      menuFabFixed.style.left = newLeft + "px";
      menuFabFixed.style.top = newTop + "px";
    });
  }

  /* ---------- Mobile hero background: pointer/touch-driven 3D parallax ----------
     Permission-free alternative to device-orientation tilt (no iOS motion
     prompt). Tracks pointer/touch position anywhere on the page, normalizes
     it to [-1, 1], and exposes it as --norm-x/--norm-y on the .hero root —
     the actual translate3d/rotateX/rotateY math lives in CSS via calc(),
     scaled per-layer by that layer's own --depth. Background layers keep
     pointer-events:none so this never blocks taps on real buttons/links. */
  const heroEl = document.querySelector(".hero");
  if (heroEl) {
    let dragging = false;

    function setNorm(x, y) {
      const normX = (x / window.innerWidth) * 2 - 1;
      const normY = (y / window.innerHeight) * 2 - 1;
      heroEl.style.setProperty("--norm-x", normX.toFixed(4));
      heroEl.style.setProperty("--norm-y", normY.toFixed(4));
    }

    function startDrag(x, y) {
      dragging = true;
      heroEl.querySelectorAll(".spring-back").forEach((el) => el.classList.remove("spring-back"));
      setNorm(x, y);
    }

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      heroEl.querySelectorAll(".hero-mobile-bg, .hero-video").forEach((el) => el.classList.add("spring-back"));
      heroEl.style.setProperty("--norm-x", 0);
      heroEl.style.setProperty("--norm-y", 0);
    }

    // Event delegation on window, passive, so scrolling/dragging over
    // buttons and links never gets interrupted by coordinate tracking.
    window.addEventListener(
      "pointermove",
      (e) => {
        if (dragging) setNorm(e.clientX, e.clientY);
      },
      { passive: true }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (dragging && e.touches[0]) setNorm(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    window.addEventListener("pointerdown", (e) => startDrag(e.clientX, e.clientY), { passive: true });
    window.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    ["pointerup", "pointerleave", "touchend", "touchcancel"].forEach((evt) =>
      window.addEventListener(evt, endDrag, { passive: true })
    );
  }

  /* ---------- Hero background fade-on-scroll (readability) ----------
     As the visitor scrolls past the hero, the background photo/video
     fades out so the atmospheric effects and page content underneath
     stay clean and uncluttered. Single lightweight listener, only runs
     on pages that actually have a .hero. */
  if (heroEl) {
    const heroBg = heroEl.querySelector(".hero-bg");
    let heroTicking = false;
    function updateHeroFade() {
      const rect = heroEl.getBoundingClientRect();
      const fadeDistance = rect.height * 0.7;
      const scrolledPast = Math.max(0, -rect.top);
      const opacity = Math.max(0, 1 - scrolledPast / fadeDistance);
      if (heroBg) heroBg.style.opacity = opacity.toFixed(3);
      heroTicking = false;
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!heroTicking) {
          window.requestAnimationFrame(updateHeroFade);
          heroTicking = true;
        }
      },
      { passive: true }
    );
    updateHeroFade();
  }

  /* ---------- Achievements slider dots ---------- */
  const achvSlider = document.querySelector("[data-achv-slider]");
  const achvDotsWrap = document.querySelector("[data-achv-dots]");
  if (achvSlider && achvDotsWrap) {
    const dots = Array.from(achvDotsWrap.querySelectorAll(".achv-dot"));
    const frames = Array.from(achvSlider.querySelectorAll(".achv-frame"));
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        frames[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
    });
    if ("IntersectionObserver" in window) {
      const dotIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const idx = frames.indexOf(entry.target);
              dots.forEach((d) => d.setAttribute("aria-current", "false"));
              if (dots[idx]) dots[idx].setAttribute("aria-current", "true");
            }
          });
        },
        { root: achvSlider, threshold: 0.6 }
      );
      frames.forEach((f) => dotIo.observe(f));
    }
  }

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
      const val = (fieldName) => form.querySelector(`[name="${fieldName}"]`)?.value?.trim() || "";
      const name = val("name");
      const org = val("org");
      const phone = val("phone");
      const email = val("email");
      const message = val("message");

      // Minimum requirement: a name plus at least one way to respond (email or phone).
      if (!name || (!email && !phone)) {
        if (status) status.textContent = form.dataset.msgIncomplete || "Please fill in all fields.";
        return;
      }

      const subjectPrefix = form.dataset.subjectPrefix || "Website contact";
      const subject = encodeURIComponent(`${subjectPrefix} from ${name}`);
      const lines = [];
      if (org) lines.push(`Organization: ${org}`);
      if (phone) lines.push(`Phone: ${phone}`);
      if (email) lines.push(`Email: ${email}`);
      if (message) lines.push(`\n${message}`);
      lines.push(`\n— ${name}`);
      const body = encodeURIComponent(lines.join("\n"));
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

  /* ---------- Homepage stat counters (count up once visible) ---------- */
  const statEls = document.querySelectorAll(".stat b");
  if (statEls.length && "IntersectionObserver" in window) {
    const parseTarget = (text) => {
      const match = text.trim().match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };
    const animateCount = (el, target, suffix) => {
      const duration = 1400;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    };
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const text = el.textContent;
          const target = parseTarget(text);
          if (target !== null) {
            const suffix = text.trim().slice(String(target).length);
            el.textContent = "0" + suffix;
            animateCount(el, target, suffix);
          }
          statObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach((el) => statObserver.observe(el));
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
