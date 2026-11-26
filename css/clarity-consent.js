(() => {
  const CLARITY_ID = "zipzwrbiom";
  const CONSENT_KEY = "vortex_cookie_consent";

  function loadClarity() {
    if (window.__vortexClarityLoaded) return;
    window.__vortexClarityLoaded = true;

    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  function injectStyles() {
    if (document.getElementById("vortexConsentStyles")) return;
    const style = document.createElement("style");
    style.id = "vortexConsentStyles";
    style.textContent = `
      .vortex-cookie-banner {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 2rem);
        max-width: 680px;
        background: var(--glass-bg, #141419);
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
        border-radius: 14px;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 9500;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        font-family: "Inter", sans-serif;
      }
      .vortex-cookie-text {
        font-size: 0.85rem;
        color: var(--text-muted, #cccccc);
        line-height: 1.5;
        margin: 0;
      }
      .vortex-cookie-text a {
        color: var(--primary-cyan, #00f3ff);
        text-decoration: underline;
      }
      .vortex-cookie-actions {
        display: flex;
        gap: 0.6rem;
        flex-shrink: 0;
      }
      .vortex-cookie-btn {
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: opacity 0.2s, transform 0.15s;
      }
      .vortex-cookie-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .vortex-cookie-decline {
        background: transparent;
        border-color: var(--glass-border, rgba(255, 255, 255, 0.2));
        color: var(--text-muted, #cccccc);
      }
      .vortex-cookie-accept {
        background: linear-gradient(90deg, var(--primary-cyan, #00f3ff), var(--primary-purple, #bd00ff));
        color: #ffffff;
      }
      @media (max-width: 600px) {
        .vortex-cookie-banner {
          flex-direction: column;
          align-items: stretch;
          bottom: 12px;
        }
        .vortex-cookie-actions {
          justify-content: flex-end;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function showBanner() {
    if (document.getElementById("vortexCookieBanner")) return;
    injectStyles();

    const banner = document.createElement("div");
    banner.id = "vortexCookieBanner";
    banner.className = "vortex-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML = `
      <p class="vortex-cookie-text">
        We use Microsoft Clarity to understand site traffic and improve Vortex 14.0.
        <a href="/terms.html#analytics">Learn more</a>
      </p>
      <div class="vortex-cookie-actions">
        <button type="button" class="vortex-cookie-btn vortex-cookie-decline" id="vortexCookieDecline">Decline</button>
        <button type="button" class="vortex-cookie-btn vortex-cookie-accept" id="vortexCookieAccept">Accept</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById("vortexCookieAccept").addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      banner.remove();
      loadClarity();
    });

    document.getElementById("vortexCookieDecline").addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      banner.remove();
    });
  }

  // Allow users to change their preference from terms.html
  window.resetVortexConsent = () => {
    localStorage.removeItem(CONSENT_KEY);
    showBanner();
  };

  function init() {
    const choice = localStorage.getItem(CONSENT_KEY);
    if (choice === "accepted") {
      loadClarity();
    } else if (choice !== "declined") {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();