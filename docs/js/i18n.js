const TRANSLATIONS = {
  en: {
    metaDescription: "Record audio from the active browser tab and save it locally as a WebM file. No accounts, no telemetry.",
    langLabel: "EN",
    heroTitle: "TabAudio Forge",
    heroSubtitle: "Record audio from the active browser tab and save it locally.",
    installBtn: "Install",
    githubBtn: "View on GitHub",
    featuresTitle: "Features",
    feat1Title: "Tab Audio Capture",
    feat1Desc: "Record sound from the current browser tab with one click.",
    feat2Title: "Pause & Resume",
    feat2Desc: "Control the session without losing captured data.",
    feat3Title: "Local Save",
    feat3Desc: "Downloads a WebM file directly to your computer.",
    feat4Title: "No Telemetry",
    feat4Desc: "No accounts, no ads, no analytics, no network requests.",
    installTitle: "Install",
    step1: "Open <code>chrome://extensions</code> or <code>edge://extensions</code>.",
    step2: "Enable <strong>Developer mode</strong>.",
    step3: "Click <strong>Load unpacked</strong> and select this repository folder.",
    step4: "Open a tab with audio, click the extension icon, and press <strong>Start</strong>.",
    privacyTitle: "Privacy",
    privacyNote: "Audio is processed entirely on your device. Nothing is uploaded. The extension does not initiate any network requests.",
    footerLicense: "Released under the MIT License.",
    footerSource: "Source on GitHub"
  },
  ru: {
    metaDescription: "Записывайте аудио активной вкладки браузера и сохраняйте локально в формате WebM. Без аккаунтов и телеметрии.",
    langLabel: "RU",
    heroTitle: "TabAudio Forge",
    heroSubtitle: "Записывайте звук из активной вкладки браузера и сохраняйте локально.",
    installBtn: "Установить",
    githubBtn: "На GitHub",
    featuresTitle: "Возможности",
    feat1Title: "Захват аудио вкладки",
    feat1Desc: "Записывайте звук текущей вкладки одним нажатием.",
    feat2Title: "Пауза и продолжение",
    feat2Desc: "Управляйте записью без потери захваченных данных.",
    feat3Title: "Локальное сохранение",
    feat3Desc: "Файл WebM скачивается напрямую на ваш компьютер.",
    feat4Title: "Никакой телеметрии",
    feat4Desc: "Нет аккаунтов, рекламы, аналитики и сетевых запросов.",
    installTitle: "Установка",
    step1: "Откройте <code>chrome://extensions</code> или <code>edge://extensions</code>.",
    step2: "Включите <strong>Режим разработчика</strong>.",
    step3: "Нажмите <strong>Загрузить распакованное расширение</strong> и выберите папку репозитория.",
    step4: "Откройте вкладку со звуком, нажмите на иконку расширения и выберите <strong>Старт</strong>.",
    privacyTitle: "Приватность",
    privacyNote: "Аудио обрабатывается полностью на вашем устройстве. Ничего не загружается. Расширение не инициирует сетевых запросов.",
    footerLicense: "Распространяется под лицензией MIT.",
    footerSource: "Исходный код на GitHub"
  }
};

let currentLang = "en";

function detectLanguage() {
  const saved = localStorage.getItem("tf-lang");
  if (saved && TRANSLATIONS[saved]) return saved;
  const nav = navigator.language || "en";
  return nav.startsWith("ru") ? "ru" : "en";
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("tf-lang", lang);
  const t = TRANSLATIONS[lang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key] !== undefined) {
      if (el.tagName.toLowerCase() === "title") {
        el.textContent = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(el => {
    const [attr, key] = el.getAttribute("data-i18n-attr").split("::");
    if (attr && t[key] !== undefined) {
      el.setAttribute(attr, t[key]);
    }
  });
  document.documentElement.lang = lang;
}

function toggleLanguage() {
  applyLanguage(currentLang === "en" ? "ru" : "en");
}

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage(detectLanguage());
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.addEventListener("click", toggleLanguage);
});
