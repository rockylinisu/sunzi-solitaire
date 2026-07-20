// Phase 3C stable mobile table layout.
// Scope: one-time control placement plus CSS-only responsive layout.
// No persistent observers, resize DOM relocation, polling, or game/auth logic changes.
(function installPhase3cStableTableLayout() {
  const STYLE_ID = "phase3cTableLayoutStyles";
  const INIT_ATTR = "data-phase3c-table-initialized";

  function isPhonePortrait() {
    const root = document.documentElement;
    return root.dataset.deviceLayout === "phone" && window.matchMedia("(orientation: portrait)").matches;
  }

  function moveOnce(parent, el) {
    if (!parent || !el || el.parentElement === parent) return;
    parent.appendChild(el);
  }

  function initializeMobileDomOnce() {
    if (document.documentElement.getAttribute(INIT_ATTR) === "1") return;
    if (!isPhonePortrait()) return;

    const deckInfo = document.querySelector(".deck-info");
    const actions = document.querySelector(".actions");
    if (!deckInfo) return;

    const phase3bActions = document.querySelector("#phase3bActions");
    const passButton = document.querySelector("#passButton");
    const queueCount = document.querySelector("#queueCount");
    const passCount = document.querySelector("#passCount");
    const playbackButton = document.querySelector("#playbackButton");
    const hintButton = document.querySelector("#hintButton");

    [phase3bActions, passButton, queueCount, passCount, playbackButton, hintButton].forEach((el) => moveOnce(deckInfo, el));

    document.documentElement.classList.add("phase3c-table-mobile");
    document.documentElement.setAttribute(INIT_ATTR, "1");

    passButton?.classList.add("phase3c-side-action", "phase3c-side-pass");
    playbackButton?.classList.add("phase3c-side-action", "phase3c-side-playback");
    hintButton?.classList.add("phase3c-side-action", "phase3c-side-hint");
    queueCount?.classList.add("phase3c-side-status", "phase3c-queue-status");
    passCount?.classList.add("phase3c-side-status", "phase3c-pass-status");

    if (playbackButton) playbackButton.setAttribute("aria-label", "播放全牌");
    if (actions) actions.setAttribute("aria-hidden", "true");
  }

  function installStyles() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 760px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 58px;
          --phase3c-action-size: 48px;
          --phase3c-stage-gap: 6px;
          --phase3c-topbar-estimate: 164px;
          --phase3c-target-estimate: var(--phone-target-h, 118px);
          --phase3c-footer-estimate: 17px;
          --phase3c-board-pad-estimate: 14px;
          --phase3c-card-cell-w: calc(100vw - var(--phase3c-side-control-w) - var(--phase3c-stage-gap) - 30px);
          --phase3c-card-max-by-height: calc((100vh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-footer-estimate) - var(--phase3c-board-pad-estimate)) / 1.516);
          --phase3c-card-max-by-dvh: calc((100dvh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-footer-estimate) - var(--phase3c-board-pad-estimate)) / 1.516);
          --phase3c-card-max-by-svh: calc((100svh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-footer-estimate) - var(--phase3c-board-pad-estimate)) / 1.516);
          --card-w: clamp(174px, min(var(--phase3c-card-cell-w), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 304px);
        }

        :root[data-device-layout="phone"] .board {
          grid-template-rows: var(--phone-target-h) minmax(0, 1fr);
          overflow: visible;
        }

        :root[data-device-layout="phone"] .center-stage {
          display: grid;
          grid-template-columns: var(--phase3c-side-control-w) minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
          grid-template-areas: "info card";
          align-items: stretch;
          justify-items: stretch;
          gap: var(--phase3c-stage-gap);
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }

        :root[data-device-layout="phone"] .deck-info {
          position: relative;
          z-index: 20;
          grid-area: info;
          align-self: center;
          justify-self: stretch;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: var(--phase3c-side-control-w);
          min-width: 0;
          min-height: 0;
          max-height: 100%;
          gap: 5px;
          padding: 0;
          overflow: visible;
          pointer-events: auto;
        }

        :root[data-device-layout="phone"] .phase3b-actions {
          order: 10;
          display: grid;
          gap: 5px;
          width: 100%;
          margin: 0 0 16px;
        }

        :root[data-device-layout="phone"] #passButton.phase3c-side-pass { order: 20; margin-bottom: 16px; }
        :root[data-device-layout="phone"] #queueCount.phase3c-side-status { order: 30; }
        :root[data-device-layout="phone"] #passCount.phase3c-side-status { order: 40; }
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback { order: 50; }
        :root[data-device-layout="phone"] #hintButton.phase3c-side-hint { order: 60; }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .phase3c-side-action,
        :root[data-device-layout="phone"] .phase3c-side-status {
          display: grid;
          place-items: center;
          width: 100%;
          max-width: 100%;
          min-width: 0 !important;
          border: 0;
          text-align: center;
          white-space: normal;
          overflow-wrap: anywhere;
          box-sizing: border-box;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .phase3c-side-action {
          min-height: 34px;
          padding: 4px 3px;
          color: #21160d;
          background: rgba(246, 239, 227, 0.96);
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
          cursor: pointer;
          font-size: 10.5px;
          line-height: 1.08;
          touch-action: manipulation;
          user-select: none;
        }

        :root[data-device-layout="phone"] #passButton.phase3c-side-pass,
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          width: var(--phase3c-action-size) !important;
          min-width: var(--phase3c-action-size) !important;
          max-width: var(--phase3c-action-size) !important;
          height: var(--phase3c-action-size) !important;
          min-height: var(--phase3c-action-size) !important;
          max-height: var(--phase3c-action-size) !important;
          aspect-ratio: 1 / 1;
          padding: 0 3px !important;
          border: 1px solid rgba(23, 18, 14, 0.18);
          border-radius: 3px;
          z-index: 22;
        }

        :root[data-device-layout="phone"] #passButton.phase3c-side-pass {
          background: var(--gold);
        }

        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        :root[data-device-layout="phone"] .phase3b-action:active,
        :root[data-device-layout="phone"] .phase3c-side-action:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.22);
        }

        :root[data-device-layout="phone"] .phase3c-side-status {
          min-height: 38px;
          padding: 5px 4px;
          color: white;
          background: rgba(0, 0, 0, 0.32);
          box-shadow: none;
          cursor: default;
          font-size: 11px;
          line-height: 1.18;
        }

        :root[data-device-layout="phone"] .phase3c-queue-status,
        :root[data-device-layout="phone"] .phase3c-pass-status {
          white-space: pre-line;
        }

        :root[data-device-layout="phone"] .card-slot {
          grid-area: card;
          align-self: center;
          justify-self: center;
          display: grid;
          place-items: center;
          width: min(var(--card-w), 100%);
          height: min(calc(var(--card-w) * 1.516), 100%);
          min-width: 0;
          max-width: 100%;
          max-height: 100%;
          overflow: visible;
        }

        :root[data-device-layout="phone"] .current-card {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          overflow: visible;
        }

        :root[data-device-layout="phone"] .actions {
          display: none;
          height: 0;
          min-height: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        :root[data-device-layout="phone"] .learn-line,
        :root[data-device-layout="phone"] .message,
        :root[data-device-layout="phone"] .record-line {
          display: none;
        }
      }

      @media (max-width: 390px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 52px;
          --phase3c-action-size: 44px;
          --phase3c-topbar-estimate: 158px;
          --phase3c-board-pad-estimate: 12px;
          --phase3c-card-cell-w: calc(100vw - var(--phase3c-side-control-w) - var(--phase3c-stage-gap) - 26px);
          --card-w: clamp(164px, min(var(--phase3c-card-cell-w), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 286px);
        }

        :root[data-device-layout="phone"] .phase3b-actions,
        :root[data-device-layout="phone"] #passButton.phase3c-side-pass {
          margin-bottom: 14px;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .phase3c-side-action,
        :root[data-device-layout="phone"] .phase3c-side-status {
          font-size: 10px;
        }
      }

      @media (max-width: 330px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 49px;
          --phase3c-action-size: 42px;
          --phase3c-topbar-estimate: 154px;
          --phase3c-card-cell-w: calc(100vw - var(--phase3c-side-control-w) - var(--phase3c-stage-gap) - 24px);
          --card-w: clamp(154px, min(var(--phase3c-card-cell-w), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 246px);
        }

        :root[data-device-layout="phone"] .phase3b-actions,
        :root[data-device-layout="phone"] #passButton.phase3c-side-pass {
          margin-bottom: 12px;
        }
      }
    `;
    document.head.append(style);
  }

  function boot() {
    installStyles();
    initializeMobileDomOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
