// Phase 3C-UI-3: mobile portrait table control layout.
// Scope: reposition existing controls only; no game, auth, scoring, or data logic changes.
(function installPhase3cTableLayout() {
  const STYLE_ID = "phase3cTableLayoutStyles";
  const FORMAT_ATTR = "data-phase3c-formatting";
  const originalParents = new WeakMap();

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

  function moveForPhone() {
    const deckInfo = document.querySelector(".deck-info");
    const actions = document.querySelector(".actions");
    const phase3bActions = document.querySelector("#phase3bActions");
    const passButton = document.querySelector("#passButton");
    const queueCount = document.querySelector("#queueCount");
    const passCount = document.querySelector("#passCount");
    const playbackButton = document.querySelector("#playbackButton");
    const hintButton = document.querySelector("#hintButton");

    [phase3bActions, passButton, queueCount, passCount, playbackButton, hintButton].forEach(remember);

    if (!deckInfo || !isPhonePortrait()) {
      [passButton, playbackButton, hintButton].forEach(restore);
      document.documentElement.classList.remove("phase3c-table-mobile");
      return;
    }

    document.documentElement.classList.add("phase3c-table-mobile");

    const ordered = [phase3bActions, passButton, queueCount, passCount, playbackButton, hintButton].filter(Boolean);
    ordered.forEach((el) => deckInfo.appendChild(el));

    if (passButton) passButton.classList.add("phase3c-side-pass");
    if (playbackButton) playbackButton.classList.add("phase3c-side-playback");
    if (hintButton) hintButton.classList.add("phase3c-side-hint");
    if (actions) actions.setAttribute("aria-hidden", "true");

    installCounterObservers();
    formatSideStatus();
  }

  function installStyles() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 760px) and (orientation: portrait) {
        :root[data-device-layout="phone"] {
          --phase3c-side-control-w: 58px;
          --phase3c-table-gap: 5px;
          --phase3c-topbar-estimate: 164px;
          --phase3c-target-estimate: var(--phone-target-h, 118px);
          --phase3c-footer-estimate: 17px;
          --phase3c-board-pad-estimate: 14px;
          --phase3c-card-max-by-width: calc(100vw - var(--phase3c-side-control-w) - 34px);
          --phase3c-card-max-by-height: calc((100vh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-footer-estimate) - var(--phase3c-board-pad-estimate)) / 1.516);
          --phase3c-card-max-by-dvh: calc((100dvh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-footer-estimate) - var(--phase3c-board-pad-estimate)) / 1.516);
          --phase3c-card-max-by-svh: calc((100svh - var(--phase3c-topbar-estimate) - var(--phase3c-target-estimate) - var(--phase3c-footer-estimate) - var(--phase3c-board-pad-estimate)) / 1.516);
          --card-w: clamp(178px, min(var(--phase3c-card-max-by-width), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 318px);
        }

        :root[data-device-layout="phone"] .board {
          grid-template-rows: var(--phone-target-h) minmax(0, 1fr);
          overflow: visible;
        }

        :root[data-device-layout="phone"] .center-stage {
          grid-template-columns: var(--phase3c-side-control-w) minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
          grid-template-areas: "info card";
          align-items: stretch;
          gap: var(--phase3c-table-gap);
          min-height: 0;
          overflow: visible;
        }

        :root[data-device-layout="phone"] .deck-info {
          grid-area: info;
          align-self: center;
          justify-self: stretch;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: var(--phase3c-side-control-w);
          min-height: 0;
          max-height: 100%;
          gap: 5px;
          padding: 0;
          overflow: visible;
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
          min-width: 0;
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

        :root[data-device-layout="phone"] .deck-info > span.phase3c-side-status {
          min-height: 38px;
          color: white;
          background: rgba(0, 0, 0, 0.32);
          box-shadow: none;
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

        :root[data-device-layout="phone"] .card-slot,
        :root[data-device-layout="phone"] .current-card {
          grid-area: card;
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
          --phase3c-topbar-estimate: 158px;
          --phase3c-board-pad-estimate: 12px;
          --phase3c-card-max-by-width: calc(100vw - var(--phase3c-side-control-w) - 28px);
          --card-w: clamp(166px, min(var(--phase3c-card-max-by-width), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 292px);
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
          --phase3c-topbar-estimate: 154px;
          --card-w: clamp(156px, min(var(--phase3c-card-max-by-width), var(--phase3c-card-max-by-height), var(--phase3c-card-max-by-dvh), var(--phase3c-card-max-by-svh)), 250px);
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
      moveForPhone();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", moveForPhone, { passive: true });
    window.addEventListener("orientationchange", () => window.setTimeout(moveForPhone, 120), { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
