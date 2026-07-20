// Phase 3C-UI-2: mobile portrait main layout optimization.
// Scope: bottom information trimming and central card visibility only.
(function installPhase3cMainLayout() {
  const STYLE_ID = "phase3cMainLayoutStyles";

  function installStyles() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 760px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-topbar-estimate: 160px;
          --phase3c-target-estimate: var(--phone-target-h, 126px);
          --phase3c-actions-estimate: 58px;
          --phase3c-board-pad-estimate: 18px;
          --phase3c-footer-estimate: 18px;
          --phase3c-card-max-by-height: calc((100vh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-actions-estimate) - var(--phase3c-board-pad-estimate) - var(--phase3c-footer-estimate)) / 1.516);
          --phase3c-card-max-by-dvh: calc((100dvh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-actions-estimate) - var(--phase3c-board-pad-estimate) - var(--phase3c-footer-estimate)) / 1.516);
          --phase3c-card-max-by-svh: calc((100svh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-actions-estimate) - var(--phase3c-board-pad-estimate) - var(--phase3c-footer-estimate)) / 1.516);
          --card-w: clamp(168px, min(68vw, var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 294px);
        }

        :root[data-device-layout="phone"] body {
          min-height: 100vh;
          min-height: 100svh;
          min-height: 100dvh;
          height: auto;
          overflow-x: hidden;
          overflow-y: auto;
        }

        :root[data-device-layout="phone"] .game-shell {
          min-height: 100vh;
          min-height: 100svh;
          min-height: 100dvh;
          height: auto;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 3px;
          overflow: visible;
        }

        :root[data-device-layout="phone"] .message,
        :root[data-device-layout="phone"] .record-line {
          display: none;
        }

        :root[data-device-layout="phone"] .copyright {
          margin: 0;
          min-height: 16px;
          font-size: 11px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :root[data-device-layout="phone"] .board {
          height: auto;
          min-height: 0;
          max-height: none;
          overflow: visible;
          grid-template-rows: var(--phone-target-h) minmax(0, 1fr) auto;
        }

        :root[data-device-layout="phone"] .center-stage {
          min-height: 0;
          grid-template-rows: minmax(0, 1fr) var(--phone-actions-h, 54px);
          align-content: stretch;
          overflow: visible;
        }

        :root[data-device-layout="phone"] .deck-info {
          align-self: center;
          max-height: 100%;
        }

        :root[data-device-layout="phone"] .card-slot,
        :root[data-device-layout="phone"] .current-card {
          width: var(--card-w);
          height: calc(var(--card-w) * 1.516);
          max-width: 100%;
          max-height: none;
          overflow: visible;
        }

        :root[data-device-layout="phone"] .card-slot {
          align-self: center;
          justify-self: center;
        }

        :root[data-device-layout="phone"] .actions {
          align-self: end;
          min-height: var(--phone-actions-h, 54px);
          padding-bottom: 0;
        }
      }

      @media (max-width: 390px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-topbar-estimate: 152px;
          --phase3c-actions-estimate: 54px;
          --phase3c-board-pad-estimate: 14px;
          --card-w: clamp(158px, min(66vw, var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 268px);
        }
      }

      @media (max-width: 330px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-topbar-estimate: 150px;
          --card-w: clamp(148px, min(64vw, var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 236px);
        }
      }
    `;
    document.head.append(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installStyles, { once: true });
  } else {
    installStyles();
  }
})();
