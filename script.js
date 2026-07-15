const SUITS = ["S", "H", "D", "C"];
const SUIT_NAMES = { S: "黑桃", H: "紅心", D: "鑽石", C: "梅花" };
const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const TITLES = ["始計", "作戰", "謀攻", "軍形", "兵勢", "虛實", "軍爭", "九變", "行軍", "地形", "九地", "火攻", "用間"];
const LEVEL_NAMES = ["全有數", "13 張無數", "26 張無數", "39 張無數", "全無數"];
const LEVEL_MULTIPLIERS = [1, 1.15, 1.35, 1.6, 2];
const RECORD_KEY = "sunzi-center-solitaire-records-v1";

const state = {
  queue: [],
  foundations: { S: 0, H: 0, D: 0, C: 0 },
  targetImages: { S: null, H: null, D: null, C: null },
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
  cardSlot: document.querySelector("#cardSlot"),
  passButton: document.querySelector("#passButton"),
  playbackButton: document.querySelector("#playbackButton"),
  message: document.querySelector("#message"),
  learnLine: document.querySelector("#learnLine"),
  recordLine: document.querySelector("#recordLine"),
  helpViewer: document.querySelector("#helpViewer"),
  playbackViewer: document.querySelector("#playbackViewer"),
  playbackImage: document.querySelector("#playbackImage"),
  playbackMode: document.querySelector("#playbackMode"),
  playbackCaption: document.querySelector("#playbackCaption"),
  targets: [...document.querySelectorAll(".target")],
};

function detectLayoutMode() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const isPortrait = height >= width;

  if (width <= 760 || (isTouch && isPortrait && width <= 900)) return "phone";
  if (width <= 1180 || isTouch) return "tablet";
  return "desktop";
}

function applyLayoutMode() {
  const root = document.documentElement;
  root.dataset.deviceLayout = detectLayoutMode();
  root.dataset.orientation = window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
}

function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i += 1) {
      const number = String(i + 1).padStart(2, "0");
      deck.push({
        id: `${suit}${number}`,
        suit,
        value: i + 1,
        rank: RANKS[i],
        title: TITLES[i],
        numberedImage: `cards/${suit}${number}.jpg`,
        scriptureImage: `cards-n/N${suit}${number}.jpg`,
        image: `cards/${suit}${number}.jpg`,
      });
    }
  }
  return deck;
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
  state.targetImages = { S: null, H: null, D: null, C: null };
  state.queue = shuffle(makeDeck());
  state.current = null;
  state.seconds = 0;
  state.passes = 0;
  state.wrong = 0;
  state.placed = 0;
  state.score = 0;
  state.won = false;
  applyDifficulty();
  drawNext();
  state.timer = setInterval(tick, 1000);
  setMessage("新戰局開始。把中央牌拖到正確花色位置；不能接時雙擊 Pass。");
  updateRecordDisplay();
  render();
}

function applyDifficulty() {
  const level = Number(els.scriptureLevel.value);
  const scriptureCount = level * 13;
  const ids = shuffle(state.queue.map((card) => card.id));
  const scriptureIds = new Set(ids.slice(0, scriptureCount));
  for (const card of state.queue) {
    card.image = scriptureIds.has(card.id) ? card.scriptureImage : card.numberedImage;
  }
}

function drawNext() {
  state.current = state.queue.shift() || null;
}

function tick() {
  state.seconds += 1;
  updateScore();
  renderStats();
}

function render() {
  renderCurrentCard();
  renderTargets();
  renderStats();
}

function renderCurrentCard() {
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
    const nextValue = state.foundations[suit] + 1;
    const target = document.querySelector(`.target[data-suit="${suit}"]`);
    const label = SUIT_NAMES[suit];
    const symbol = SUIT_SYMBOLS[suit];
    const nextText = nextValue <= 13 ? TITLES[nextValue - 1] : "完成";
    const image = state.targetImages[suit];
    target.classList.toggle("has-card", Boolean(image));
    target.setAttribute("aria-label", `${label}，下一張 ${nextText}`);
    target.innerHTML = `
      ${image ? "" : `<span class="suit-symbol" aria-hidden="true">${symbol}</span>`}
      ${image ? `<img class="target-card-image" src="${image}" alt="${label} 已接牌面" />` : ""}
      <strong>${nextText}</strong>
    `;
  }
}

function renderStats() {
  updateScore();
  els.placedCount.textContent = `${state.placed}/52`;
  els.score.textContent = String(state.score);
  els.timer.textContent = formatTime(state.seconds);
  els.queueCount.textContent = state.current ? `待判斷 ${state.queue.length + 1} 張` : "已完成";
  els.passCount.textContent = `Pass ${state.passes}`;
  els.playbackButton.disabled = false;
}

function placeOnSuit(suit) {
  if (!state.current || state.won) return;
  if (state.current.suit === suit && state.current.value === state.foundations[suit] + 1) {
    state.targetImages[suit] = state.current.image;
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
  const level = Number(els.scriptureLevel.value);
  const raw = Math.max(0, 12000 - state.seconds * 4 - state.passes * 35 - state.wrong * 120);
  state.score = Math.round(raw * LEVEL_MULTIPLIERS[level]);
}

function recordKey() {
  return `center-level-${els.scriptureLevel.value}`;
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORD_KEY)) || {};
  } catch {
    return {};
  }
}

function saveRecords(records) {
  localStorage.setItem(RECORD_KEY, JSON.stringify(records));
}

function saveRecord() {
  const records = loadRecords();
  const key = recordKey();
  const old = records[key];
  const current = {
    score: state.score,
    seconds: state.seconds,
    passes: state.passes,
    wrong: state.wrong,
    level: Number(els.scriptureLevel.value),
    savedAt: new Date().toISOString(),
  };
  const isBest = !old || current.score > old.score;
  records[key] = {
    score: Math.max(old?.score || 0, current.score),
    seconds: old ? Math.min(old.seconds, current.seconds) : current.seconds,
    passes: old ? Math.min(old.passes, current.passes) : current.passes,
    wrong: old ? Math.min(old.wrong, current.wrong) : current.wrong,
    level: current.level,
    savedAt: current.savedAt,
  };
  saveRecords(records);
  return { isBest, record: records[key] };
}

function updateRecordDisplay() {
  const record = loadRecords()[recordKey()];
  if (!record) {
    els.bestScore.textContent = "--";
    els.recordLine.textContent = `本機最佳：${LEVEL_NAMES[Number(els.scriptureLevel.value)]} 尚無完成紀錄。`;
    return;
  }
  els.bestScore.textContent = String(record.score);
  els.recordLine.textContent = `本機最佳：${record.score} 分 / ${formatTime(record.seconds)} / Pass ${record.passes} / 錯 ${record.wrong}。`;
}

function startDrag(event) {
  if (!state.current || state.won || event.button === 2) return;
  const rect = els.currentCard.getBoundingClientRect();
  const dragScale = window.matchMedia("(max-width: 760px)").matches ? 0.48 : 0.42;
  els.currentCard.style.setProperty("--drag-scale", dragScale);
  state.drag = {
    offsetX: (rect.width * dragScale) / 2,
    offsetY: Math.min(event.clientY - rect.top, (rect.height * dragScale) / 2),
    moved: false,
  };
  els.currentCard.classList.add("dragging");
  moveDrag(event.clientX, event.clientY);
  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", dragEnd, { once: true });
}

function dragMove(event) {
  if (!state.drag) return;
  state.drag.moved = true;
  moveDrag(event.clientX, event.clientY);
  highlightTarget(event.clientX, event.clientY);
}

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

function moveDrag(x, y) {
  els.currentCard.style.left = `${x - state.drag.offsetX}px`;
  els.currentCard.style.top = `${y - state.drag.offsetY}px`;
}

function targetFromPoint(x, y) {
  els.currentCard.style.display = "none";
  const found = document.elementsFromPoint(x, y).find((el) => el.classList?.contains("target"));
  els.currentCard.style.display = "";
  return found || null;
}

function highlightTarget(x, y) {
  clearTargetHighlights();
  const target = targetFromPoint(x, y);
  if (target) target.classList.add("drop-ok");
}

function clearTargetHighlights() {
  els.targets.forEach((target) => target.classList.remove("drop-ok"));
}

function orderedCards(prefix) {
  const cards = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 13; value += 1) {
      const number = String(value).padStart(2, "0");
      const filePrefix = prefix === "cards-n" ? "N" : "";
      cards.push({
        suit,
        value,
        rank: RANKS[value - 1],
        title: TITLES[value - 1],
        image: `${prefix}/${filePrefix}${suit}${number}.jpg`,
      });
    }
  }
  return cards;
}

function playbackCards() {
  return [
    ...orderedCards("cards").map((card) => ({ ...card, mode: "有數字牌" })),
    ...orderedCards("cards-n").map((card) => ({ ...card, mode: "無數字牌" })),
  ];
}

function startPlayback() {
  stopPlayback();
  const cards = playbackCards();
  state.playbackIndex = 0;
  els.playbackViewer.classList.add("open");
  els.playbackViewer.setAttribute("aria-hidden", "false");
  showPlaybackCard(cards);
  state.playbackTimer = setInterval(() => showPlaybackCard(cards), 185);
}

function showPlaybackCard(cards) {
  if (state.playbackIndex >= cards.length) {
    stopPlayback();
    return;
  }
  const card = cards[state.playbackIndex];
  els.playbackImage.src = card.image;
  els.playbackImage.alt = `${card.mode} ${SUIT_NAMES[card.suit]} ${card.title}`;
  els.playbackMode.textContent = card.mode;
  els.playbackCaption.textContent = `${SUIT_NAMES[card.suit]} ${card.rank} / 第 ${card.value} 篇 / ${card.title}`;
  state.playbackIndex += 1;
}

function stopPlayback() {
  clearInterval(state.playbackTimer);
  state.playbackTimer = null;
  els.playbackViewer.classList.remove("open");
  els.playbackViewer.setAttribute("aria-hidden", "true");
}

function openHelpViewer() {
  els.helpViewer.classList.add("open");
  els.helpViewer.setAttribute("aria-hidden", "false");
}

function closeHelpViewer() {
  els.helpViewer.classList.remove("open");
  els.helpViewer.setAttribute("aria-hidden", "true");
}

function nextTitle(suit) {
  const value = state.foundations[suit] + 1;
  return value <= 13 ? TITLES[value - 1] : "完成";
}

function setMessage(text) {
  els.message.textContent = text;
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

els.currentCard.addEventListener("pointerdown", startDrag);
els.currentCard.addEventListener("dblclick", passCard);
els.currentCard.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") passCard();
});
els.passButton.addEventListener("click", passCard);
els.playbackButton.addEventListener("click", startPlayback);
els.targets.forEach((target) => target.addEventListener("click", () => placeOnSuit(target.dataset.suit)));
document.querySelector("#newGame").addEventListener("click", newGame);
document.querySelector("#helpButton").addEventListener("click", openHelpViewer);
document.querySelector("#closeHelp").addEventListener("click", closeHelpViewer);
document.querySelector("#closeHelpBackdrop").addEventListener("click", closeHelpViewer);
document.querySelector("#closePlayback").addEventListener("click", stopPlayback);
els.scriptureLevel.addEventListener("change", newGame);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHelpViewer();
    stopPlayback();
  }
});
window.addEventListener("resize", applyLayoutMode);
window.addEventListener("orientationchange", applyLayoutMode);

applyLayoutMode();
newGame();




