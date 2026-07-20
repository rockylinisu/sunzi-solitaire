window.SUNZI_APP_INFO = Object.freeze({
  appName: "孫子兵法接龍",
  releaseStage: "Alpha",
  appVersion: "0.0.4",
  releaseDate: "2026.07.20",
  copyrightYear: "2026",
  copyrightOwner: "林煥章",
  assetVersion: "alpha-0.0.4"
});

window.SUNZI_APP_INFO.versionLabel = `${window.SUNZI_APP_INFO.releaseStage} v${window.SUNZI_APP_INFO.appVersion}`;
window.SUNZI_APP_INFO.copyrightLabel = `© ${window.SUNZI_APP_INFO.copyrightOwner} ${window.SUNZI_APP_INFO.copyrightYear} · ${window.SUNZI_APP_INFO.versionLabel} · ${window.SUNZI_APP_INFO.releaseDate}`;

function applySunziAppInfo() {
  document.querySelectorAll("[data-app-version-text]").forEach((element) => {
    element.textContent = window.SUNZI_APP_INFO.copyrightLabel;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applySunziAppInfo, { once: true });
} else {
  applySunziAppInfo();
}
