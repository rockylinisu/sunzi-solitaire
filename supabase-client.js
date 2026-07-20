(function initSunziSupabaseClient() {
  const config = window.SUNZI_SUPABASE_CONFIG;

  function fail(message) {
    window.SUNZI_SUPABASE_READY = Promise.reject(new Error(message));
    window.SUNZI_SUPABASE_ERROR = message;
    console.warn(message);
  }

  if (!config?.url || !config?.publishableKey) {
    fail("Supabase 設定尚未完成，無法啟動登入測試。");
    return;
  }

  if (!window.supabase?.createClient) {
    fail("Supabase SDK 尚未載入，請檢查網路或 CDN。 ");
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.SUNZI_SUPABASE = client;
  window.SUNZI_SUPABASE_READY = Promise.resolve(client);
})();
