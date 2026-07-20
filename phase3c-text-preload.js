// Phase 3C small polish: mobile sidebar text and one-time 104-card cache warm-up.
// No observers, resize relocation, polling, or game-rule changes.
(function installPhase3cTextAndPreload() {
  "use strict";

  const STYLE_ID = "phase3cTextPreloadStyles";
  const PRELOAD_BATCH_SIZE = 8;
  const MVP_COPYRIGHT_TEXT = "© 林煥章 2026 · Alpha v0.0.7 · MVP Released · 2026.07.20";
  let preloadStarted = false;
  let preloadFinished = false;
  let preloadTotal = 0;
  let preloadLoaded = 0;
  let preloadFailed = 0;

  function installStyles() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 760px) and (orientation: portrait) {
        :root[data-device-layout="phone"] #queueCount.phase3c-side-status,
        :root[data-device-layout="phone"] #passCount.phase3c-side-status,
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          white-space: pre-line !important;
        }

        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          font-size: 10.5px !important;
        }

        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback::before {
          content: none !important;
        }
      }

      @media (max-width: 390px) and (orientation: portrait) {
        :root[data-device-layout="phone"] #playbackButton.phase3c-side-playback {
          font-size: 10px !important;
        }
      }
    `;
    document.head.append(style);
  }

  function renderMvpCopyright() {
    document.querySelectorAll("[data-app-version-text]").forEach((element) => {
      element.textContent = MVP_COPYRIGHT_TEXT;
    });
  }

  function normalizeSidebarText() {
    if (typeof els === "undefined" || typeof state === "undefined") return;
    if (els.queueCount) {
      els.queueCount.textContent = state.current ? `待判斷\n${state.queue.length + 1} 張` : "已完成";
    }
    if (els.passCount) {
      els.passCount.textContent = `Pass\n${state.passes} 張`;
    }
    if (els.playbackButton) {
      els.playbackButton.textContent = "播放\n全牌";
      els.playbackButton.setAttribute("aria-label", "播放全牌");
    }
  }

  function patchRenderStats() {
    if (typeof renderStats !== "function") return;
    const originalRenderStats = renderStats;
    renderStats = function phase3cRenderStatsWithSidebarBreaks() {
      originalRenderStats.apply(this, arguments);
      normalizeSidebarText();
      renderMvpCopyright();
    };
  }

  function scheduleWork(callback) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: 1500 });
    } else {
      window.setTimeout(callback, 80);
    }
  }

  function uniqueCardImagePaths() {
    if (typeof playbackCards !== "function") return [];
    return [...new Set(playbackCards().map((card) => card.image).filter(Boolean))];
  }

  function preloadNextBatch(paths, index) {
    const batch = paths.slice(index, index + PRELOAD_BATCH_SIZE);
    if (!batch.length) {
      preloadFinished = true;
      return;
    }

    Promise.allSettled(batch.map((src) => preloadImage(src))).then((results) => {
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) preloadLoaded += 1;
        else preloadFailed += 1;
      }
      scheduleWork(() => preloadNextBatch(paths, index + PRELOAD_BATCH_SIZE));
    });
  }

  function startAllCardPreload() {
    if (preloadStarted || typeof preloadImage !== "function") return;
    const paths = uniqueCardImagePaths();
    if (!paths.length) return;
    preloadStarted = true;
    preloadTotal = paths.length;
    scheduleWork(() => preloadNextBatch(paths, 0));
  }

  function startPreloadAfterFirstCard() {
    window.setTimeout(startAllCardPreload, 250);
  }

  function patchNewGamePreloadHook() {
    if (typeof newGame !== "function") return;
    const originalNewGame = newGame;
    newGame = function phase3cNewGameWithPreloadHook() {
      const result = originalNewGame.apply(this, arguments);
      startPreloadAfterFirstCard();
      return result;
    };
  }

  installStyles();
  patchRenderStats();
  patchNewGamePreloadHook();
  normalizeSidebarText();
  renderMvpCopyright();
  startPreloadAfterFirstCard();

  window.SUNZI_PHASE3C_PRELOAD_DEBUG = function phase3cPreloadDebug() {
    return {
      started: preloadStarted,
      finished: preloadFinished,
      total: preloadTotal,
      loaded: preloadLoaded,
      failed: preloadFailed,
      copyright: MVP_COPYRIGHT_TEXT,
    };
  };
})();
