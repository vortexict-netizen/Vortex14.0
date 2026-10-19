document.addEventListener("DOMContentLoaded", () => {
  // =========================================
  // 1. THEME TOGGLE
  // =========================================
  const themeBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const htmlElement = document.documentElement;

  const savedTheme = localStorage.getItem("vortex_theme") || "dark";
  htmlElement.setAttribute("data-theme", savedTheme);

  if (themeIcon) {
    themeIcon.className =
      savedTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  themeBtn?.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    htmlElement.setAttribute("data-theme", newTheme);

    if (themeIcon) {
      themeIcon.className =
        newTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }

    localStorage.setItem("vortex_theme", newTheme);
  });

  // =========================================
  // 2. MOBILE MENU
  // =========================================
  const menuBtn = document.getElementById("menuToggleBtn");
  const navLinksEl = document.querySelector(".nav-links");

  const closeMenu = () => {
    menuBtn?.classList.remove("open");
    navLinksEl?.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded", "false");
  };

  menuBtn?.addEventListener("click", () => {
    const isOpen = navLinksEl.classList.toggle("open");
    menuBtn.classList.toggle("open", isOpen);
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  navLinksEl?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.querySelector(".nav-logo")?.addEventListener("click", closeMenu);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".navbar")) closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) closeMenu();
  });

  // =========================================
  // 3. GLOWING CURSOR
  // =========================================
  const cursor = document.getElementById("glowing-cursor");
  if (cursor) {
    document.addEventListener("mousemove", (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });

    document.addEventListener("mousedown", () => {
      cursor.style.transform = "translate(-50%, -50%) scale(0.7)";
    });
    document.addEventListener("mouseup", () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1)";
    });
  }

  // =========================================
  // 4. BACKGROUND CHEMICAL REACTIONS (MATCHING INDEX)
  // =========================================
  const ambientBg = document.querySelector(".ambient-bg");
  if (ambientBg) {
    const formulas = [
      "H₂O ⇌ H⁺ + OH⁻",
      "CH₄ + 2O₂ → CO₂ + 2H₂O",
      "N₂ + 3H₂ ⇌ 2NH₃",
      "C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂",
      "ΔG = ΔH - TΔS",
      "PV = nRT",
      "E = mc²",
      "NaCl → Na⁺ + Cl⁻",
      "CO₂ + H₂O → H₂CO₃",
    ];

    setInterval(() => {
      const el = document.createElement("div");
      el.textContent = formulas[Math.floor(Math.random() * formulas.length)];
      el.style.position = "absolute";
      el.style.left = `${Math.random() * 90}vw`;
      el.style.bottom = "-40px";
      el.style.color = "rgba(0, 243, 255, 0.25)";
      el.style.fontFamily = "'Orbitron', sans-serif";
      el.style.fontSize = `${Math.random() * 8 + 10}px`;
      el.style.pointerEvents = "none";
      el.style.zIndex = "0";

      const duration = Math.random() * 5 + 1; // Smooth and steady speed
      el.style.transition = `transform ${duration}s linear, opacity ${duration}s ease-in-out`;
      el.style.opacity = "0";

      ambientBg.appendChild(el);

      setTimeout(() => {
        el.style.transform = `translateY(-115vh)`;
        el.style.opacity = "0.7";
      }, 50);

      setTimeout(() => {
        el.remove();
      }, duration * 1000);
    }, 1200);
  }
});