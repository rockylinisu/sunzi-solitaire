const SUNZI_APP_VERSION_SOURCE = {
  appName: "孫子兵法接龍",
  releaseStage: "Alpha",
  appVersion: "0.0.4",
  releaseDate: "2026.07.20",
  copyrightYear: "2026",
  copyrightOwner: "林煥章",
  assetVersion: "alpha-0.0.4"
};

SUNZI_APP_VERSION_SOURCE.versionLabel = `${SUNZI_APP_VERSION_SOURCE.releaseStage} v${SUNZI_APP_VERSION_SOURCE.appVersion}`;
SUNZI_APP_VERSION_SOURCE.copyrightLabel = `© ${SUNZI_APP_VERSION_SOURCE.copyrightOwner} ${SUNZI_APP_VERSION_SOURCE.copyrightYear} · ${SUNZI_APP_VERSION_SOURCE.versionLabel} · ${SUNZI_APP_VERSION_SOURCE.releaseDate}`;

window.SUNZI_APP_INFO = Object.freeze(SUNZI_APP_VERSION_SOURCE);

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
