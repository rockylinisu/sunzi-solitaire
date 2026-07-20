const PHASE1_APP_INFO = Object.freeze({
  appName: "孫子兵法接龍",
  releaseStage: "Alpha",
  appVersion: "0.0.5",
  releaseDate: "2026.07.20",
  copyrightYear: "2026",
  copyrightOwner: "林煥章",
  assetVersion: "alpha-0.0.5"
});

const PHASE1_DIFFICULTIES = [
  { id: "L1", name: "入門", label: "L1 入門｜全數字", shortLabel: "L1 入門：全數字", hiddenNumberCount: 0, scoreMultiplier: 1 },
  { id: "L2", name: "熟讀", label: "L2 熟讀｜隨機13張無數字", shortLabel: "L2 熟讀：無數字13", hiddenNumberCount: 13, scoreMultiplier: 1.15 },
  { id: "L3", name: "進階", label: "L3 進階｜隨機26張無數字", shortLabel: "L3 進階：無數字26", hiddenNumberCount: 26, scoreMultiplier: 1.35 },
  { id: "L4", name: "精熟", label: "L4 精熟｜隨機39張無數字", shortLabel: "L4 精熟：無數字39", hiddenNumberCount: 39, scoreMultiplier: 1.6 },
  { id: "L5", name: "宗師", label: "L5 宗師｜全無數字", shortLabel: "L5 宗師：全無數字", hiddenNumberCount: 52, scoreMultiplier: 2 }
];

const PHASE1_DIFFICULTY_BY_ID = Object.fromEntries(PHASE1_DIFFICULTIES.map((difficulty) => [difficulty.id, difficulty]));
const PHASE1_RECORD_KEY = "sunzi-solitaire-records-v2";
const PHASE1_LEGACY_RECORD_KEY = "sunzi-center-solitaire-records-v1";
const PHASE1_MAX_RECENT_RESULTS = 30;
const PHASE1_VERSION_LABEL = `${PHASE1_APP_INFO.releaseStage} v${PHASE1_APP_INFO.appVersion}`;
const PHASE1_COPYRIGHT_LABEL = `© ${PHASE1_APP_INFO.copyrightOwner} ${PHASE1_APP_INFO.copyrightYear} · ${PHASE1_VERSION_LABEL} · ${PHASE1_APP_INFO.releaseDate}`;

function phase1GameVersion() {
  return `${PHASE1_APP_INFO.releaseStage} v${PHASE1_APP_INFO.appVersion}`;
}

function phase1NormalizeDifficultyValue(value) {
  if (PHASE1_DIFFICULTY_BY_ID[value]) return value;
  const oldIndex = Number(value);
  return PHASE1_DIFFICULTIES[Number.isInteger(oldIndex) && oldIndex >= 0 && oldIndex < PHASE1_DIFFICULTIES.length ? oldIndex : 0].id;
}

function phase1CurrentDifficulty() {
  return PHASE1_DIFFICULTY_BY_ID[phase1NormalizeDifficultyValue(els.scriptureLevel?.value)] || PHASE1_DIFFICULTIES[0];
}

function phase1RenderDifficultyOptions() {
  if (!els.scriptureLevel) return;
  const selected = phase1NormalizeDifficultyValue(els.scriptureLevel.value);
  els.scriptureLevel.innerHTML = "";
  for (const difficulty of PHASE1_DIFFICULTIES) {
    const option = document.createElement("option");
    option.value = difficulty.id;
    option.textContent = difficulty.label;
    option.dataset.shortLabel = difficulty.shortLabel;
    els.scriptureLevel.append(option);
  }
  els.scriptureLevel.value = selected;
}

function phase1RenderVersionInfo() {
  document.querySelectorAll("[data-app-version-text]").forEach((element) => {
    element.textContent = PHASE1_COPYRIGHT_LABEL;
  });
}

function phase1GenerateGameId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function phase1IsoNow() {
  return new Date().toISOString();
}

function phase1CreateHiddenCardIds(deck, difficulty) {
  if (difficulty.hiddenNumberCount <= 0) return [];
  const ids = deck.map((card) => card.id);
  if (difficulty.hiddenNumberCount >= ids.length) return ids;
  return shuffle([...ids]).slice(0, difficulty.hiddenNumberCount);
}

function phase1CreateGameSession(deck, difficulty) {
  const hiddenCardIds = phase1CreateHiddenCardIds(deck, difficulty);
  return {
    gameId: phase1GenerateGameId(),
    gameType: "sunzi-solitaire",
    difficultyLevel: difficulty.id,
    hiddenNumberCount: difficulty.hiddenNumberCount,
    hiddenCardIds,
    startedAt: phase1IsoNow(),
    gameVersion: phase1GameVersion()
  };
}

function phase1ApplyDifficultyToDeck() {
  const hiddenIds = new Set(state.gameSession?.hiddenCardIds || []);
  for (const card of state.queue) {
    card.image = hiddenIds.has(card.id) ? card.scriptureImage : card.numberedImage;
  }
}

function phase1HasGameProgress() {
  return state.placed > 0 || state.passes > 0 || state.wrong > 0 || state.seconds > 1;
}

function phase1DefaultRecords() {
  return {
    schemaVersion: 2,
    gameType: "sunzi-solitaire",
    gameVersion: phase1GameVersion(),
    gamesPlayed: 0,
    gamesCompleted: 0,
    levels: Object.fromEntries(PHASE1_DIFFICULTIES.map((difficulty) => [difficulty.id, {
      bestScore: null,
      fastestTime: null,
      lowestPass: null
    }])),
    recentResults: [],
    migratedFrom: null
  };
}

function phase1LoadLegacyRecords() {
  try {
    return JSON.parse(localStorage.getItem(PHASE1_LEGACY_RECORD_KEY)) || null;
  } catch {
    return null;
  }
}

function phase1MigrateLegacyRecords(records) {
  const legacy = phase1LoadLegacyRecords();
  if (!legacy || records.migratedFrom === PHASE1_LEGACY_RECORD_KEY) return records;
  for (let i = 0; i < PHASE1_DIFFICULTIES.length; i += 1) {
    const difficulty = PHASE1_DIFFICULTIES[i];
    const old = legacy[`center-level-${i}`];
    if (!old) continue;
    const migratedGameId = `legacy-${difficulty.id}`;
    records.levels[difficulty.id] = {
      bestScore: old.score == null ? null : { value: old.score, gameId: migratedGameId, result: null },
      fastestTime: old.seconds == null ? null : { value: old.seconds, gameId: migratedGameId, result: null },
      lowestPass: old.passes == null ? null : { value: old.passes, gameId: migratedGameId, result: null }
    };
  }
  records.migratedFrom = PHASE1_LEGACY_RECORD_KEY;
  return records;
}

function phase1LoadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PHASE1_RECORD_KEY));
    if (parsed?.schemaVersion === 2) return phase1MigrateLegacyRecords(parsed);
  } catch {}
  return phase1MigrateLegacyRecords(phase1DefaultRecords());
}

function phase1SaveRecords(records) {
  records.gameVersion = phase1GameVersion();
  localStorage.setItem(PHASE1_RECORD_KEY, JSON.stringify(records));
}

function phase1RegisterGameStarted() {
  const records = phase1LoadRecords();
  records.gamesPlayed = (records.gamesPlayed || 0) + 1;
  phase1SaveRecords(records);
}

function phase1CreateGameResult(completed) {
  const session = state.gameSession;
  return {
    gameId: session?.gameId || phase1GenerateGameId(),
    gameType: "sunzi-solitaire",
    difficultyLevel: session?.difficultyLevel || phase1CurrentDifficulty().id,
    score: state.score,
    completionTime: state.seconds,
    passCount: state.passes,
    errorCount: state.wrong,
    completed,
    gameVersion: session?.gameVersion || phase1GameVersion(),
    startedAt: session?.startedAt || phase1IsoNow(),
    completedAt: completed ? phase1IsoNow() : null,
    hiddenNumberCount: session?.hiddenNumberCount ?? phase1CurrentDifficulty().hiddenNumberCount,
    hiddenCardIds: [...(session?.hiddenCardIds || [])]
  };
}

function phase1ResultEntry(result, key) {
  return {
    value: result[key],
    gameId: result.gameId,
    completedAt: result.completedAt,
    result
  };
}

function phase1SaveRecord(gameResult = phase1CreateGameResult(true)) {
  const records = phase1LoadRecords();
  const level = gameResult.difficultyLevel;
  const levelRecord = records.levels[level] || { bestScore: null, fastestTime: null, lowestPass: null };
  const isBestScore = !levelRecord.bestScore || gameResult.score > levelRecord.bestScore.value;
  const isFastest = !levelRecord.fastestTime || gameResult.completionTime < levelRecord.fastestTime.value;
  const isLowestPass = !levelRecord.lowestPass || gameResult.passCount < levelRecord.lowestPass.value;

  if (isBestScore) levelRecord.bestScore = phase1ResultEntry(gameResult, "score");
  if (isFastest) levelRecord.fastestTime = phase1ResultEntry(gameResult, "completionTime");
  if (isLowestPass) levelRecord.lowestPass = phase1ResultEntry(gameResult, "passCount");

  records.levels[level] = levelRecord;
  records.gamesCompleted = (records.gamesCompleted || 0) + 1;
  records.recentResults = [gameResult, ...(records.recentResults || [])].slice(0, PHASE1_MAX_RECENT_RESULTS);
  phase1SaveRecords(records);
  return { isBest: isBestScore, record: levelRecord };
}

function phase1UpdateRecordDisplay() {
  const difficulty = phase1CurrentDifficulty();
  const record = phase1LoadRecords().levels[difficulty.id];
  if (!record?.bestScore) {
    if (els.bestScore) els.bestScore.textContent = "--";
    if (els.recordLine) els.recordLine.textContent = `本機最佳：${difficulty.id} ${difficulty.name} 尚無完成紀錄。`;
    return;
  }
  if (els.bestScore) els.bestScore.textContent = String(record.bestScore.value);
  if (els.recordLine) {
    const fastest = record.fastestTime ? formatTime(record.fastestTime.value) : "--";
    const lowestPass = record.lowestPass ? record.lowestPass.value : "--";
    els.recordLine.textContent = `本機最佳：${difficulty.id} ${difficulty.name} / ${record.bestScore.value} 分 / 最快 ${fastest} / 最低 Pass ${lowestPass}。`;
  }
}

function phase1UpdateScore() {
  const difficulty = phase1CurrentDifficulty();
  const raw = Math.max(0, 12000 - state.seconds * 4 - state.passes * 35 - state.wrong * 120);
  state.score = Math.round(raw * difficulty.scoreMultiplier);
}

function phase1NewGame() {
  clearInterval(state.timer);
  stopPlayback();
  const difficulty = phase1CurrentDifficulty();
  const deck = shuffle(makeDeck());
  state.foundations = { S: 0, H: 0, D: 0, C: 0 };
  state.targetCards = { S: null, H: null, D: null, C: null };
  state.queue = deck;
  state.current = null;
  state.seconds = 0;
  state.passes = 0;
  state.wrong = 0;
  state.placed = 0;
  state.score = 0;
  state.won = false;
  state.readerHintShown = false;
  state.gameSession = phase1CreateGameSession(deck, difficulty);
  state.lastGameResult = null;
  state.selectedDifficultyLevel = difficulty.id;
  phase1ApplyDifficultyToDeck();
  phase1RegisterGameStarted();
  drawNext();
  state.timer = setInterval(tick, 1000);
  setMessage(`${difficulty.id} ${difficulty.name}新戰局開始。把中央牌拖到正確花色位置；不能接時雙擊 Pass。`);
  phase1UpdateRecordDisplay();
  render();
}

function phase1HandleDifficultyChange(event) {
  if (event) event.stopImmediatePropagation();
  const requested = phase1NormalizeDifficultyValue(els.scriptureLevel?.value);
  const current = state.selectedDifficultyLevel || requested;
  if (requested === current) return;
  if (state.gameSession && phase1HasGameProgress()) {
    const ok = window.confirm("切換難度將開始新戰局，是否繼續？");
    if (!ok) {
      els.scriptureLevel.value = current;
      return;
    }
  }
  els.scriptureLevel.value = requested;
  phase1NewGame();
}

function phase1PatchImageFallback() {
  const originalRenderCurrentCard = renderCurrentCard;
  renderCurrentCard = function renderCurrentCardWithFallback() {
    originalRenderCurrentCard();
    const img = els.currentCard?.querySelector?.("img");
    if (!img || !state.current) return;
    img.onerror = () => {
      els.currentCard.innerHTML = `<div class="card-fallback" style="width:100%;height:100%;display:grid;place-items:center;text-align:center;border-radius:6px;background:#fff;color:#17120e;font-size:clamp(18px,4vw,30px);font-weight:800;line-height:1.5;">${SUIT_SYMBOLS[state.current.suit]}<br>${state.current.rank}<br>${state.current.title}</div>`;
    };
  };
}

function phase1Install() {
  phase1RenderDifficultyOptions();
  phase1RenderVersionInfo();
  phase1PatchImageFallback();
  updateScore = phase1UpdateScore;
  saveRecord = phase1SaveRecord;
  updateRecordDisplay = phase1UpdateRecordDisplay;
  newGame = phase1NewGame;
  window.SUNZI_PHASE1_DEBUG = () => ({
    appInfo: PHASE1_APP_INFO,
    difficulties: PHASE1_DIFFICULTIES,
    session: state.gameSession,
    lastGameResult: state.lastGameResult,
    records: phase1LoadRecords()
  });

  document.querySelector("#newGame")?.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    phase1NewGame();
  }, true);
  els.scriptureLevel?.addEventListener("change", phase1HandleDifficultyChange, true);

  phase1NewGame();
}

phase1Install();
