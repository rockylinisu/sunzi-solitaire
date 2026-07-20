const PHASE3A_AUTH_STATE = {
  client: null,
  session: null,
  loading: false,
  lastEmail: ""
};

function phase3aInstallStyles() {
  if (document.querySelector("#phase3aStyles")) return;
  const style = document.createElement("style");
  style.id = "phase3aStyles";
  style.textContent = `
    #otpTestButton {
      position: fixed;
      right: max(12px, env(safe-area-inset-right));
      bottom: max(72px, calc(env(safe-area-inset-bottom) + 58px));
      z-index: 4200;
      border: 0;
      min-height: 42px;
      padding: 0 12px;
      color: #21160d;
      background: rgba(246, 239, 227, 0.94);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25), 0 2px 0 rgba(0, 0, 0, 0.18);
      cursor: pointer;
      white-space: nowrap;
      font-size: 14px;
    }

    .auth-test-viewer.open ~ #otpTestButton,
    body:has(.auth-test-viewer.open) #otpTestButton {
      display: none;
    }

    .auth-test-viewer {
      position: fixed;
      inset: 0;
      z-index: 5000;
      display: none;
      place-items: center;
      padding: 18px;
    }

    .auth-test-viewer.open {
      display: grid;
    }

    .auth-test-panel {
      position: relative;
      z-index: 1;
      width: min(560px, 100%);
      max-height: min(760px, 92dvh);
      overflow: auto;
      padding: clamp(20px, 4vw, 34px);
      background: var(--paper, #f6efe3);
      color: var(--ink, #17120e);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.36);
    }

    .auth-test-panel h2 {
      margin: 0 0 12px;
      font-size: clamp(24px, 5vw, 36px);
    }

    .auth-test-note,
    .auth-test-status {
      margin: 8px 0 14px;
      color: #5b4b37;
      line-height: 1.55;
      font-size: 14px;
    }

    .auth-test-fields {
      display: grid;
      gap: 12px;
    }

    .auth-test-fields label {
      display: grid;
      gap: 5px;
      font-weight: 800;
    }

    .auth-test-fields input {
      width: 100%;
      min-height: 44px;
      padding: 8px 10px;
      border: 1px solid rgba(23, 18, 14, 0.22);
      background: rgba(255, 255, 255, 0.82);
      color: #21160d;
      font: inherit;
    }

    .auth-test-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }

    .auth-test-actions button {
      border: 0;
      min-height: 44px;
      padding: 8px 14px;
      color: #21160d;
      background: var(--gold, #d9b45f);
      box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
      cursor: pointer;
    }

    .auth-test-actions button.secondary {
      background: rgba(255, 255, 255, 0.72);
    }

    .auth-test-actions button:disabled {
      opacity: 0.58;
      cursor: wait;
    }

    .auth-test-result {
      margin-top: 14px;
      padding: 10px;
      min-height: 48px;
      background: rgba(255, 255, 255, 0.42);
      border: 1px solid rgba(23, 18, 14, 0.12);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.5;
    }

    @media (max-width: 760px) {
      :root[data-device-layout="phone"] #otpTestButton {
        right: max(10px, env(safe-area-inset-right));
        bottom: max(66px, calc(env(safe-area-inset-bottom) + 54px));
        min-height: 36px;
        padding: 0 10px;
        font-size: 12px;
      }

      :root[data-device-layout="phone"] .auth-test-panel {
        padding: 18px;
      }
    }
  `;
  document.head.append(style);
}

function phase3aEnsureButton() {
  if (document.querySelector("#otpTestButton")) return;
  const button = document.createElement("button");
  button.id = "otpTestButton";
  button.type = "button";
  button.textContent = "OTP測試";
  button.addEventListener("click", phase3aOpenAuthTest);
  document.body.append(button);
}

function phase3aEnsureModal() {
  if (document.querySelector("#authTestViewer")) return;
  const viewer = document.createElement("div");
  viewer.id = "authTestViewer";
  viewer.className = "auth-test-viewer";
  viewer.setAttribute("aria-hidden", "true");
  viewer.innerHTML = `
    <button class="viewer-backdrop" id="closeAuthTestBackdrop" type="button" aria-label="關閉 OTP 測試"></button>
    <section class="auth-test-panel" role="dialog" aria-modal="true" aria-label="Supabase Email OTP 測試">
      <button class="viewer-close" id="closeAuthTest" type="button" aria-label="關閉">×</button>
      <h2>Supabase OTP 測試</h2>
      <p class="auth-test-note">Email 僅用於本階段登入連線測試，不會顯示於公開英雄榜。此畫面是 Phase 3A 測試介面，尚非正式會員 UI。</p>
      <div class="auth-test-fields">
        <label>
          <span>Email</span>
          <input id="authEmail" type="email" inputmode="email" autocomplete="email" placeholder="your@email.com" />
        </label>
        <label>
          <span>OTP 驗證碼</span>
          <input id="authOtp" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="請輸入 Email 收到的驗證碼" />
        </label>
      </div>
      <div class="auth-test-actions">
        <button id="sendOtpButton" type="button">取得驗證碼</button>
        <button id="verifyOtpButton" type="button">驗證登入</button>
        <button id="signOutButton" class="secondary" type="button">登出</button>
      </div>
      <p class="auth-test-status" id="authStatus" role="status">正在檢查登入狀態...</p>
      <div class="auth-test-result" id="authResult"></div>
    </section>
  `;
  document.body.append(viewer);
  document.querySelector("#closeAuthTest")?.addEventListener("click", phase3aCloseAuthTest);
  document.querySelector("#closeAuthTestBackdrop")?.addEventListener("click", phase3aCloseAuthTest);
  document.querySelector("#sendOtpButton")?.addEventListener("click", phase3aSendOtp);
  document.querySelector("#verifyOtpButton")?.addEventListener("click", phase3aVerifyOtp);
  document.querySelector("#signOutButton")?.addEventListener("click", phase3aSignOut);
}

function phase3aOpenAuthTest() {
  const viewer = document.querySelector("#authTestViewer");
  viewer?.classList.add("open");
  viewer?.setAttribute("aria-hidden", "false");
  phase3aRefreshSession();
}

function phase3aCloseAuthTest() {
  const viewer = document.querySelector("#authTestViewer");
  viewer?.classList.remove("open");
  viewer?.setAttribute("aria-hidden", "true");
}

function phase3aEmailValue() {
  return document.querySelector("#authEmail")?.value.trim() || "";
}

function phase3aOtpValue() {
  return document.querySelector("#authOtp")?.value.trim() || "";
}

function phase3aIsEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function phase3aSetLoading(isLoading) {
  PHASE3A_AUTH_STATE.loading = isLoading;
  document.querySelectorAll("#sendOtpButton, #verifyOtpButton, #signOutButton").forEach((button) => {
    button.disabled = isLoading;
  });
}

function phase3aSetStatus(message, detail = "") {
  const status = document.querySelector("#authStatus");
  const result = document.querySelector("#authResult");
  if (status) status.textContent = message;
  if (result) result.textContent = detail;
}

function phase3aFriendlyError(error) {
  const message = String(error?.message || error || "");
  if (!navigator.onLine) return "目前網路似乎離線，請連線後再試。";
  if (/invalid|email/i.test(message)) return "Email 或驗證碼格式不正確，請確認後再試。";
  if (/expired|otp_expired|token has expired/i.test(message)) return "驗證碼已過期，請重新取得驗證碼。";
  if (/token|otp|code|invalid login/i.test(message)) return "驗證碼錯誤或已失效，請重新確認。";
  if (/rate|too many/i.test(message)) return "驗證碼要求太頻繁，請稍候再試。";
  if (/failed to fetch|network/i.test(message)) return "網路連線失敗，請稍後再試。";
  return message || "操作失敗，請稍後再試。";
}

function phase3aSessionDetail(session) {
  if (!session?.user) return "目前未登入。";
  return `登入成功\nAuth User ID：${session.user.id}\nEmail：${session.user.email || "未提供"}`;
}

async function phase3aClient() {
  if (PHASE3A_AUTH_STATE.client) return PHASE3A_AUTH_STATE.client;
  const client = await window.SUNZI_SUPABASE_READY;
  PHASE3A_AUTH_STATE.client = client;
  return client;
}

async function phase3aRefreshSession() {
  try {
    const client = await phase3aClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    PHASE3A_AUTH_STATE.session = data.session || null;
    if (data.session?.user) {
      phase3aSetStatus("Session 已恢復。", phase3aSessionDetail(data.session));
    } else {
      phase3aSetStatus("目前未登入。", "請輸入 Email 取得 OTP 驗證碼。");
    }
  } catch (error) {
    phase3aSetStatus("Supabase 連線尚未成功。", phase3aFriendlyError(error));
  }
}

async function phase3aSendOtp() {
  const email = phase3aEmailValue();
  if (!phase3aIsEmail(email)) {
    phase3aSetStatus("Email 格式錯誤。", "請輸入完整 Email，例如 name@example.com。");
    return;
  }
  phase3aSetLoading(true);
  phase3aSetStatus("正在寄送驗證碼...", "請稍候，不要重複點擊。");
  try {
    const client = await phase3aClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });
    if (error) throw error;
    PHASE3A_AUTH_STATE.lastEmail = email;
    phase3aSetStatus("OTP 已送出。", "請到 Email 收信，將驗證碼填入 OTP 欄位。若沒收到，請檢查垃圾信或稍候再試。");
  } catch (error) {
    phase3aSetStatus("OTP 發送失敗。", phase3aFriendlyError(error));
  } finally {
    phase3aSetLoading(false);
  }
}

async function phase3aVerifyOtp() {
  const email = phase3aEmailValue() || PHASE3A_AUTH_STATE.lastEmail;
  const token = phase3aOtpValue();
  if (!phase3aIsEmail(email)) {
    phase3aSetStatus("Email 格式錯誤。", "請先輸入取得驗證碼時使用的 Email。");
    return;
  }
  if (!token) {
    phase3aSetStatus("尚未輸入 OTP。", "請輸入 Email 收到的驗證碼。");
    return;
  }
  phase3aSetLoading(true);
  phase3aSetStatus("正在驗證登入...", "請稍候。");
  try {
    const client = await phase3aClient();
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    PHASE3A_AUTH_STATE.session = data.session || null;
    phase3aSetStatus("登入成功。", phase3aSessionDetail(data.session));
  } catch (error) {
    phase3aSetStatus("OTP 驗證失敗。", phase3aFriendlyError(error));
  } finally {
    phase3aSetLoading(false);
  }
}

async function phase3aSignOut() {
  phase3aSetLoading(true);
  phase3aSetStatus("正在登出...", "請稍候。");
  try {
    const client = await phase3aClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    PHASE3A_AUTH_STATE.session = null;
    phase3aSetStatus("已登出。", "Session 已清除；仍可繼續單機遊玩。");
  } catch (error) {
    phase3aSetStatus("登出失敗。", phase3aFriendlyError(error));
  } finally {
    phase3aSetLoading(false);
  }
}

async function phase3aInstall() {
  phase3aInstallStyles();
  phase3aEnsureButton();
  phase3aEnsureModal();
  try {
    const client = await phase3aClient();
    client.auth.onAuthStateChange((_event, session) => {
      PHASE3A_AUTH_STATE.session = session || null;
      if (document.querySelector("#authTestViewer")?.classList.contains("open")) {
        phase3aSetStatus(session ? "登入狀態已更新。" : "目前未登入。", phase3aSessionDetail(session));
      }
    });
    await phase3aRefreshSession();
  } catch (error) {
    phase3aSetStatus("Supabase 連線尚未成功。", phase3aFriendlyError(error));
  }

  window.SUNZI_PHASE3A_AUTH_DEBUG = () => ({
    hasClient: Boolean(PHASE3A_AUTH_STATE.client),
    signedIn: Boolean(PHASE3A_AUTH_STATE.session?.user),
    userId: PHASE3A_AUTH_STATE.session?.user?.id || null,
    email: PHASE3A_AUTH_STATE.session?.user?.email || null
  });
}

phase3aInstall();
