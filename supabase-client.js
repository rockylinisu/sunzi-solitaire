(function initSunziSupabaseClient() {
  const config = window.SUNZI_SUPABASE_CONFIG;
  const SDK_SOURCES = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://unpkg.com/@supabase/supabase-js@2"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) {
        resolve();
        return;
      }
      const existing = [...document.scripts].find((script) => script.src === src);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`SDK 載入失敗：${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`SDK 載入失敗：${src}`));
      document.head.append(script);
    });
  }

  async function ensureSupabaseSdk() {
    if (window.supabase?.createClient) return;
    const errors = [];
    for (const src of SDK_SOURCES) {
      try {
        await loadScript(src);
        if (window.supabase?.createClient) return;
        errors.push(`SDK 載入後未建立 supabase 全域物件：${src}`);
      } catch (error) {
        errors.push(error.message);
      }
    }
    throw new Error(`Supabase SDK 尚未載入。${errors.join("；")}`);
  }

  async function createClientWhenReady() {
    if (!config?.url || !config?.publishableKey) {
      throw new Error("Supabase 設定尚未完成，無法啟動登入測試。");
    }
    await ensureSupabaseSdk();
    const client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    window.SUNZI_SUPABASE = client;
    return client;
  }

  window.SUNZI_SUPABASE_READY = createClientWhenReady().catch((error) => {
    window.SUNZI_SUPABASE_ERROR = error.message;
    console.warn(error.message);
    throw error;
  });
})();
