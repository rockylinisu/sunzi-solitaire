const PHASE2_APP_INFO = Object.freeze({
  appName: "孫子兵法接龍",
  releaseStage: "Alpha",
  appVersion: "0.0.6",
  releaseDate: "2026.07.20",
  copyrightYear: "2026",
  copyrightOwner: "林煥章",
  assetVersion: "alpha-0.0.6"
});

const PHASE2_COPYRIGHT_LABEL = `© ${PHASE2_APP_INFO.copyrightOwner} ${PHASE2_APP_INFO.copyrightYear} · ${PHASE2_APP_INFO.releaseStage} v${PHASE2_APP_INFO.appVersion} · ${PHASE2_APP_INFO.releaseDate}`;

const PHASE2_DIFFICULTY_NOTES = {
  L1: "先熟悉玩法與牌序",
  L2: "開始辨識《孫子兵法》章句",
  L3: "數字與原文並用",
  L4: "主要依靠原文判斷",
  L5: "完全依靠原文與篇序"
};

let phase2HintTimer = null;

function phase2CurrentDifficulty() {
  if (typeof phase1CurrentDifficulty === "function") return phase1CurrentDifficulty();
  return { id: "L1", name: "入門", label: "L1 入門｜全數字", hiddenNumberCount: 0 };
}

function phase2ChapterTitle(card) {
  if (!card) return "";
  const chapter = sunziTexts?.chapters?.find((item) => item.chapterNumber === card.value);
  return chapter?.fullTitle || card.title || DEFAULT_TITLES[card.value - 1] || "";
}

function phase2ShortChapterTitle(card) {
  return phase2ChapterTitle(card).replace(/^第[一二三四五六七八九十]+篇[｜ ]?/, "");
}

function phase2IsHiddenCard(card) {
  return Boolean(card && state.gameSession?.hiddenCardIds?.includes(card.id));
}

function phase2RenderVersionInfo() {
  document.querySelectorAll("[data-app-version-text]").forEach((element) => {
    element.textContent = PHASE2_COPYRIGHT_LABEL;
  });
}

function phase2ApplyStyles() {
  if (document.querySelector("#phase2Styles")) return;
  const style = document.createElement("style");
  style.id = "phase2Styles";
  style.textContent = `
    .difficulty-learning-note {
      grid-column: 1 / -1;
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      color: #2b2118;
      background: rgba(255, 255, 255, 0.34);
      border: 1px solid rgba(23, 18, 14, 0.12);
      font-size: 13px;
      line-height: 1.25;
    }

    .difficulty-learning-note strong {
      white-space: nowrap;
    }

    .phase2-hint-button {
      border: 0;
      min-height: 34px;
      padding: 5px 10px;
      color: #21160d;
      background: rgba(255, 255, 255, 0.72);
      box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
      cursor: pointer;
      font-size: 13px;
    }

    .phase2-hint-pop {
      position: absolute;
      left: 50%;
      top: 50%;
      z-index: 4;
      transform: translate(-50%, -50%);
      max-width: min(320px, 84vw);
      padding: 12px 14px;
      color: #17120e;
      background: rgba(246, 239, 227, 0.96);
      border: 2px solid rgba(217, 180, 95, 0.78);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
      text-align: center;
      font-weight: 800;
      line-height: 1.45;
      pointer-events: none;
    }

    .phase2-completion-summary {
      margin-top: 8px;
      padding: 9px 10px;
      color: #2b2118;
      background: rgba(255, 255, 255, 0.34);
      border: 1px solid rgba(23, 18, 14, 0.12);
      font-size: 14px;
      line-height: 1.55;
    }

    .phase2-reader-ready .target {
      border-color: rgba(217, 180, 95, 0.7);
    }

    @media (max-width: 760px) {
      :root[data-device-layout="phone"] .difficulty-learning-note {
        min-height: 24px;
        padding: 4px 6px;
        font-size: 12px;
      }

      :root[data-device-layout="phone"] .deck-info .phase2-hint-button {
        width: 52px;
        min-height: 32px;
        padding: 5px 4px;
        font-size: 12px;
      }
    }
  `;
  document.head.append(style);
}

function phase2InstallDifficultyNote() {
  if (!els.scriptureLevel || document.querySelector("#difficultyLearningNote")) return;
  const note = document.createElement("div");
  note.id = "difficultyLearningNote";
  note.className = "difficulty-learning-note";
  note.setAttribute("role", "status");
  els.scriptureLevel.closest(".controls")?.append(note);
  phase2UpdateDifficultyNote();
}

function phase2UpdateDifficultyNote() {
  const note = document.querySelector("#difficultyLearningNote");
  if (!note) return;
  const difficulty = phase2CurrentDifficulty();
  note.innerHTML = `<strong>${difficulty.id} ${difficulty.name}</strong><span>${PHASE2_DIFFICULTY_NOTES[difficulty.id] || ""}</span>`;
}

function phase2InstallHintButton() {
  if (!document.querySelector(".deck-info") || document.querySelector("#hintButton")) return;
  const button = document.createElement("button");
  button.id = "hintButton";
  button.className = "phase2-hint-button";
  button.type = "button";
  button.textContent = "提示";
  button.addEventListener("click", phase2ShowHint);
  document.querySelector(".deck-info").append(button);
}

function phase2SetHintCount(value) {
  state.hints = value;
  if (state.gameSession) state.gameSession.hintCount = value;
}

function phase2ShowHint() {
  if (!state.current || state.won) return;
  phase2SetHintCount((state.hints || 0) + 1);
  window.clearTimeout(phase2HintTimer);
  const existing = document.querySelector("#phase2HintPop");
  existing?.remove();
  const hint = document.createElement("div");
  hint.id = "phase2HintPop";
  hint.className = "phase2-hint-pop";
  const hiddenText = phase2IsHiddenCard(state.current) ? `提示：${state.current.rank}｜第${state.current.value}篇` : `目前牌：${state.current.rank}｜第${state.current.value}篇`;
  hint.textContent = `${hiddenText}｜${phase2ShortChapterTitle(state.current)}`;
  document.querySelector(".board")?.append(hint);
  setMessage(`已使用提示 ${state.hints || 0} 次。提示只短暫顯示，不改變本局無數字牌。`);
  phase2HintTimer = window.setTimeout(() => hint.remove(), 1800);
}

function phase2CompletionSummaryText() {
  const difficulty = phase2CurrentDifficulty();
  return `${difficulty.id} ${difficulty.name}｜分數 ${state.score}｜時間 ${formatTime(state.seconds)}｜Pass ${state.passes}｜錯 ${state.wrong}｜提示 ${state.hints || 0}`;
}

function phase2RenderCompletionSummary() {
  let summary = document.querySelector("#phase2CompletionSummary");
  if (!state.won) {
    summary?.remove();
    document.body.classList.remove("phase2-reader-ready");
    return;
  }
  if (!summary) {
    summary = document.createElement("div");
    summary.id = "phase2CompletionSummary";
    summary.className = "phase2-completion-summary";
    els.recordLine?.insertAdjacentElement("afterend", summary);
  }
  summary.textContent = `本局成果：${phase2CompletionSummaryText()}。可播放全牌複習，或點擊任一花色進入十三篇閱讀館。`;
  document.body.classList.add("phase2-reader-ready");
}

function phase2PatchGameSession() {
  if (typeof phase1CreateGameSession === "function") {
    const originalCreateGameSession = phase1CreateGameSession;
    phase1CreateGameSession = function phase2CreateGameSession(deck, difficulty) {
      const session = originalCreateGameSession(deck, difficulty);
      session.hintCount = 0;
      return session;
    };
  }

  if (typeof phase1CreateGameResult === "function") {
    const originalCreateGameResult = phase1CreateGameResult;
    phase1CreateGameResult = function phase2CreateGameResult(completed) {
      const result = originalCreateGameResult(completed);
      result.hintCount = state.gameSession?.hintCount ?? state.hints ?? 0;
      return result;
    };
  }
}

function phase2PatchNewGame() {
  const prepare = () => {
    phase2SetHintCount(0);
    document.querySelector("#phase2CompletionSummary")?.remove();
    document.querySelector("#phase2HintPop")?.remove();
    document.body.classList.remove("phase2-reader-ready");
  };
  const finish = () => {
    phase2SetHintCount(0);
    phase2UpdateDifficultyNote();
  };

  if (typeof phase1NewGame === "function") {
    const originalPhase1NewGame = phase1NewGame;
    phase1NewGame = function phase2WrappedPhase1NewGame() {
      prepare();
      originalPhase1NewGame();
      finish();
    };
  }

  const originalNewGame = newGame;
  newGame = function phase2NewGame() {
    prepare();
    originalNewGame();
    finish();
  };
}

function phase2PatchCheckWin() {
  checkWin = function phase2CheckWin() {
    if (state.placed < 52 || state.won) return;
    state.won = true;
    state.current = null;
    clearInterval(state.timer);
    updateScore();
    const result = saveRecord();
    setMessage(`完成接龍！${result.isBest ? "刷新最佳紀錄。" : "完成戰局。"}${phase2CompletionSummaryText()}。`);
    updateRecordDisplay();
    render();
    phase2RenderCompletionSummary();
    startPlayback();
  };
}

function phase2PatchCardPreview() {
  const originalOpenCardPreview = openCardPreview;
  openCardPreview = function phase2OpenCardPreview(suit) {
    originalOpenCardPreview(suit);
    const card = state.targetCards[suit];
    if (!card || !els.cardPreviewTitle) return;
    els.cardPreviewTitle.textContent = `第${card.value}篇｜${phase2ShortChapterTitle(card)}`;
    els.cardPreviewTitle.dataset.learningHint = "true";
  };
}

function phase2PatchStopPlayback() {
  const originalStopPlayback = stopPlayback;
  stopPlayback = function phase2StopPlayback() {
    originalStopPlayback();
    phase2RenderCompletionSummary();
  };
}

function phase2PatchRecords() {
  if (typeof phase1SaveRecord !== "function") return;
  const originalSaveRecord = phase1SaveRecord;
  phase1SaveRecord = function phase2SaveRecord(gameResult) {
    const result = gameResult || phase1CreateGameResult(true);
    result.hintCount = result.hintCount ?? state.gameSession?.hintCount ?? state.hints ?? 0;
    return originalSaveRecord(result);
  };
  saveRecord = phase1SaveRecord;
}

function phase2InstallDebug() {
  window.SUNZI_PHASE2_DEBUG = () => ({
    appInfo: PHASE2_APP_INFO,
    difficulty: phase2CurrentDifficulty(),
    note: PHASE2_DIFFICULTY_NOTES[phase2CurrentDifficulty().id],
    hintCount: state.hints || 0,
    sessionHintCount: state.gameSession?.hintCount || 0,
    won: state.won,
    completionSummary: document.querySelector("#phase2CompletionSummary")?.textContent || ""
  });
}

function phase2Install() {
  phase2ApplyStyles();
  phase2RenderVersionInfo();
  phase2PatchGameSession();
  phase2PatchNewGame();
  phase2PatchCheckWin();
  phase2PatchCardPreview();
  phase2PatchStopPlayback();
  phase2PatchRecords();
  phase2InstallDifficultyNote();
  phase2InstallHintButton();
  phase2InstallDebug();

  els.scriptureLevel?.addEventListener("change", () => window.setTimeout(phase2UpdateDifficultyNote, 0), true);
  phase2SetHintCount(state.gameSession?.hintCount || 0);
  phase2UpdateDifficultyNote();
}

phase2Install();