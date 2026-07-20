const PHASE3B_APP_INFO = Object.freeze({
  releaseStage: "Alpha",
  appVersion: "0.0.7",
  releaseDate: "2026.07.20",
  copyrightYear: "2026",
  copyrightOwner: "林煥章"
});

const PHASE3B_PENDING_RESULTS_KEY = "sunzi-solitaire-pending-results-v1";
const PHASE3B_BOARD_LABELS = { score: "分數榜", speed: "速度榜" };
const PHASE3B_FALLBACK_DIFFICULTIES = ["L1", "L2", "L3", "L4", "L5"].map((id) => ({ id }));
const phase3bState = {
  client: null,
  session: null,
  profile: null,
  pendingNickname: "",
  pendingJoinResult: null,
  leaderboardDifficulty: null,
  leaderboardBoard: "score"
};

function phase3bVersionText() {
  return `© ${PHASE3B_APP_INFO.copyrightOwner} ${PHASE3B_APP_INFO.copyrightYear} · ${PHASE3B_APP_INFO.releaseStage} v${PHASE3B_APP_INFO.appVersion} · ${PHASE3B_APP_INFO.releaseDate}`;
}

function phase3bRenderVersionInfo() {
  document.querySelectorAll("[data-app-version-text]").forEach((element) => {
    element.textContent = phase3bVersionText();
  });
}

function phase3bDifficulties() {
  if (typeof PHASE1_DIFFICULTIES !== "undefined" && Array.isArray(PHASE1_DIFFICULTIES)) return PHASE1_DIFFICULTIES;
  return PHASE3B_FALLBACK_DIFFICULTIES;
}

function phase3bCurrentDifficulty() {
  if (typeof phase1CurrentDifficulty === "function") return phase1CurrentDifficulty();
  return { id: "L1", name: "入門" };
}

function phase3bFormatTime(seconds) {
  return typeof formatTime === "function" ? formatTime(seconds || 0) : `${seconds || 0}秒`;
}

function phase3bNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function phase3bValidNickname(value) {
  const nickname = phase3bNickname(value);
  return nickname.length >= 2 && nickname.length <= 20;
}

function phase3bEmail(value) {
  return String(value || "").trim();
}

function phase3bValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phase3bEmail(value));
}

function phase3bFriendlyError(error) {
  const message = String(error?.message || error || "");
  if (!navigator.onLine) return "目前網路似乎離線，請連線後再試。";
  if (/duplicate key|game_id/i.test(message)) return "這局成績已提交過，不會重複寫入。";
  if (/row-level security|permission|policy|not authorized/i.test(message)) return "雲端權限尚未設定完成，請確認 Supabase RLS SQL 已執行。";
  if (/relation .* does not exist|function .* does not exist|schema cache/i.test(message)) return "雲端資料表或排行榜函式尚未建立，請先在 Supabase 執行 Phase 3B SQL。";
  if (/invalid|email/i.test(message)) return "Email 或驗證碼格式不正確，請確認後再試。";
  if (/expired|token has expired/i.test(message)) return "驗證碼已過期，請重新取得驗證碼。";
  if (/token|otp|code|invalid login/i.test(message)) return "驗證碼錯誤或已失效，請重新確認。";
  if (/rate|too many/i.test(message)) return "驗證碼要求太頻繁，請稍候再試。";
  if (/failed to fetch|network/i.test(message)) return "網路連線失敗，請稍後再試。";
  return message || "操作失敗，請稍後再試。";
}

async function phase3bClient() {
  if (phase3bState.client) return phase3bState.client;
  if (!window.SUNZI_SUPABASE_READY) throw new Error("Supabase 尚未初始化。請確認 supabase-client.js 已載入。");
  phase3bState.client = await window.SUNZI_SUPABASE_READY;
  return phase3bState.client;
}

function phase3bSetStatus(area, message, detail = "") {
  const status = document.querySelector(`#${area}Status`);
  const result = document.querySelector(`#${area}Result`);
  if (status) status.textContent = message;
  if (result) result.textContent = detail;
}

function phase3bPendingResults() {
  try {
    return JSON.parse(localStorage.getItem(PHASE3B_PENDING_RESULTS_KEY)) || [];
  } catch {
    return [];
  }
}

function phase3bSavePendingResults(items) {
  localStorage.setItem(PHASE3B_PENDING_RESULTS_KEY, JSON.stringify(items));
}

function phase3bQueuePendingResult(gameResult, reason = "") {
  if (!gameResult?.gameId) return;
  const pending = phase3bPendingResults();
  if (!pending.some((item) => item.gameId === gameResult.gameId)) {
    pending.unshift({ ...gameResult, pendingReason: reason, queuedAt: new Date().toISOString() });
    phase3bSavePendingResults(pending.slice(0, 20));
  }
}

function phase3bGameResultToRow(gameResult) {
  return {
    game_id: gameResult.gameId,
    player_id: phase3bState.session?.user?.id,
    game_type: gameResult.gameType || "sunzi-solitaire",
    difficulty_level: gameResult.difficultyLevel,
    score: Number(gameResult.score || 0),
    completion_time: Number(gameResult.completionTime || 0),
    pass_count: Number(gameResult.passCount || 0),
    error_count: Number(gameResult.errorCount || 0),
    hint_count: Number(gameResult.hintCount || 0),
    completed: true,
    game_version: gameResult.gameVersion || `${PHASE3B_APP_INFO.releaseStage} v${PHASE3B_APP_INFO.appVersion}`,
    started_at: gameResult.startedAt,
    completed_at: gameResult.completedAt || new Date().toISOString(),
    hidden_number_count: gameResult.hiddenNumberCount ?? null
  };
}

async function phase3bLoadProfile() {
  if (!phase3bState.session?.user) {
    phase3bState.profile = null;
    return null;
  }
  const client = await phase3bClient();
  const { data, error } = await client.from("profiles").select("id,nickname,created_at,updated_at").eq("id", phase3bState.session.user.id).maybeSingle();
  if (error) throw error;
  phase3bState.profile = data || null;
  phase3bUpdateAccountButton();
  return phase3bState.profile;
}

async function phase3bLoadSession() {
  const client = await phase3bClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  phase3bState.session = data.session || null;
  if (phase3bState.session) await phase3bLoadProfile();
  phase3bUpdateAccountButton();
  return phase3bState.session;
}

async function phase3bUpsertProfile(nickname) {
  const clean = phase3bNickname(nickname);
  if (!phase3bValidNickname(clean)) throw new Error("暱稱需為 2～20 字。");
  if (!phase3bState.session?.user) throw new Error("請先登入。");
  const client = await phase3bClient();
  const { data, error } = await client.from("profiles").upsert({ id: phase3bState.session.user.id, nickname: clean }, { onConflict: "id" }).select("id,nickname,created_at,updated_at").single();
  if (error) throw error;
  phase3bState.profile = data;
  phase3bUpdateAccountButton();
  return data;
}

async function phase3bSubmitGameResult(gameResult, { queueOnFail = true } = {}) {
  if (!phase3bState.session?.user || !gameResult?.completed) return { ok: false, queued: false, message: "尚未登入。" };
  try {
    const row = phase3bGameResultToRow(gameResult);
    if (!row.difficulty_level || row.completion_time <= 0) throw new Error("Game Result 欄位不完整。");
    const client = await phase3bClient();
    const { error } = await client.from("game_results").insert(row);
    if (error) {
      if (error.code === "23505") return { ok: true, duplicate: true, message: "這局已提交過。" };
      throw error;
    }
    return { ok: true, duplicate: false, message: "成績已提交英雄榜。" };
  } catch (error) {
    if (queueOnFail) phase3bQueuePendingResult(gameResult, phase3bFriendlyError(error));
    return { ok: false, queued: queueOnFail, message: phase3bFriendlyError(error) };
  }
}

async function phase3bFlushPendingResults() {
  if (!phase3bState.session?.user) return;
  const pending = phase3bPendingResults();
  if (!pending.length) return;
  const remaining = [];
  for (const item of pending) {
    const result = await phase3bSubmitGameResult(item, { queueOnFail: false });
    if (!result.ok) remaining.push(item);
  }
  phase3bSavePendingResults(remaining);
}

function phase3bInstallStyles() {
  if (document.querySelector("#phase3bStyles")) return;
  const style = document.createElement("style");
  style.id = "phase3bStyles";
  style.textContent = `
    .phase3b-actions{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(64px,calc(env(safe-area-inset-bottom) + 52px));z-index:4200;display:grid;gap:8px}.phase3b-action{border:0;min-height:38px;padding:0 11px;color:#21160d;background:rgba(246,239,227,.95);box-shadow:0 8px 22px rgba(0,0,0,.25),0 2px 0 rgba(0,0,0,.18);cursor:pointer;font-size:13px;white-space:nowrap}.phase3b-modal{position:fixed;inset:0;z-index:5100;display:none;place-items:center;padding:16px}.phase3b-modal.open{display:grid}.phase3b-panel{position:relative;z-index:1;width:min(720px,100%);max-height:min(820px,92dvh);overflow:auto;padding:clamp(18px,4vw,32px);background:var(--paper,#f6efe3);color:var(--ink,#17120e);box-shadow:0 24px 70px rgba(0,0,0,.36)}.phase3b-panel h2{margin:0 0 12px;font-size:clamp(24px,5vw,36px)}.phase3b-note,.phase3b-status{color:#5b4b37;line-height:1.55;font-size:14px}.phase3b-fields{display:grid;gap:12px;margin-top:12px}.phase3b-fields label{display:grid;gap:5px;font-weight:800}.phase3b-fields input{width:100%;min-height:44px;padding:8px 10px;border:1px solid rgba(23,18,14,.22);background:rgba(255,255,255,.82);color:#21160d;font:inherit}.phase3b-button-row,.phase3b-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.phase3b-button-row button,.phase3b-tabs button{border:0;min-height:40px;padding:8px 12px;color:#21160d;background:rgba(255,255,255,.72);box-shadow:0 2px 0 rgba(0,0,0,.18);cursor:pointer}.phase3b-button-row button.primary,.phase3b-tabs button.active{background:var(--gold,#d9b45f)}.phase3b-result{margin-top:10px;padding:10px;min-height:44px;background:rgba(255,255,255,.42);border:1px solid rgba(23,18,14,.12);white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}.phase3b-leaderboard-list{display:grid;gap:8px;margin-top:12px}.phase3b-rank-card{padding:9px 10px;background:rgba(255,255,255,.42);border:1px solid rgba(23,18,14,.12);line-height:1.45}.phase3b-rank-card.is-me{border-color:rgba(217,180,95,.92);background:rgba(217,180,95,.24)}.phase3b-rank-main{display:flex;justify-content:space-between;gap:12px;font-weight:800}.phase3b-rank-sub{color:#5b4b37;font-size:13px}@media(max-width:760px){:root[data-device-layout="phone"] .phase3b-actions{right:max(8px,env(safe-area-inset-right));bottom:max(60px,calc(env(safe-area-inset-bottom) + 50px))}:root[data-device-layout="phone"] .phase3b-action{min-height:34px;padding:0 9px;font-size:12px}:root[data-device-layout="phone"] .phase3b-panel{padding:18px}}
  `;
  document.head.append(style);
}

function phase3bOpenModal(id) {
  const modal = document.querySelector(`#${id}`);
  modal?.classList.add("open");
  modal?.setAttribute("aria-hidden", "false");
}

function phase3bCloseModal(id) {
  const modal = document.querySelector(`#${id}`);
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
}

function phase3bInstallUi() {
  if (document.querySelector("#phase3bActions")) return;
  document.querySelector("#otpTestButton")?.remove();
  document.querySelector("#authTestViewer")?.remove();
  const actions = document.createElement("div");
  actions.id = "phase3bActions";
  actions.className = "phase3b-actions";
  actions.innerHTML = `<button class="phase3b-action" id="phase3bAccountButton" type="button">登入</button><button class="phase3b-action" id="phase3bLeaderboardButton" type="button">🏆 英雄榜</button>`;
  document.body.append(actions);
  document.querySelector("#phase3bAccountButton")?.addEventListener("click", () => phase3bOpenAccount());
  document.querySelector("#phase3bLeaderboardButton")?.addEventListener("click", () => phase3bOpenLeaderboard());

  const account = document.createElement("div");
  account.id = "phase3bAccountModal";
  account.className = "phase3b-modal";
  account.setAttribute("aria-hidden", "true");
  account.innerHTML = `<button class="viewer-backdrop" id="phase3bCloseAccountBackdrop" type="button" aria-label="關閉帳號"></button><section class="phase3b-panel" role="dialog" aria-modal="true" aria-label="玩家帳號"><button class="viewer-close" id="phase3bCloseAccount" type="button" aria-label="關閉">×</button><h2>玩家帳號</h2><p class="phase3b-note">Email 僅用於登入與帳號識別，不會顯示於公開英雄榜。暱稱會公開顯示於英雄榜。</p><div class="phase3b-fields"><label><span>暱稱</span><input id="phase3bNickname" maxlength="20" placeholder="2～20字，可重複" /></label><label><span>Email</span><input id="phase3bEmail" type="email" inputmode="email" autocomplete="email" placeholder="your@email.com" /></label><label><span>OTP 驗證碼</span><input id="phase3bOtp" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="請輸入 Email 收到的驗證碼" /></label></div><div class="phase3b-button-row"><button id="phase3bSendOtp" class="primary" type="button">取得驗證碼</button><button id="phase3bVerifyOtp" class="primary" type="button">驗證登入</button><button id="phase3bSaveNickname" type="button">儲存暱稱</button><button id="phase3bSignOut" type="button">登出</button></div><p class="phase3b-status" id="phase3bAccountStatus" role="status"></p><div class="phase3b-result" id="phase3bAccountResult"></div></section>`;
  document.body.append(account);

  const join = document.createElement("div");
  join.id = "phase3bJoinModal";
  join.className = "phase3b-modal";
  join.setAttribute("aria-hidden", "true");
  join.innerHTML = `<button class="viewer-backdrop" id="phase3bCloseJoinBackdrop" type="button" aria-label="稍後再說"></button><section class="phase3b-panel" role="dialog" aria-modal="true" aria-label="加入英雄榜"><button class="viewer-close" id="phase3bCloseJoin" type="button" aria-label="關閉">×</button><h2>加入英雄榜</h2><p class="phase3b-note" id="phase3bJoinSummary">這局已完成，可登入後提交到分級英雄榜。</p><div class="phase3b-button-row"><button id="phase3bJoinNow" class="primary" type="button">加入英雄榜</button><button id="phase3bJoinLater" type="button">稍後再說</button></div></section>`;
  document.body.append(join);

  const leaderboard = document.createElement("div");
  leaderboard.id = "phase3bLeaderboardModal";
  leaderboard.className = "phase3b-modal";
  leaderboard.setAttribute("aria-hidden", "true");
  leaderboard.innerHTML = `<button class="viewer-backdrop" id="phase3bCloseLeaderboardBackdrop" type="button" aria-label="關閉英雄榜"></button><section class="phase3b-panel" role="dialog" aria-modal="true" aria-label="分級英雄榜"><button class="viewer-close" id="phase3bCloseLeaderboard" type="button" aria-label="關閉">×</button><h2>分級英雄榜</h2><div class="phase3b-tabs" id="phase3bDifficultyTabs"></div><div class="phase3b-tabs"><button id="phase3bScoreBoard" type="button">分數榜</button><button id="phase3bSpeedBoard" type="button">速度榜</button></div><p class="phase3b-status" id="phase3bLeaderboardStatus" role="status"></p><div class="phase3b-leaderboard-list" id="phase3bLeaderboardList"></div><div class="phase3b-result" id="phase3bLeaderboardResult"></div></section>`;
  document.body.append(leaderboard);

  ["phase3bCloseAccount", "phase3bCloseAccountBackdrop"].forEach((id) => document.querySelector(`#${id}`)?.addEventListener("click", () => phase3bCloseModal("phase3bAccountModal")));
  ["phase3bCloseJoin", "phase3bCloseJoinBackdrop", "phase3bJoinLater"].forEach((id) => document.querySelector(`#${id}`)?.addEventListener("click", () => phase3bCloseModal("phase3bJoinModal")));
  ["phase3bCloseLeaderboard", "phase3bCloseLeaderboardBackdrop"].forEach((id) => document.querySelector(`#${id}`)?.addEventListener("click", () => phase3bCloseModal("phase3bLeaderboardModal")));
  document.querySelector("#phase3bJoinNow")?.addEventListener("click", () => { phase3bCloseModal("phase3bJoinModal"); phase3bOpenAccount({ joinResult: phase3bState.pendingJoinResult }); });
  document.querySelector("#phase3bSendOtp")?.addEventListener("click", phase3bSendOtp);
  document.querySelector("#phase3bVerifyOtp")?.addEventListener("click", phase3bVerifyOtp);
  document.querySelector("#phase3bSaveNickname")?.addEventListener("click", phase3bSaveNickname);
  document.querySelector("#phase3bSignOut")?.addEventListener("click", phase3bSignOut);
  document.querySelector("#phase3bScoreBoard")?.addEventListener("click", () => phase3bSelectBoard("score"));
  document.querySelector("#phase3bSpeedBoard")?.addEventListener("click", () => phase3bSelectBoard("speed"));
  phase3bRenderDifficultyTabs();
  phase3bUpdateAccountButton();
}

function phase3bOpenAccount(options = {}) {
  phase3bState.pendingJoinResult = options.joinResult || phase3bState.pendingJoinResult;
  const nickname = document.querySelector("#phase3bNickname");
  const email = document.querySelector("#phase3bEmail");
  if (nickname) nickname.value = phase3bState.profile?.nickname || phase3bState.pendingNickname || "";
  if (email) email.value = phase3bState.session?.user?.email || "";
  phase3bOpenModal("phase3bAccountModal");
  phase3bSetStatus("phase3bAccount", phase3bState.session ? "已登入。" : "尚未登入。", phase3bAccountDetail());
}

function phase3bAccountDetail() {
  if (!phase3bState.session?.user) return "請輸入暱稱與 Email，取得 OTP 驗證碼。";
  return `暱稱：${phase3bState.profile?.nickname || "尚未設定"}\nEmail：${phase3bState.session.user.email || ""}\nAuth User ID：${phase3bState.session.user.id}`;
}

function phase3bUpdateAccountButton() {
  const button = document.querySelector("#phase3bAccountButton");
  if (!button) return;
  button.textContent = phase3bState.profile?.nickname ? `👤 ${phase3bState.profile.nickname}` : phase3bState.session ? "👤 帳號" : "登入";
}

async function phase3bSendOtp() {
  const nickname = phase3bNickname(document.querySelector("#phase3bNickname")?.value);
  const email = phase3bEmail(document.querySelector("#phase3bEmail")?.value);
  if (!phase3bValidNickname(nickname)) return phase3bSetStatus("phase3bAccount", "暱稱格式錯誤。", "暱稱需為 2～20 字，且不可空白。");
  if (!phase3bValidEmail(email)) return phase3bSetStatus("phase3bAccount", "Email 格式錯誤。", "請輸入完整 Email，例如 name@example.com。");
  phase3bState.pendingNickname = nickname;
  phase3bSetStatus("phase3bAccount", "正在寄送驗證碼...", "請稍候，不要重複點擊。");
  try {
    const client = await phase3bClient();
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
    phase3bSetStatus("phase3bAccount", "OTP 已送出。", "請到 Email 收信，將驗證碼填入 OTP 欄位。");
  } catch (error) {
    phase3bSetStatus("phase3bAccount", "OTP 發送失敗。", phase3bFriendlyError(error));
  }
}

async function phase3bVerifyOtp() {
  const nickname = phase3bNickname(document.querySelector("#phase3bNickname")?.value || phase3bState.pendingNickname);
  const email = phase3bEmail(document.querySelector("#phase3bEmail")?.value);
  const token = String(document.querySelector("#phase3bOtp")?.value || "").trim();
  if (!phase3bValidNickname(nickname)) return phase3bSetStatus("phase3bAccount", "暱稱格式錯誤。", "暱稱需為 2～20 字，且不可空白。");
  if (!phase3bValidEmail(email) || !token) return phase3bSetStatus("phase3bAccount", "資料尚未完整。", "請輸入 Email 與 OTP 驗證碼。");
  phase3bSetStatus("phase3bAccount", "正在驗證登入...", "請稍候。");
  try {
    const client = await phase3bClient();
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    phase3bState.session = data.session || null;
    await phase3bUpsertProfile(nickname);
    await phase3bFlushPendingResults();
    if (phase3bState.pendingJoinResult) {
      const submit = await phase3bSubmitGameResult(phase3bState.pendingJoinResult);
      phase3bState.pendingJoinResult = null;
      phase3bSetStatus("phase3bAccount", "登入成功。", `${phase3bAccountDetail()}\n${submit.message}`);
    } else {
      phase3bSetStatus("phase3bAccount", "登入成功。", phase3bAccountDetail());
    }
  } catch (error) {
    phase3bSetStatus("phase3bAccount", "OTP 驗證失敗。", phase3bFriendlyError(error));
  }
}

async function phase3bSaveNickname() {
  const nickname = phase3bNickname(document.querySelector("#phase3bNickname")?.value);
  try {
    await phase3bUpsertProfile(nickname);
    phase3bSetStatus("phase3bAccount", "暱稱已儲存。", phase3bAccountDetail());
  } catch (error) {
    phase3bSetStatus("phase3bAccount", "暱稱儲存失敗。", phase3bFriendlyError(error));
  }
}

async function phase3bSignOut() {
  try {
    const client = await phase3bClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    phase3bState.session = null;
    phase3bState.profile = null;
    phase3bUpdateAccountButton();
    phase3bSetStatus("phase3bAccount", "已登出。", "仍可繼續單機遊玩。");
  } catch (error) {
    phase3bSetStatus("phase3bAccount", "登出失敗。", phase3bFriendlyError(error));
  }
}

function phase3bRenderDifficultyTabs() {
  const wrap = document.querySelector("#phase3bDifficultyTabs");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const difficulty of phase3bDifficulties()) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = difficulty.id;
    button.classList.toggle("active", difficulty.id === phase3bState.leaderboardDifficulty);
    button.addEventListener("click", () => {
      phase3bState.leaderboardDifficulty = difficulty.id;
      phase3bRenderDifficultyTabs();
      phase3bLoadLeaderboard();
    });
    wrap.append(button);
  }
}

function phase3bSelectBoard(board) {
  phase3bState.leaderboardBoard = board;
  document.querySelector("#phase3bScoreBoard")?.classList.toggle("active", board === "score");
  document.querySelector("#phase3bSpeedBoard")?.classList.toggle("active", board === "speed");
  phase3bLoadLeaderboard();
}

async function phase3bOpenLeaderboard() {
  phase3bState.leaderboardDifficulty = phase3bState.leaderboardDifficulty || phase3bCurrentDifficulty().id;
  phase3bOpenModal("phase3bLeaderboardModal");
  phase3bRenderDifficultyTabs();
  phase3bSelectBoard(phase3bState.leaderboardBoard || "score");
}

function phase3bRenderLeaderboardRows(rows = [], myRank = null) {
  const list = document.querySelector("#phase3bLeaderboardList");
  const result = document.querySelector("#phase3bLeaderboardResult");
  if (!list || !result) return;
  list.innerHTML = "";
  if (!rows.length) {
    list.innerHTML = `<div class="phase3b-rank-card">這個級別目前還沒有通關紀錄，成為第一位英雄吧！</div>`;
  } else {
    for (const row of rows) {
      const card = document.createElement("div");
      card.className = `phase3b-rank-card${row.is_me ? " is-me" : ""}`;
      card.innerHTML = `<div class="phase3b-rank-main"><span>#${row.rank} ${row.nickname}</span><span>${row.score}分</span></div><div class="phase3b-rank-sub">${phase3bFormatTime(row.completion_time)} · Pass ${row.pass_count} · 提示 ${row.hint_count || 0}</div>`;
      list.append(card);
    }
  }
  if (!phase3bState.session) result.textContent = "登入後查看自己的排名。";
  else if (rows.some((row) => row.is_me)) result.textContent = "你已在 Top 20 內，已高亮顯示。";
  else if (myRank) result.textContent = `我的排名 #${myRank.rank}\n${myRank.nickname}\n${myRank.score}分 · ${phase3bFormatTime(myRank.completion_time)} · Pass ${myRank.pass_count}`;
  else result.textContent = "你在此級別尚無雲端通關紀錄。";
}

async function phase3bLoadLeaderboard() {
  phase3bSetStatus("phase3bLeaderboard", "英雄榜載入中...", "");
  const list = document.querySelector("#phase3bLeaderboardList");
  if (list) list.innerHTML = "";
  try {
    const client = await phase3bClient();
    const difficulty = phase3bState.leaderboardDifficulty || "L1";
    const board = phase3bState.leaderboardBoard || "score";
    const { data: topRows, error: topError } = await client.rpc("get_leaderboard_top", { p_difficulty_level: difficulty, p_board: board, p_limit: 20 });
    if (topError) throw topError;
    let myRank = null;
    if (phase3bState.session) {
      const { data, error } = await client.rpc("get_my_leaderboard_rank", { p_difficulty_level: difficulty, p_board: board });
      if (!error && data?.length) myRank = data[0];
    }
    phase3bSetStatus("phase3bLeaderboard", `${difficulty} ${PHASE3B_BOARD_LABELS[board]}`, "");
    phase3bRenderLeaderboardRows(topRows || [], myRank);
  } catch (error) {
    phase3bSetStatus("phase3bLeaderboard", "英雄榜載入失敗。", phase3bFriendlyError(error));
  }
}

function phase3bShowJoinPrompt(gameResult) {
  phase3bState.pendingJoinResult = gameResult;
  const summary = document.querySelector("#phase3bJoinSummary");
  if (summary) summary.textContent = `${gameResult.difficultyLevel} 完成，分數 ${gameResult.score}，時間 ${phase3bFormatTime(gameResult.completionTime)}。可登入後加入英雄榜。`;
  window.setTimeout(() => phase3bOpenModal("phase3bJoinModal"), 900);
}

function phase3bPatchGameResultCapture() {
  if (typeof saveRecord !== "function" || typeof phase1CreateGameResult !== "function") return;
  const originalSaveRecord = saveRecord;
  saveRecord = function phase3bSaveRecord(gameResult) {
    const cloudResult = gameResult || phase1CreateGameResult(true);
    cloudResult.hintCount = cloudResult.hintCount ?? state.gameSession?.hintCount ?? state.hints ?? 0;
    state.lastGameResult = cloudResult;
    const localResult = originalSaveRecord(cloudResult);
    window.setTimeout(async () => {
      if (!cloudResult.completed) return;
      if (phase3bState.session?.user) {
        const submit = await phase3bSubmitGameResult(cloudResult);
        if (typeof setMessage === "function") setMessage(submit.message);
      } else {
        phase3bShowJoinPrompt(cloudResult);
      }
    }, 0);
    return localResult;
  };
}

async function phase3bInstall() {
  phase3bRenderVersionInfo();
  phase3bInstallStyles();
  phase3bInstallUi();
  phase3bPatchGameResultCapture();
  try {
    const client = await phase3bClient();
    client.auth.onAuthStateChange(async (_event, session) => {
      phase3bState.session = session || null;
      if (session) {
        try {
          await phase3bLoadProfile();
          await phase3bFlushPendingResults();
        } catch {}
      } else {
        phase3bState.profile = null;
      }
      phase3bUpdateAccountButton();
    });
    await phase3bLoadSession();
  } catch (error) {
    console.warn(phase3bFriendlyError(error));
  }
  window.addEventListener("online", () => phase3bFlushPendingResults());
  window.SUNZI_PHASE3B_DEBUG = () => ({
    signedIn: Boolean(phase3bState.session?.user),
    userId: phase3bState.session?.user?.id || null,
    nickname: phase3bState.profile?.nickname || null,
    pendingResults: phase3bPendingResults().length,
    version: PHASE3B_APP_INFO
  });
}

phase3bInstall();
