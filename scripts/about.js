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
// NOTE: If this cursor looks different from your index page, open your `fx.js` file,
// find the cursor tracking code (look for `mousemove`), copy it, and replace this section.
const cursor = document.getElementById("glowing-cursor");
if (cursor) {
  document.addEventListener("mousemove", (e) => {
    // Update cursor position directly
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  document.addEventListener("mousedown", () => {
    cursor.style.transform = "translate(-50%, -50%) scale(0.6)";
    cursor.style.background = "rgba(189, 0, 255, 0.6)"; // Flash purple on click
  });
  document.addEventListener("mouseup", () => {
    cursor.style.transform = "translate(-50%, -50%) scale(1)";
    cursor.style.background = "rgba(0, 243, 255, 0.4)"; // Revert to cyan
  });
}

// =========================================
// 4. BACKGROUND CHEMICAL REACTIONS
// =========================================
const ambientBg = document.querySelector(".ambient-bg");

if (ambientBg) {
  // Actual Chemical Reactions
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
    "2H₂ + O₂ → 2H₂O",
    "CaCO₃ → CaO + CO₂"
  ];

  const createReaction = (isInitialLoad = false) => {
    const el = document.createElement("div");
    el.textContent = formulas[Math.floor(Math.random() * formulas.length)];
    
    el.style.position = "absolute";
    el.style.left = `${Math.random() * 95}vw`;
    
    // High Visibility Colors & Text Sizing
    el.style.color = "rgba(0, 243, 255, 0.9)";
    el.style.textShadow = "0 0 12px rgba(0, 243, 255, 0.8)";
    el.style.fontSize = `${Math.random() * 12 + 18}px`; // Size between 18px and 30px
    el.style.fontFamily = "'Orbitron', sans-serif";
    el.style.pointerEvents = "none";
    el.style.zIndex = "0";

    const duration = Math.random() * 8 + 12; // Takes 12 to 20 seconds to float up
    
    // If it's the first load, scatter them vertically across the screen immediately
    const startY = isInitialLoad ? `-${Math.random() * 100}vh` : `5vh`;
    
    el.style.bottom = "0";
    el.style.transform = `translateY(${startY})`;
    el.style.opacity = "0";

    ambientBg.appendChild(el);

    // Force browser reflow to guarantee the transition works
    void el.offsetWidth;

    el.style.transition = `transform ${duration}s linear, opacity 1s ease-in-out`;
    
    // INTENSE OPACITY (Very visible)
    el.style.opacity = "0.7"; 
    
    el.style.transform = `translateY(-120vh)`; // Floats completely off screen

    // Clean up memory when it leaves the screen
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 1000);
    }, duration * 1000 - 1000);
  };

  // INSTANT LOAD: Force 12 reactions to appear the exact millisecond the page loads
  for (let i = 0; i < 12; i++) {
    createReaction(true);
  }

  // CONTINUOUS SPAWN: Keeps generating them every 0.8 seconds
  setInterval(() => createReaction(false), 800);
}