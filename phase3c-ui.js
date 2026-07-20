// Phase 3C-UI-1: mobile-only layout tuning for account and leaderboard controls.
// This file intentionally changes UI placement only; it does not touch game, auth, or leaderboard logic.
(function installPhase3cMobileUi() {
  const STYLE_ID = "phase3cMobileUiStyles";

  function installStyles() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 760px) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 58px;
        }

        :root[data-device-layout="phone"] .center-stage {
          grid-template-columns: var(--phase3c-side-control-w) minmax(0, 1fr);
        }

        :root[data-device-layout="phone"] .deck-info {
          width: var(--phase3c-side-control-w);
          justify-self: end;
          align-self: center;
          gap: 5px;
        }

        :root[data-device-layout="phone"] .phase3b-actions {
          position: static;
          right: auto;
          bottom: auto;
          z-index: 4;
          display: grid;
          width: 100%;
          gap: 5px;
          margin: 0 0 14px;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .deck-info span {
          display: grid;
          place-items: center;
          width: 100%;
          min-height: 34px;
          padding: 4px 4px;
          text-align: center;
          font-size: 11px;
          line-height: 1.15;
          white-space: normal;
        }

        :root[data-device-layout="phone"] .phase3b-action {
          overflow: hidden;
          border: 0;
          color: #21160d;
          background: rgba(246, 239, 227, 0.96);
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
        }

        :root[data-device-layout="phone"] #phase3bAccountButton {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        :root[data-device-layout="phone"] .stat strong {
          font-size: clamp(13px, 4.4vw, 20px);
          line-height: 1.05;
        }
      }

      @media (max-width: 390px) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 52px;
        }

        :root[data-device-layout="phone"] .phase3b-actions {
          margin-bottom: 12px;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .deck-info span {
          min-height: 32px;
          font-size: 10.5px;
        }

        :root[data-device-layout="phone"] .stat strong {
          font-size: clamp(12px, 4.2vw, 18px);
        }
      }

      @media (max-width: 330px) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 50px;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .deck-info span {
          font-size: 10px;
        }
      }
    `;
    document.head.append(style);
  }

  function placeMobileActions() {
    const actions = document.querySelector("#phase3bActions");
    const deckInfo = document.querySelector(".deck-info");
    if (!actions || !deckInfo) return false;
    if (actions.parentElement !== deckInfo) deckInfo.prepend(actions);
    return true;
  }

  function boot() {
    installStyles();
    if (placeMobileActions()) return;
    const observer = new MutationObserver(() => {
      if (placeMobileActions()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
