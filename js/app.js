/**
 * app.js — dashboard (index.html) controller
 */

const App = (() => {
  let allFiles = [];
  let state = {
    query: "",
    category: "all",
    sort: "newest",
    view: localStorage.getItem("cv-view") || "grid",
  };

  const els = {};

  function cacheEls() {
    els.grid = document.getElementById("fileGrid");
    els.search = document.getElementById("searchInput");
    els.filterBar = document.getElementById("filterBar");
    els.sortSelect = document.getElementById("sortSelect");
    els.viewGridBtn = document.getElementById("viewGridBtn");
    els.viewListBtn = document.getElementById("viewListBtn");
    els.navList = document.getElementById("navList");
    els.pageSubtitle = document.getElementById("pageSubtitle");
    els.themeToggle = document.getElementById("themeToggle");
    els.menuToggle = document.getElementById("menuToggle");
    els.sidebar = document.getElementById("sidebar");
    els.lightbox = document.getElementById("lightbox");
    els.lightboxImg = document.getElementById("lightboxImg");
    els.storageFill = document.getElementById("storageFill");
    els.storageLabel = document.getElementById("storageLabel");
    els.siteBrandName = document.querySelectorAll(".js-site-name");
  }

  async function loadIndex() {
    try {
      const res = await fetch(`data/files.json?_=${Date.now()}`);
      if (!res.ok) throw new Error("index missing");
      const json = await res.json();
      allFiles = json.files || [];
    } catch (e) {
      allFiles = [];
      console.warn("Could not load data/files.json yet:", e);
    }
  }

  function categoryCounts() {
    const counts = { all: allFiles.length, documents: 0, images: 0, videos: 0, audio: 0, archives: 0, others: 0 };
    for (const f of allFiles) counts[f.category] = (counts[f.category] || 0) + 1;
    return counts;
  }

  function renderSidebarCounts() {
    const counts = categoryCounts();
    els.navList.querySelectorAll("[data-category]").forEach((item) => {
      const cat = item.dataset.category;
      const countEl = item.querySelector(".count");
      if (countEl) countEl.textContent = counts[cat] || 0;
    });

    const totalBytes = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    const quota = window.CLOUDVAULT_CONFIG.storageQuotaBytes;
    const pct = Math.min(100, (totalBytes / quota) * 100);
    if (els.storageFill) els.storageFill.style.width = `${pct}%`;
    if (els.storageLabel) els.storageLabel.textContent = `${Utils.formatBytes(totalBytes)} used · ${allFiles.length} files`;
  }

  function applyFiltersAndSort() {
    let list = [...allFiles];

    if (state.category !== "all") {
      list = list.filter((f) => f.category === state.category);
    }
    if (state.query.trim()) {
      const q = state.query.trim().toLowerCase();
      list = list.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.ext.toLowerCase().includes(q) ||
        (f.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    const sorters = {
      newest: (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt),
      oldest: (a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt),
      largest: (a, b) => b.size - a.size,
      smallest: (a, b) => a.size - b.size,
      az: (a, b) => a.name.localeCompare(b.name),
      type: (a, b) => a.ext.localeCompare(b.ext),
    };
    list.sort(sorters[state.sort] || sorters.newest);
    return list;
  }

  function fileCardHtml(file) {
    const isList = state.view === "list";
    const color = Utils.categoryColorVar(file.category);
    let thumb = `<span class="icon-glyph">${Utils.extIcon(file.ext)}</span>`;
    if (Utils.isImage(file.ext)) {
      thumb = `<img src="${file.url}" alt="${Utils.escapeHtml(file.name)}" loading="lazy" />`;
    }

    return `
      <article class="file-card" data-id="${Utils.escapeHtml(file.id)}" tabindex="0">
        <span class="tab" style="background:${color}"></span>
        <div class="file-thumb" data-action="open-preview">${thumb}</div>
        <div class="file-body">
          <div>
            <div class="file-name" title="${Utils.escapeHtml(file.name)}">${Utils.escapeHtml(file.name)}</div>
            <div class="file-meta">
              <span class="stamp">${file.ext.toUpperCase()}</span>
              <span>${file.sizeLabel}</span>
              <span>${Utils.formatDate(file.uploadedAt)}</span>
            </div>
          </div>
        </div>
        <div class="file-actions">
          <button class="icon-btn" title="View" data-action="view" aria-label="View ${Utils.escapeHtml(file.name)}">👁️</button>
          <a class="icon-btn" title="Download" href="${file.url}" download aria-label="Download ${Utils.escapeHtml(file.name)}">⬇️</a>
          <button class="icon-btn" title="Copy link" data-action="copy" aria-label="Copy link to ${Utils.escapeHtml(file.name)}">🔗</button>
          <button class="icon-btn" title="Share" data-action="share" aria-label="Share ${Utils.escapeHtml(file.name)}">📤</button>
        </div>
      </article>`;
  }

  function render() {
    const list = applyFiltersAndSort();
    els.grid.classList.toggle("list-view", state.view === "list");

    if (list.length === 0) {
      els.grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <h3>Nothing here yet</h3>
          <p>Upload a file or clear your search/filters to see your library.</p>
        </div>`;
      return;
    }
    els.grid.innerHTML = list.map(fileCardHtml).join("");

    els.pageSubtitle.textContent = `${list.length} file${list.length === 1 ? "" : "s"}${state.category !== "all" ? " · " + Utils.categoryLabel(state.category) : ""}`;
  }

  function wireGridActions() {
    els.grid.addEventListener("click", (e) => {
      const card = e.target.closest(".file-card");
      if (!card) return;
      const id = card.dataset.id;
      const file = allFiles.find((f) => f.id === id);
      if (!file) return;

      const actionEl = e.target.closest("[data-action]");
      const action = actionEl ? actionEl.dataset.action : null;

      if (action === "copy") {
        e.preventDefault();
        navigator.clipboard.writeText(Utils.absoluteFileUrl(file.url) + `../file.html?id=${encodeURIComponent(file.id)}`);
        copyShareLink(file);
      } else if (action === "share") {
        e.preventDefault();
        shareFile(file);
      } else if (action === "view" || action === "open-preview") {
        e.preventDefault();
        if (Utils.isImage(file.ext)) {
          openLightbox(file);
        } else {
          window.location.href = `file.html?id=${encodeURIComponent(file.id)}`;
        }
      } else if (!actionEl) {
        window.location.href = `file.html?id=${encodeURIComponent(file.id)}`;
      }
    });

    els.grid.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.target.classList.contains("file-card")) {
        window.location.href = `file.html?id=${encodeURIComponent(e.target.dataset.id)}`;
      }
    });
  }

  function copyShareLink(file) {
    const url = new URL(`file.html?id=${encodeURIComponent(file.id)}`, window.location.href).toString();
    navigator.clipboard.writeText(url).then(
      () => Utils.toast("Link copied to clipboard"),
      () => Utils.toast("Could not copy link", "error")
    );
  }

  async function shareFile(file) {
    const url = new URL(`file.html?id=${encodeURIComponent(file.id)}`, window.location.href).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title: file.name, url });
      } catch (e) {
        /* user cancelled */
      }
    } else {
      copyShareLink(file);
    }
  }

  function openLightbox(file) {
    els.lightboxImg.src = file.url;
    els.lightboxImg.alt = file.name;
    els.lightbox.classList.add("open");
  }

  function wireControls() {
    els.search.addEventListener("input", Utils.debounce((e) => {
      state.query = e.target.value;
      render();
    }, 200));

    els.filterBar.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]");
      if (!chip) return;
      state.category = chip.dataset.filter;
      els.filterBar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      render();
    });

    els.navList.addEventListener("click", (e) => {
      const item = e.target.closest("[data-category]");
      if (!item) return;
      state.category = item.dataset.category;
      els.navList.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n === item));
      const chip = els.filterBar.querySelector(`[data-filter="${state.category}"]`);
      if (chip) els.filterBar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      render();
      if (window.innerWidth <= 860) els.sidebar.classList.remove("open");
    });

    els.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });

    els.viewGridBtn.addEventListener("click", () => setView("grid"));
    els.viewListBtn.addEventListener("click", () => setView("list"));

    els.themeToggle.addEventListener("click", () => {
      const next = Utils.toggleTheme();
      els.themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
    });

    els.menuToggle.addEventListener("click", () => els.sidebar.classList.toggle("open"));

    els.lightbox.addEventListener("click", (e) => {
      if (e.target === els.lightbox || e.target.classList.contains("lightbox-close")) {
        els.lightbox.classList.remove("open");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") els.lightbox.classList.remove("open");
    });
  }

  function setView(view) {
    state.view = view;
    localStorage.setItem("cv-view", view);
    els.viewGridBtn.classList.toggle("active", view === "grid");
    els.viewListBtn.classList.toggle("active", view === "list");
    render();
  }

  async function refreshAfterUpload() {
    await loadIndex();
    renderSidebarCounts();
    render();
  }

  async function init() {
    cacheEls();
    document.documentElement.setAttribute("data-theme", Utils.initTheme());
    els.themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
    els.siteBrandName.forEach((el) => (el.textContent = window.CLOUDVAULT_CONFIG.siteName));

    setView(state.view);
    wireControls();
    wireGridActions();

    await loadIndex();
    renderSidebarCounts();
    render();
  }

  return { init, refreshAfterUpload, get files() { return allFiles; } };
})();

document.addEventListener("DOMContentLoaded", App.init);
