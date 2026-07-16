/**
 * utils.js — shared helpers used by app.js, upload.js, and viewer.js
 */

const Utils = (() => {
  const CATEGORY_ICONS = {
    documents: "📄",
    images: "🖼️",
    videos: "🎬",
    audio: "🎧",
    archives: "🗜️",
    others: "📦",
  };

  const CATEGORY_LABELS = {
    documents: "Documents",
    images: "Images",
    videos: "Videos",
    audio: "Audio",
    archives: "Archives",
    others: "Others",
  };

  const EXT_ICON = {
    pdf: "📕", doc: "📘", docx: "📘", txt: "📝", md: "📝", rtf: "📝", csv: "📊",
    xls: "📗", xlsx: "📗", ppt: "📙", pptx: "📙",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", svg: "🖼️", webp: "🖼️",
    mp4: "🎬", webm: "🎬", mov: "🎬", mkv: "🎬",
    mp3: "🎧", wav: "🎧", ogg: "🎧", flac: "🎧", m4a: "🎧",
    zip: "🗜️", rar: "🗜️", "7z": "🗜️", tar: "🗜️", gz: "🗜️",
  };

  function extIcon(ext) {
    return EXT_ICON[ext] || "📦";
  }

  function categoryIcon(category) {
    return CATEGORY_ICONS[category] || "📦";
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || "Others";
  }

  function categoryColorVar(category) {
    return `var(--cat-${category || "others"})`;
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "—";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function formatDate(iso) {
    if (!iso) return "Unknown";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Unknown";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str = "") {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function qs(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function isImage(ext) {
    return ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext);
  }
  function isPdf(ext) {
    return ext === "pdf";
  }
  function isVideo(ext) {
    return ["mp4", "webm", "mov", "mkv", "m4v"].includes(ext);
  }
  function isAudio(ext) {
    return ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext);
  }
  function isText(ext) {
    return ["txt", "md", "csv", "json", "log"].includes(ext);
  }
  function isOfficeDoc(ext) {
    return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
  }

  // Absolute URL to a file, for building shareable links / QR codes.
  function absoluteFileUrl(relativeUrl) {
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
    return new URL(relativeUrl, base).toString();
  }

  function toast(message, type = "success") {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = `toast ${type === "error" ? "error" : ""}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // ---- Theme ----
  function initTheme() {
    const saved = localStorage.getItem("cv-theme");
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (preferDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    return theme;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cv-theme", next);
    return next;
  }

  return {
    extIcon, categoryIcon, categoryLabel, categoryColorVar,
    formatBytes, formatDate, debounce, escapeHtml, qs,
    isImage, isPdf, isVideo, isAudio, isText, isOfficeDoc,
    absoluteFileUrl, toast, initTheme, toggleTheme,
  };
})();
