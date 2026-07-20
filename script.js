const SUITS = ["S", "H", "D", "C"];
const SUIT_NAMES = { S: "黑桃", H: "紅心", D: "鑽石", C: "梅花" };
const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const DEFAULT_TITLES = ["始計", "作戰", "謀攻", "軍形", "兵勢", "虛實", "軍爭", "九變", "行軍", "地形", "九地", "火攻", "用間"];
const LEVEL_NAMES = ["全有數", "13 張無數", "26 張無數", "39 張無數", "全無數"];
const LEVEL_MULTIPLIERS = [1, 1.15, 1.35, 1.6, 2];
const RECORD_KEY = "sunzi-center-solitaire-records-v1";
const PLAYBACK_DELAY_MS = 185;

let TITLES = [...DEFAULT_TITLES];
let sunziTexts = null;
let sunziCards = null;
const imageCache = new Map();
let playbackControlLastTap = 0;

const state = {
  queue: [],
  foundations: { S: 0, H: 0, D: 0, C: 0 },
  targetCards: { S: null, H: null, D: null, C: null },
  current: null,
  seconds: 0,
  passes: 0,
  wrong: 0,
  placed: 0,
  score: 0,
  timer: null,
  drag: null,
  won: false,
  playbackTimer: null,
  playbackIndex: 0,
  playbackCards: [],
  playbackPreparing: false,
  playbackState: "idle",
  playbackRunId: 0,
  readerHintShown: false,
  readerFont: "ming",
  readingState: "idle",
  speechUtterance: null,
  speechParts: [],
  currentSpeechIndex: 0,
  speechRunId: 0,
};

const els = {
  scriptureLevel: document.querySelector("#scriptureLevel"),
  placedCount: document.querySelector("#placedCount"),
  score: document.querySelector("#score"),
  bestScore: document.querySelector("#bestScore"),
  timer: document.querySelector("#timer"),
  queueCount: document.querySelector("#queueCount"),
  passCount: document.querySelector("#passCount"),
  currentCard: document.querySelector("#currentCard"),
  passButton: document.querySelector("#passButton"),
  playbackButton: document.querySelector("#playbackButton"),
  message: document.querySelector("#message"),
  recordLine: document.querySelector("#recordLine"),
  helpViewer: document.querySelector("#helpViewer"),
  playbackViewer: document.querySelector("#playbackViewer"),
  playbackImage: document.querySelector("#playbackImage"),
  playbackMode: document.querySelector("#playbackMode"),
  playbackCaption: document.querySelector("#playbackCaption"),
  cardPreviewViewer: document.querySelector("#cardPreviewViewer"),
  cardPreviewImage: document.querySelector("#cardPreviewImage"),
  cardPreviewTitle: document.querySelector("#cardPreviewTitle"),
  readerViewer: document.querySelector("#readerViewer"),
  readerChapterSelect: document.querySelector("#readerChapterSelect"),
  readerContent: document.querySelector("#readerContent"),
  readerMingFont: document.querySelector("#readerMingFont"),
  readerSealFont: document.querySelector("#readerSealFont"),
  readerSpeak: document.querySelector("#readerSpeak"),
  readerPause: document.querySelector("#readerPause"),
  readerStop: document.querySelector("#readerStop"),
  readerSpeechStatus: document.querySelector("#readerSpeechStatus"),
  targets: [...document.querySelectorAll(".target")],
  playbackPause: null,
  playbackStop: null,
};

function applyLayoutMode() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const root = document.documentElement;
  root.dataset.orientation = height >= width ? "portrait" : "landscape";
  root.dataset.deviceLayout = width <= 760 || (isTouch && height >= width && width <= 900) ? "phone" : width <= 1180 || isTouch ? "tablet" : "desktop";
}

async function loadJson(path) {
  const response = await fetch(`${path}?v=20260720c`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
}

async function loadProjectData() {
  try {
    const [texts, cards] = await Promise.all([loadJson("data/sunzi-texts.json"), loadJson("data/sunzi-cards.json")]);
    if (texts?.chapters?.length === 13) {
      sunziTexts = texts;
      TITLES = [...texts.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber).map((chapter) => chapter.title.replace(/第.+$/, ""));
    }
    if (cards?.cards?.length === 52) sunziCards = cards;
  } catch (error) {
    console.warn("Using built-in Sunzi metadata fallback.", error);
  }
  renderReaderOptions();
}

function makeDeck() {
  if (sunziCards?.cards?.length === 52) {
    return sunziCards.cards.map((card) => ({
      id: card.cardId,
      suit: card.suit,
      value: Number(card.value),
      rank: card.rank,
      title: card.title,
      numberedImage: card.numberedImage,
      scriptureImage: card.scriptureImage,
      image: card.numberedImage,
    }));
  }
  return SUITS.flatMap((suit) => RANKS.map((rank, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `${suit}${number}`,
      suit,
      value: index + 1,
      rank,
      title: TITLES[index],
      numberedImage: `cards/${suit}${number}.jpg`,
      scriptureImage: `cards-n/N${suit}${number}.jpg`,
      image: `cards/${suit}${number}.jpg`,
    };
  }));
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function newGame() {
  clearInterval(state.timer);
  stopPlayback();
  state.foundations = { S: 0, H: 0, D: 0, C: 0 };
  state.targetCards = { S: null, H: null, D: null, C: null };
  state.queue = shuffle(makeDeck());
  state.current = null;
  state.seconds = 0;
  state.passes = 0;
  state.wrong = 0;
  state.placed = 0;
  state.score = 0;
  state.won = false;
  state.readerHintShown = false;
  applyDifficulty();
  drawNext();
  state.timer = setInterval(tick, 1000);
  setMessage("新戰局開始。把中央牌拖到正確花色位置；不能接時雙擊 Pass。");
  updateRecordDisplay();
  render();
}

function applyDifficulty() {
  const level = Number(els.scriptureLevel?.value || 0);
  const scriptureIds = new Set(shuffle(state.queue.map((card) => card.id)).slice(0, level * 13));
  for (const card of state.queue) card.image = scriptureIds.has(card.id) ? card.scriptureImage : card.numberedImage;
}

function drawNext() { state.current = state.queue.shift() || null; }
function tick() { state.seconds += 1; updateScore(); renderStats(); }
function render() { renderCurrentCard(); renderTargets(); renderStats(); }

function renderCurrentCard() {
  if (!els.currentCard) return;
  els.currentCard.innerHTML = "";
  if (!state.current) {
    els.currentCard.removeAttribute("data-id");
    els.currentCard.setAttribute("aria-label", "沒有目前牌面");
    return;
  }
  const img = document.createElement("img");
  img.src = state.current.image;
  img.alt = `${SUIT_NAMES[state.current.suit]} ${state.current.title}`;
  els.currentCard.dataset.id = state.current.id;
  els.currentCard.setAttribute("aria-label", `${SUIT_NAMES[state.current.suit]} ${state.current.title}`);
  els.currentCard.append(img);
}

function renderTargets() {
  for (const suit of SUITS) {
    const target = document.querySelector(`.target[data-suit="${suit}"]`);
    if (!target) continue;
    const nextValue = state.foundations[suit] + 1;
    const card = state.targetCards[suit];
    const nextText = nextValue <= 13 ? TITLES[nextValue - 1] : "完成";
    target.classList.toggle("has-card", Boolean(card));
    target.setAttribute("aria-label", card ? `${SUIT_NAMES[suit]}，已接第 ${card.value} 篇，長按可放大` : `${SUIT_NAMES[suit]}，下一張 ${nextText}`);
    target.innerHTML = card
      ? `<img class="target-card-image" src="${card.image}" alt="${SUIT_NAMES[suit]} 已接牌面，可放大查看" /><strong>${nextText}</strong>`
      : `<span class="suit-symbol" aria-hidden="true">${SUIT_SYMBOLS[suit]}</span><strong>${nextText}</strong>`;
  }
}

function renderStats() {
  updateScore();
  if (els.placedCount) els.placedCount.textContent = `${state.placed}/52`;
  if (els.score) els.score.textContent = String(state.score);
  if (els.timer) els.timer.textContent = formatTime(state.seconds);
  if (els.queueCount) els.queueCount.textContent = state.current ? `待判斷\n${state.queue.length + 1} 張` : "已完成";
  if (els.passCount) els.passCount.textContent = `Pass ${state.passes}`;
  if (els.playbackButton) els.playbackButton.disabled = false;
}

function placeOnSuit(suit) {
  if (!state.current || state.won) return;
  if (state.current.suit === suit && state.current.value === state.foundations[suit] + 1) {
    state.targetCards[suit] = { ...state.current };
    state.foundations[suit] += 1;
    state.placed += 1;
    setMessage(`${SUIT_NAMES[suit]} ${state.current.title} 接龍成功。`);
    drawNext();
    checkWin();
  } else {
    state.wrong += 1;
    setMessage(`不能放在${SUIT_NAMES[suit]}。目前需要 ${SUIT_NAMES[suit]} ${nextTitle(suit)}。`);
  }
  render();
}

function passCard() {
  if (!state.current || state.won) return;
  state.passes += 1;
  state.queue.push(state.current);
  drawNext();
  setMessage("Pass 到下一張。");
  render();
}

function checkWin() {
  if (state.placed < 52 || state.won) return;
  state.won = true;
  state.current = null;
  clearInterval(state.timer);
  updateScore();
  const result = saveRecord();
  setMessage(`完成接龍！${result.isBest ? "刷新最佳紀錄。" : "完成戰局。"}分數 ${state.score}，時間 ${formatTime(state.seconds)}。`);
  updateRecordDisplay();
  render();
  startPlayback();
}

function updateScore() {
  const level = Number(els.scriptureLevel?.value || 0);
  const raw = Math.max(0, 12000 - state.seconds * 4 - state.passes * 35 - state.wrong * 120);
  state.score = Math.round(raw * LEVEL_MULTIPLIERS[level]);
}

function loadRecords() { try { return JSON.parse(localStorage.getItem(RECORD_KEY)) || {}; } catch { return {}; } }

function saveRecord() {
  const records = loadRecords();
  const key = `center-level-${els.scriptureLevel?.value || 0}`;
  const old = records[key];
  const current = { score: state.score, seconds: state.seconds, passes: state.passes, wrong: state.wrong, level: Number(els.scriptureLevel?.value || 0), savedAt: new Date().toISOString() };
  const isBest = !old || current.score > old.score;
  records[key] = {
    score: Math.max(old?.score || 0, current.score),
    seconds: old ? Math.min(old.seconds, current.seconds) : current.seconds,
    passes: old ? Math.min(old.passes, current.passes) : current.passes,
    wrong: old ? Math.min(old.wrong, current.wrong) : current.wrong,
    level: current.level,
    savedAt: current.savedAt,
  };
  localStorage.setItem(RECORD_KEY, JSON.stringify(records));
  return { isBest, record: records[key] };
}

function updateRecordDisplay() {
  const record = loadRecords()[`center-level-${els.scriptureLevel?.value || 0}`];
  if (!record) {
    if (els.bestScore) els.bestScore.textContent = "--";
    if (els.recordLine) els.recordLine.textContent = `本機最佳：${LEVEL_NAMES[Number(els.scriptureLevel?.value || 0)]} 尚無完成紀錄。`;
    return;
  }
  if (els.bestScore) els.bestScore.textContent = String(record.score);
  if (els.recordLine) els.recordLine.textContent = `本機最佳：${record.score} 分 / ${formatTime(record.seconds)} / Pass ${record.passes} / 錯 ${record.wrong}。`;
}

function startDrag(event) {
  if (!state.current || state.won || event.button === 2) return;
  const rect = els.currentCard.getBoundingClientRect();
  const dragScale = window.matchMedia("(max-width: 760px)").matches ? 0.48 : 0.42;
  els.currentCard.style.setProperty("--drag-scale", dragScale);
  state.drag = { offsetX: (rect.width * dragScale) / 2, offsetY: Math.min(event.clientY - rect.top, (rect.height * dragScale) / 2), moved: false };
  els.currentCard.classList.add("dragging");
  moveDrag(event.clientX, event.clientY);
  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", dragEnd, { once: true });
}

function dragMove(event) { if (!state.drag) return; state.drag.moved = true; moveDrag(event.clientX, event.clientY); highlightTarget(event.clientX, event.clientY); }
function dragEnd(event) {
  window.removeEventListener("pointermove", dragMove);
  clearTargetHighlights();
  if (!state.drag) return;
  els.currentCard.classList.remove("dragging");
  els.currentCard.style.left = "";
  els.currentCard.style.top = "";
  els.currentCard.style.removeProperty("--drag-scale");
  const wasTap = !state.drag.moved;
  state.drag = null;
  if (wasTap) return;
  const target = targetFromPoint(event.clientX, event.clientY);
  if (target) placeOnSuit(target.dataset.suit);
}
function moveDrag(x, y) { els.currentCard.style.left = `${x - state.drag.offsetX}px`; els.currentCard.style.top = `${y - state.drag.offsetY}px`; }
function targetFromPoint(x, y) { els.currentCard.style.display = "none"; const found = document.elementsFromPoint(x, y).find((el) => el.classList?.contains("target")); els.currentCard.style.display = ""; return found || null; }
function highlightTarget(x, y) { clearTargetHighlights(); const target = targetFromPoint(x, y); if (target) target.classList.add("drop-ok"); }
function clearTargetHighlights() { els.targets.forEach((target) => target.classList.remove("drop-ok")); }

function orderedCards(prefix) {
  return SUITS.flatMap((suit) => RANKS.map((rank, index) => {
    const value = index + 1;
    const number = String(value).padStart(2, "0");
    const filePrefix = prefix === "cards-n" ? "N" : "";
    return { suit, value, rank, title: TITLES[index], image: `${prefix}/${filePrefix}${suit}${number}.jpg` };
  }));
}
function playbackCards() { return [...orderedCards("cards").map((card) => ({ ...card, mode: "有數字牌" })), ...orderedCards("cards-n").map((card) => ({ ...card, mode: "無數字牌" }))]; }
function preloadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.onload = async () => { if (typeof image.decode === "function") { try { await image.decode(); } catch {} } resolve(image); };
    image.onerror = () => resolve(null);
    image.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}
async function preloadPlaybackImages(cards) { for (let i = 0; i < cards.length; i += 12) await Promise.allSettled(cards.slice(i, i + 12).map((card) => preloadImage(card.image))); }

function ensurePlaybackControls() {
  if (els.playbackPause && els.playbackStop) return;
  const panel = document.querySelector(".playback-panel");
  if (!panel) return;
  const controls = document.createElement("div");
  controls.className = "playback-controls";
  controls.style.cssText = "display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:10px";
  controls.innerHTML = `<button id="playbackPause" type="button">暫停</button><button id="playbackStop" type="button">停止</button>`;
  panel.append(controls);
  els.playbackPause = controls.querySelector("#playbackPause");
  els.playbackStop = controls.querySelector("#playbackStop");
  els.playbackPause.style.cssText = "min-width:88px;min-height:44px;padding:8px 14px;font-size:18px;cursor:pointer";
  els.playbackStop.style.cssText = "min-width:88px;min-height:44px;padding:8px 14px;font-size:18px;cursor:pointer";
  els.playbackPause.addEventListener("click", handlePlaybackPauseInput);
  els.playbackPause.addEventListener("pointerup", handlePlaybackPauseInput);
  els.playbackStop.addEventListener("click", stopPlayback);
  updatePlaybackControls();
}
function handlePlaybackPauseInput(event) {
  const now = Date.now();
  if (event.type === "click" && now - playbackControlLastTap < 500) return;
  if (event.type === "pointerup") { playbackControlLastTap = now; event.preventDefault(); }
  togglePlaybackPause();
}
async function startPlayback() {
  stopPlayback();
  ensurePlaybackControls();
  const cards = playbackCards();
  const runId = state.playbackRunId + 1;
  state.playbackRunId = runId;
  state.playbackPreparing = true;
  state.playbackState = "playing";
  state.playbackCards = cards;
  state.playbackIndex = 0;
  els.playbackViewer.classList.add("open");
  els.playbackViewer.setAttribute("aria-hidden", "false");
  els.playbackImage.removeAttribute("src");
  els.playbackMode.textContent = "準備播放";
  els.playbackCaption.textContent = "正在預載牌面，請稍候...";
  if (els.playbackButton) els.playbackButton.disabled = true;
  updatePlaybackControls();
  try { await preloadPlaybackImages(cards); } finally { if (els.playbackButton) els.playbackButton.disabled = false; }
  if (state.playbackRunId !== runId || !state.playbackPreparing) return;
  state.playbackPreparing = false;
  updatePlaybackControls();
  schedulePlaybackFrame(runId);
}
function schedulePlaybackFrame(runId) {
  window.clearTimeout(state.playbackTimer);
  state.playbackTimer = null;
  if (state.playbackRunId !== runId || state.playbackState !== "playing") return;
  showPlaybackCard();
  if (state.playbackIndex < state.playbackCards.length) {
    state.playbackTimer = window.setTimeout(() => schedulePlaybackFrame(runId), PLAYBACK_DELAY_MS);
  } else {
    state.playbackState = "completed";
    updatePlaybackControls();
    state.playbackTimer = window.setTimeout(() => { if (state.playbackRunId === runId && state.playbackState === "completed") stopPlayback(); }, PLAYBACK_DELAY_MS);
  }
}
function showPlaybackCard() {
  const card = state.playbackCards[state.playbackIndex];
  if (!card) return;
  els.playbackImage.dataset.currentImage = card.image;
  els.playbackImage.src = card.image;
  els.playbackImage.alt = `${card.mode} ${SUIT_NAMES[card.suit]} ${card.title}`;
  els.playbackMode.textContent = card.mode;
  els.playbackCaption.textContent = `${SUIT_NAMES[card.suit]} ${card.rank} / 第 ${card.value} 篇 / ${card.title}`;
  state.playbackIndex += 1;
}
function togglePlaybackPause() {
  if (state.playbackState === "idle" || state.playbackState === "completed") return;
  if (state.playbackState === "playing") {
    window.clearTimeout(state.playbackTimer);
    state.playbackTimer = null;
    state.playbackState = "paused";
    if (els.playbackCaption) { els.playbackCaption.dataset.baseText = els.playbackCaption.textContent.replace("（已暫停）", ""); els.playbackCaption.textContent = `${els.playbackCaption.dataset.baseText}（已暫停）`; }
  } else {
    state.playbackState = "playing";
    if (els.playbackCaption?.dataset.baseText) els.playbackCaption.textContent = els.playbackCaption.dataset.baseText;
    if (!state.playbackPreparing) schedulePlaybackFrame(state.playbackRunId);
  }
  updatePlaybackControls();
}
function updatePlaybackControls() {
  if (!els.playbackPause) return;
  els.playbackPause.disabled = state.playbackState === "idle" || state.playbackState === "completed";
  els.playbackPause.textContent = state.playbackState === "paused" ? "繼續" : "暫停";
  if (els.playbackStop) els.playbackStop.disabled = state.playbackState === "idle";
}
function stopPlayback() {
  state.playbackRunId += 1;
  window.clearTimeout(state.playbackTimer);
  state.playbackTimer = null;
  state.playbackPreparing = false;
  state.playbackState = "idle";
  state.playbackCards = [];
  if (els.playbackViewer) { els.playbackViewer.classList.remove("open"); els.playbackViewer.setAttribute("aria-hidden", "true"); }
  if (els.playbackButton) els.playbackButton.disabled = false;
  updatePlaybackControls();
  if (state.won && !state.readerHintShown) { state.readerHintShown = true; setMessage("點擊任一花色，進入《孫子兵法十三篇》。"); }
}

function openCardPreview(suit) {
  const card = state.targetCards[suit];
  if (!card || !els.cardPreviewViewer) return;
  els.cardPreviewImage.src = card.image;
  els.cardPreviewImage.alt = `${SUIT_NAMES[card.suit]} ${card.rank}，第 ${card.value} 篇 ${card.title}`;
  els.cardPreviewTitle.textContent = `第${card.value}篇｜${card.title}`;
  els.cardPreviewViewer.classList.add("open");
  els.cardPreviewViewer.setAttribute("aria-hidden", "false");
}
function closeCardPreview() { els.cardPreviewViewer?.classList.remove("open"); els.cardPreviewViewer?.setAttribute("aria-hidden", "true"); }
function bindTargetPreview(target) {
  let longPressTimer = null;
  let longPressOpened = false;
  target.addEventListener("pointerdown", () => { longPressOpened = false; if (!state.targetCards[target.dataset.suit]) return; longPressTimer = window.setTimeout(() => { longPressOpened = true; openCardPreview(target.dataset.suit); }, 420); });
  const clearLongPress = () => { window.clearTimeout(longPressTimer); longPressTimer = null; };
  target.addEventListener("pointerup", clearLongPress);
  target.addEventListener("pointerleave", clearLongPress);
  target.addEventListener("pointercancel", clearLongPress);
  target.addEventListener("click", (event) => {
    if (longPressOpened) { event.preventDefault(); return; }
    if (state.won && state.placed >= 52) { event.preventDefault(); openReaderViewer(); return; }
    if (event.target.closest(".target-card-image")) { event.preventDefault(); openCardPreview(target.dataset.suit); return; }
    placeOnSuit(target.dataset.suit);
  });
}

function renderReaderOptions() {
  if (!els.readerChapterSelect) return;
  const chapters = sunziTexts?.chapters || [];
  els.readerChapterSelect.innerHTML = "";
  for (const chapter of chapters) {
    const option = document.createElement("option");
    option.value = chapter.chapterId;
    option.textContent = `${String(chapter.chapterNumber).padStart(2, "0")} ${chapter.fullTitle || chapter.title}`;
    els.readerChapterSelect.append(option);
  }
  renderReaderChapter();
}
function renderReaderChapter() {
  stopReaderSpeech({ silent: true });
  if (!els.readerContent) return;
  els.readerContent.innerHTML = "";
  applyReaderFont();
  const chapters = sunziTexts?.chapters || [];
  if (!chapters.length) { const empty = document.createElement("p"); empty.textContent = "十三篇資料尚未載入。請重新整理頁面。"; els.readerContent.append(empty); return; }
  const selectedId = els.readerChapterSelect.value || chapters[0].chapterId;
  const chapter = chapters.find((item) => item.chapterId === selectedId) || chapters[0];
  els.readerChapterSelect.value = chapter.chapterId;
  const title = document.createElement("h3");
  title.textContent = chapter.fullTitle || chapter.title;
  els.readerContent.append(title);
  for (const section of chapter.sections || []) {
    const block = document.createElement("section");
    block.className = `reader-section reader-section-${section.type || "paragraph"}`;
    if (section.text) { const paragraph = document.createElement("p"); paragraph.textContent = section.text; block.append(paragraph); }
    if (section.items?.length) { const list = document.createElement("ul"); for (const item of section.items) { const li = document.createElement("li"); li.textContent = item.text; list.append(li); } block.append(list); }
    els.readerContent.append(block);
  }
}
function currentReaderChapter() { const chapters = sunziTexts?.chapters || []; if (!chapters.length) return null; return chapters.find((item) => item.chapterId === els.readerChapterSelect.value) || chapters[0]; }
function applyReaderFont() {
  if (!els.readerContent) return;
  els.readerContent.classList.toggle("font-ming", state.readerFont === "ming");
  els.readerContent.classList.toggle("font-seal", state.readerFont === "seal");
  els.readerMingFont?.classList.toggle("active", state.readerFont === "ming");
  els.readerSealFont?.classList.toggle("active", state.readerFont === "seal");
}
function setReaderFont(font) { state.readerFont = font; applyReaderFont(); }
function setReaderSpeechStatus(text) { if (els.readerSpeechStatus) els.readerSpeechStatus.textContent = text; }
function updateReaderSpeechControls() {
  if (els.readerPause) { els.readerPause.disabled = state.readingState === "idle" || state.readingState === "completed"; els.readerPause.textContent = state.readingState === "paused" ? "▶ 繼續" : "⏸ 暫停"; }
  if (els.readerStop) els.readerStop.disabled = state.readingState === "idle";
}
function readerSpeechParts(chapter) {
  const parts = [chapter.fullTitle || chapter.title];
  for (const section of chapter.sections || []) { if (section.text) parts.push(section.text); for (const item of section.items || []) if (item.text) parts.push(item.text); }
  return parts.filter(Boolean);
}
function startReaderSpeech() {
  const chapter = currentReaderChapter();
  if (!chapter) return;
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { setReaderSpeechStatus("此瀏覽器不支援朗讀功能。"); return; }
  stopReaderSpeech({ silent: true });
  state.speechParts = readerSpeechParts(chapter);
  state.currentSpeechIndex = 0;
  state.speechRunId += 1;
  state.readingState = "speaking";
  setReaderSpeechStatus(`正在朗讀：${chapter.fullTitle || chapter.title}`);
  updateReaderSpeechControls();
  speakReaderPart(state.speechRunId);
}
function speakReaderPart(runId) {
  if (state.speechRunId !== runId || state.readingState !== "speaking") return;
  if (state.currentSpeechIndex >= state.speechParts.length) { state.speechUtterance = null; state.readingState = "completed"; setReaderSpeechStatus("朗讀完成。"); updateReaderSpeechControls(); return; }
  const utterance = new SpeechSynthesisUtterance(state.speechParts[state.currentSpeechIndex]);
  utterance.lang = "zh-TW";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.onend = () => { if (state.speechRunId !== runId || state.readingState !== "speaking") return; state.currentSpeechIndex += 1; state.speechUtterance = null; window.setTimeout(() => speakReaderPart(runId), 0); };
  utterance.onerror = () => { if (state.speechRunId !== runId) return; state.speechUtterance = null; state.readingState = "idle"; setReaderSpeechStatus("朗讀中斷，請再試一次。"); updateReaderSpeechControls(); };
  state.speechUtterance = utterance;
  try { window.speechSynthesis.speak(utterance); } catch { state.readingState = "idle"; setReaderSpeechStatus("朗讀啟動失敗，請再試一次。"); updateReaderSpeechControls(); }
}
function toggleReaderSpeechPause() {
  if (!("speechSynthesis" in window)) return;
  try {
    if (state.readingState === "speaking") {
      const pausedIndex = state.currentSpeechIndex;
      state.speechRunId += 1;
      if (state.speechUtterance) { state.speechUtterance.onend = null; state.speechUtterance.onerror = null; }
      window.speechSynthesis.cancel();
      state.speechUtterance = null;
      state.currentSpeechIndex = pausedIndex;
      state.readingState = "paused";
      setReaderSpeechStatus("朗讀已暫停；按繼續會從目前段落重讀。");
    } else if (state.readingState === "paused") {
      state.speechRunId += 1;
      state.readingState = "speaking";
      setReaderSpeechStatus("繼續朗讀。");
      speakReaderPart(state.speechRunId);
    }
  } catch { setReaderSpeechStatus("朗讀控制暫時無法使用。"); }
  updateReaderSpeechControls();
}
function stopReaderSpeech(options = {}) {
  state.speechRunId += 1;
  if (state.speechUtterance) { state.speechUtterance.onend = null; state.speechUtterance.onerror = null; }
  if ("speechSynthesis" in window) { try { window.speechSynthesis.cancel(); } catch {} }
  state.speechUtterance = null;
  state.speechParts = [];
  state.currentSpeechIndex = 0;
  state.readingState = "idle";
  if (!options.silent) setReaderSpeechStatus("");
  updateReaderSpeechControls();
}
function openReaderViewer() { renderReaderOptions(); els.readerViewer?.classList.add("open"); els.readerViewer?.setAttribute("aria-hidden", "false"); }
function closeReaderViewer() { stopReaderSpeech(); els.readerViewer?.classList.remove("open"); els.readerViewer?.setAttribute("aria-hidden", "true"); }
function openHelpViewer() { els.helpViewer?.classList.add("open"); els.helpViewer?.setAttribute("aria-hidden", "false"); }
function closeHelpViewer() { els.helpViewer?.classList.remove("open"); els.helpViewer?.setAttribute("aria-hidden", "true"); }
function nextTitle(suit) { const value = state.foundations[suit] + 1; return value <= 13 ? TITLES[value - 1] : "完成"; }
function setMessage(text) { if (els.message) els.message.textContent = text; }
function formatTime(seconds) { const mm = String(Math.floor(seconds / 60)).padStart(2, "0"); const ss = String(seconds % 60).padStart(2, "0"); return `${mm}:${ss}`; }
function bind(selector, event, handler) { document.querySelector(selector)?.addEventListener(event, handler); }

els.currentCard?.addEventListener("pointerdown", startDrag);
els.currentCard?.addEventListener("dblclick", passCard);
els.currentCard?.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") passCard(); });
els.passButton?.addEventListener("click", passCard);
els.playbackButton?.addEventListener("click", startPlayback);
els.targets.forEach(bindTargetPreview);
bind("#newGame", "click", newGame);
bind("#readerButton", "click", openReaderViewer);
bind("#helpButton", "click", openHelpViewer);
bind("#readerChapterSelect", "change", renderReaderChapter);
bind("#readerMingFont", "click", () => setReaderFont("ming"));
bind("#readerSealFont", "click", () => setReaderFont("seal"));
bind("#readerSpeak", "click", startReaderSpeech);
bind("#readerPause", "click", toggleReaderSpeechPause);
bind("#readerStop", "click", () => stopReaderSpeech());
bind("#closeReader", "click", closeReaderViewer);
bind("#closeReaderBackdrop", "click", closeReaderViewer);
bind("#closeCardPreview", "click", closeCardPreview);
bind("#closeCardPreviewBackdrop", "click", closeCardPreview);
bind("#closeHelp", "click", closeHelpViewer);
bind("#closeHelpBackdrop", "click", closeHelpViewer);
bind("#closePlayback", "click", stopPlayback);
els.scriptureLevel?.addEventListener("change", newGame);
window.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeReaderViewer(); closeCardPreview(); closeHelpViewer(); stopPlayback(); } });
window.addEventListener("resize", applyLayoutMode);
window.addEventListener("orientationchange", applyLayoutMode);

async function initializeApp() {
  applyLayoutMode();
  ensurePlaybackControls();
  updateReaderSpeechControls();
  await loadProjectData();
  newGame();
}

initializeApp();