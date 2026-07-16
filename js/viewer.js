/**
 * viewer.js — file.html controller
 */

const Viewer = (() => {
  const els = {};

  function cacheEls() {
    els.previewPanel = document.getElementById("previewPanel");
    els.infoTitle = document.getElementById("infoTitle");
    els.infoRows = document.getElementById("infoRows");
    els.linkInput = document.getElementById("shareLinkInput");
    els.copyBtn = document.getElementById("copyLinkBtn");
    els.downloadBtn = document.getElementById("downloadBtn");
    els.qrImg = document.getElementById("qrImg");
    els.notFound = document.getElementById("notFound");
    els.detailWrap = document.getElementById("detailWrap");
    els.themeToggle = document.getElementById("themeToggle");
    els.siteBrandName = document.querySelectorAll(".js-site-name");
  }

  function renderPreview(file) {
    const ext = file.ext;
    const url = file.url;

    if (Utils.isImage(ext)) {
      els.previewPanel.innerHTML = `<img src="${url}" alt="${Utils.escapeHtml(file.name)}" loading="lazy" />`;
    } else if (Utils.isPdf(ext)) {
      els.previewPanel.innerHTML = `<iframe src="${url}" title="${Utils.escapeHtml(file.name)}"></iframe>`;
    } else if (Utils.isVideo(ext)) {
      els.previewPanel.innerHTML = `<video src="${url}" controls preload="metadata"></video>`;
    } else if (Utils.isAudio(ext)) {
      els.previewPanel.innerHTML = `<audio src="${url}" controls></audio>`;
    } else if (Utils.isText(ext)) {
      els.previewPanel.innerHTML = `<div class="text-preview">Loading…</div>`;
      fetch(url).then((r) => r.text()).then((text) => {
        els.previewPanel.querySelector(".text-preview").textContent = text;
      }).catch(() => {
        els.previewPanel.innerHTML = `<div class="no-preview">Could not load this file for preview.</div>`;
      });
    } else if (Utils.isOfficeDoc(ext)) {
      const absoluteUrl = Utils.absoluteFileUrl(url);
      els.previewPanel.innerHTML = `<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}" title="${Utils.escapeHtml(file.name)}"></iframe>
        <p class="field-hint" style="padding:10px 16px;">Office preview requires this site to be publicly reachable (works once deployed to GitHub Pages).</p>`;
    } else {
      els.previewPanel.innerHTML = `<div class="no-preview"><p>No inline preview for .${ext} files.</p></div>`;
    }
  }

  function renderInfo(file) {
    els.infoTitle.textContent = file.name;
    els.infoRows.innerHTML = `
      <div class="info-row"><span>Category</span><span>${Utils.categoryIcon(file.category)} ${Utils.categoryLabel(file.category)}</span></div>
      <div class="info-row"><span>Type</span><span>.${file.ext}</span></div>
      <div class="info-row"><span>Size</span><span>${file.sizeLabel}</span></div>
      <div class="info-row"><span>Uploaded</span><span>${Utils.formatDate(file.uploadedAt)}</span></div>
      <div class="info-row"><span>Path</span><span>${Utils.escapeHtml(file.path)}</span></div>
    `;
    els.downloadBtn.href = file.url;
    els.downloadBtn.setAttribute("download", file.name);

    const shareUrl = new URL(`file.html?id=${encodeURIComponent(file.id)}`, window.location.href).toString();
    els.linkInput.value = shareUrl;
    els.qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;
    els.qrImg.alt = `QR code linking to ${file.name}`;
  }

  function wireActions(file) {
    els.copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(els.linkInput.value).then(
        () => Utils.toast("Share link copied."),
        () => Utils.toast("Could not copy link.", "error")
      );
    });

    els.themeToggle.addEventListener("click", () => {
      const next = Utils.toggleTheme();
      els.themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
    });
  }

  async function init() {
    cacheEls();
    document.documentElement.setAttribute("data-theme", Utils.initTheme());
    els.themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
    els.siteBrandName.forEach((el) => (el.textContent = window.CLOUDVAULT_CONFIG.siteName));

    const id = Utils.qs("id");
    let files = [];
    try {
      const res = await fetch(`data/files.json?_=${Date.now()}`);
      const json = await res.json();
      files = json.files || [];
    } catch (e) {
      files = [];
    }

    const file = files.find((f) => f.id === id);
    if (!file) {
      els.detailWrap.style.display = "none";
      els.notFound.style.display = "block";
      return;
    }

    document.title = `${file.name} · ${window.CLOUDVAULT_CONFIG.siteName}`;
    renderPreview(file);
    renderInfo(file);
    wireActions(file);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Viewer.init);
