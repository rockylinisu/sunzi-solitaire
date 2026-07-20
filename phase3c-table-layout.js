// Phase 3C-UI-4: mobile portrait table control layout.
// Scope: reposition and size existing controls only; no game, auth, scoring, or data logic changes.
(function installPhase3cTableLayout() {
  const STYLE_ID = "phase3cTableLayoutStyles";
  const FORMAT_ATTR = "data-phase3c-formatting";
  const originalParents = new WeakMap();
  let moveScheduled = false;

  function remember(el) {
    if (el && !originalParents.has(el)) {
      originalParents.set(el, { parent: el.parentElement, next: el.nextSibling });
    }
  }

  function restore(el) {
    const original = el ? originalParents.get(el) : null;
    if (!el || !original || !original.parent) return;
    if (el.parentElement === original.parent) return;
    original.parent.insertBefore(el, original.next && original.next.parentElement === original.parent ? original.next : null);
  }

  function isPhonePortrait() {
    const root = document.documentElement;
    return root.dataset.deviceLayout === "phone" && window.matchMedia("(orientation: portrait)").matches;
  }

  function extractNumber(text, fallback) {
    const match = String(text || "").match(/\d+/);
    return match ? match[0] : fallback;
  }

  function formatCounter(el, label, fallbackNumber, suffix) {
    if (!el || el.getAttribute(FORMAT_ATTR) === "1") return;
    const number = extractNumber(el.textContent, fallbackNumber);
    el.setAttribute(FORMAT_ATTR, "1");
    el.classList.add("phase3c-side-status");
    el.innerHTML = `<span class="phase3c-side-label">${label}</span><span class="phase3c-side-value">${number}${suffix}</span>`;
    el.removeAttribute(FORMAT_ATTR);
  }

  function formatSideStatus() {
    if (!isPhonePortrait()) return;
    formatCounter(document.querySelector("#queueCount"), "待判斷", "52", " 張");
    formatCounter(document.querySelector("#passCount"), "Pass", "0", " 張");
  }

  function installCounterObservers() {
    ["#queueCount", "#passCount"].forEach((selector) => {
      const el = document.querySelector(selector);
      if (!el || el.dataset.phase3cObserved === "1") return;
      el.dataset.phase3cObserved = "1";
      const observer = new MutationObserver(() => {
        if (el.getAttribute(FORMAT_ATTR) === "1") return;
        window.requestAnimationFrame(formatSideStatus);
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  function placeInOrder(parent, ordered) {
    const wanted = ordered.filter(Boolean);
    wanted.forEach((el, index) => {
      if (el.parentElement !== parent) {
        parent.appendChild(el);
      }
      const controlsInParent = [...parent.children].filter((child) => wanted.includes(child));
      if (controlsInParent[index] !== el) {
        parent.insertBefore(el, controlsInParent[index] || null);
      }
    });
  }

  function setSideButtonLabels(isPhone) {
    const playbackButton = document.querySelector("#playbackButton");
    if (!playbackButton) return;
    if (isPhone) {
      playbackButton.setAttribute("aria-label", "播放全牌");
      playbackButton.innerHTML = "播放<br>全牌";
    } else {
      playbackButton.removeAttribute("aria-label");
      playbackButton.textContent = "播放全牌";
    }
  }

  function moveForPhone() {
    const deckInfo = document.querySelector(".deck-info");
    const actions = document.querySelector(".actions");
    const phase3bActions = document.querySelector("#phase3bActions");
    const passButton = document.querySelector("#passButton");
    const queueCount = document.querySelector("#queueCount");
    const passCount = document.querySelector("#passCount");
    const playbackButton = document.querySelector("#playbackButton");
    const hintButton = document.querySelector("#hintButton");
    const phone = isPhonePortrait();

    [phase3bActions, passButton, queueCount, passCount, playbackButton, hintButton].forEach(remember);
    setSideButtonLabels(phone);

    if (!deckInfo || !phone) {
      [passButton, playbackButton, hintButton].forEach(restore);
      document.documentElement.classList.remove("phase3c-table-mobile");
      if (actions) actions.removeAttribute("aria-hidden");
      return;
    }

    document.documentElement.classList.add("phase3c-table-mobile");

    placeInOrder(deckInfo, [phase3bActions, passButton, queueCount, passCount, playbackButton, hintButton]);

    if (passButton) passButton.classList.add("phase3c-side-pass");
    if (playbackButton) playbackButton.classList.add("phase3c-side-playback");
    if (hintButton) hintButton.classList.add("phase3c-side-hint");
    if (actions) actions.setAttribute("aria-hidden", "true");

    installCounterObservers();
    formatSideStatus();
  }

  function scheduleMove() {
    if (moveScheduled) return;
    moveScheduled = true;
    window.requestAnimationFrame(() => {
      moveScheduled = false;
      moveForPhone();
    });
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
          --phase3c-table-gap: 6px;
          --phase3c-topbar-estimate: 164px;
          --phase3c-target-estimate: var(--phone-target-h, 118px);
          --phase3c-footer-estimate: 17px;
          --phase3c-board-pad-estimate: 14px;
          --phase3c-card-cell-w: calc(100vw - var(--phase3c-side-control-w) - var(--phase3c-table-gap) - 30px);
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
          position: relative;
          display: grid;
          grid-template-columns: var(--phase3c-side-control-w) minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
          grid-template-areas: "info card";
          align-items: stretch;
          justify-items: stretch;
          gap: var(--phase3c-table-gap);
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }

        :root[data-device-layout="phone"] .deck-info {
          position: relative;
          z-index: 30;
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

        :root[data-device-layout="phone"] #passButton.phase3c-side-pass {
          order: 20;
          margin-bottom: 16px;
          background: var(--gold);
        }

        :root[data-device-layout="phone"] #queueCount { order: 30; }
        :root[data-device-layout="phone"] #passCount { order: 40; }
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback { order: 50; }
        :root[data-device-layout="phone"] #hintButton.phase3c-side-hint { order: 60; }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .deck-info > button,
        :root[data-device-layout="phone"] .deck-info > span {
          display: grid;
          place-items: center;
          width: 100%;
          min-width: 0 !important;
          max-width: 100%;
          min-height: 36px;
          padding: 5px 4px;
          border: 0;
          text-align: center;
          font-size: 11px;
          line-height: 1.14;
          white-space: normal;
          overflow-wrap: anywhere;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback,
        :root[data-device-layout="phone"] #hintButton.phase3c-side-hint {
          background: rgba(246, 239, 227, 0.96);
          color: #21160d;
        }

        :root[data-device-layout="phone"] #passButton.phase3c-side-pass,
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          position: relative;
          z-index: 35;
          display: grid !important;
          place-items: center;
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
          font-size: 10.5px !important;
          line-height: 1.05;
          overflow: hidden;
          pointer-events: auto;
          touch-action: manipulation;
          user-select: none;
        }

        :root[data-device-layout="phone"] #passButton.phase3c-side-pass:active,
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback:active,
        :root[data-device-layout="phone"] #hintButton.phase3c-side-hint:active,
        :root[data-device-layout="phone"] .phase3b-action:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.22);
        }

        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          font-size: 10px !important;
        }

        :root[data-device-layout="phone"] .deck-info > span.phase3c-side-status {
          min-height: 38px;
          color: white;
          background: rgba(0, 0, 0, 0.32);
          box-shadow: none;
          cursor: default;
        }

        :root[data-device-layout="phone"] .phase3c-side-label,
        :root[data-device-layout="phone"] .phase3c-side-value {
          display: block;
          width: 100%;
        }

        :root[data-device-layout="phone"] .phase3c-side-value {
          margin-top: 1px;
          font-weight: 800;
        }

        :root[data-device-layout="phone"] .card-slot {
          grid-area: card;
          position: relative;
          z-index: 1;
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
          grid-area: unset;
          position: relative;
          z-index: 1;
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
          --phase3c-card-cell-w: calc(100vw - var(--phase3c-side-control-w) - var(--phase3c-table-gap) - 26px);
          --card-w: clamp(164px, min(var(--phase3c-card-cell-w), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 286px);
        }

        :root[data-device-layout="phone"] .phase3b-actions,
        :root[data-device-layout="phone"] #passButton.phase3c-side-pass {
          margin-bottom: 14px;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .deck-info > button,
        :root[data-device-layout="phone"] .deck-info > span {
          min-height: 34px;
          padding: 4px 3px;
          font-size: 10.5px;
        }

        :root[data-device-layout="phone"] .deck-info > span.phase3c-side-status {
          min-height: 36px;
        }
      }

      @media (max-width: 330px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 49px;
          --phase3c-action-size: 42px;
          --phase3c-topbar-estimate: 154px;
          --phase3c-card-cell-w: calc(100vw - var(--phase3c-side-control-w) - var(--phase3c-table-gap) - 24px);
          --card-w: clamp(154px, min(var(--phase3c-card-cell-w), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 246px);
        }

        :root[data-device-layout="phone"] .phase3b-actions,
        :root[data-device-layout="phone"] #passButton.phase3c-side-pass {
          margin-bottom: 12px;
        }

        :root[data-device-layout="phone"] .phase3b-action,
        :root[data-device-layout="phone"] .deck-info > button,
        :root[data-device-layout="phone"] .deck-info > span {
          min-height: 32px;
          font-size: 10px;
        }
      }
    `;
    document.head.append(style);
  }

  function boot() {
    installStyles();
    moveForPhone();
    const observer = new MutationObserver(() => {
      installCounterObservers();
      scheduleMove();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleMove, { passive: true });
    window.addEventListener("orientationchange", () => window.setTimeout(scheduleMove, 120), { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
