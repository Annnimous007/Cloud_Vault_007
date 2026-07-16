/**
 * upload.js — upload modal controller (drag & drop, queue, GitHub commit)
 */

const Upload = (() => {
  const CATEGORY_BY_EXT = {
    pdf: "documents", doc: "documents", docx: "documents", txt: "documents", md: "documents", rtf: "documents", csv: "documents",
    xls: "documents", xlsx: "documents", ppt: "documents", pptx: "documents",
    jpg: "images", jpeg: "images", png: "images", gif: "images", svg: "images", webp: "images", bmp: "images",
    mp4: "videos", webm: "videos", mov: "videos", mkv: "videos", m4v: "videos",
    mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", m4a: "audio", aac: "audio",
    zip: "archives", rar: "archives", "7z": "archives", tar: "archives", gz: "archives",
  };

  let queue = []; // { file, id, category, status, progress }
  const els = {};

  function cacheEls() {
    els.overlay = document.getElementById("uploadModal");
    els.openBtn = document.getElementById("openUploadBtn");
    els.closeBtn = document.getElementById("closeUploadBtn");
    els.dropzone = document.getElementById("dropzone");
    els.fileInput = document.getElementById("fileInput");
    els.queueList = document.getElementById("uploadQueue");
    els.tokenInput = document.getElementById("ghTokenInput");
    els.tokenSaveBtn = document.getElementById("ghTokenSaveBtn");
    els.tokenStatus = document.getElementById("ghTokenStatus");
    els.startBtn = document.getElementById("startUploadBtn");
    els.categoryOverride = document.getElementById("categoryOverride");
  }

  function detectCategory(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    return CATEGORY_BY_EXT[ext] || "others";
  }

  function open() {
    els.overlay.classList.add("open");
    els.tokenInput.value = GitHubAPI.getToken() ? "••••••••••••••••" : "";
    els.tokenStatus.textContent = GitHubAPI.hasToken() ? "Token saved in this browser." : "No token saved yet — required to upload.";
  }
  function close() {
    els.overlay.classList.remove("open");
  }

  function addFilesToQueue(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      queue.push({
        file,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category: els.categoryOverride.value === "auto" ? detectCategory(file.name) : els.categoryOverride.value,
        status: "pending",
        progress: 0,
      });
    }
    renderQueue();
  }

  function renderQueue() {
    if (queue.length === 0) {
      els.queueList.innerHTML = `<p class="field-hint">No files queued yet. Drop files above or choose them manually.</p>`;
      return;
    }
    els.queueList.innerHTML = queue.map((item) => `
      <div class="upload-row" data-qid="${item.id}">
        <span>${Utils.extIcon(item.file.name.split(".").pop().toLowerCase())}</span>
        <span class="name" title="${Utils.escapeHtml(item.file.name)}">${Utils.escapeHtml(item.file.name)}</span>
        <span class="field-hint">${Utils.formatBytes(item.file.size)}</span>
        <div class="progress-track"><div class="progress-fill" style="width:${item.progress}%"></div></div>
        <span class="status-badge ${item.status}">${item.status}</span>
      </div>
    `).join("");
  }

  function setRowStatus(id, status, progress) {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    item.status = status;
    if (progress !== undefined) item.progress = progress;
    const row = els.queueList.querySelector(`[data-qid="${id}"]`);
    if (!row) return;
    row.querySelector(".status-badge").className = `status-badge ${status}`;
    row.querySelector(".status-badge").textContent = status;
    if (progress !== undefined) row.querySelector(".progress-fill").style.width = `${progress}%`;
  }

  async function checkDuplicate(item) {
    const hash = await GitHubAPI.sha256Hex(item.file);
    const existing = App.files.find((f) => f.hash === hash);
    return existing || null;
  }

  async function startUpload() {
    if (!GitHubAPI.hasToken()) {
      Utils.toast("Add your GitHub token first (see the Upload panel).", "error");
      return;
    }
    if (queue.length === 0) {
      Utils.toast("Nothing queued to upload.", "error");
      return;
    }

    for (const item of queue) {
      if (item.status === "done" || item.status === "duplicate") continue;

      const dup = await checkDuplicate(item);
      if (dup) {
        setRowStatus(item.id, "duplicate", 100);
        Utils.toast(`"${item.file.name}" already exists as "${dup.name}" — skipped.`, "error");
        continue;
      }

      setRowStatus(item.id, "uploading", 5);
      try {
        await GitHubAPI.uploadFile({
          file: item.file,
          category: item.category,
          onProgress: (pct) => setRowStatus(item.id, "uploading", pct),
        });
        setRowStatus(item.id, "done", 100);
      } catch (e) {
        console.error(e);
        setRowStatus(item.id, "error", 100);
        Utils.toast(`Failed to upload "${item.file.name}": ${e.message}`, "error");
      }
    }

    Utils.toast("Upload batch finished. The index updates within a minute of GitHub Actions running.");
    // Files won't appear in data/files.json until the GitHub Action commits the
    // rebuilt index, so we don't claim they're instantly visible on the grid.
  }

  function wire() {
    els.openBtn.addEventListener("click", open);
    els.closeBtn.addEventListener("click", close);
    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) close();
    });

    els.dropzone.addEventListener("click", () => els.fileInput.click());
    els.dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      els.dropzone.classList.add("dragover");
    });
    els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
    els.dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      els.dropzone.classList.remove("dragover");
      addFilesToQueue(e.dataTransfer.files);
    });
    els.fileInput.addEventListener("change", (e) => addFilesToQueue(e.target.files));

    els.tokenSaveBtn.addEventListener("click", async () => {
      const val = els.tokenInput.value.trim();
      if (!val || val.startsWith("••")) return;
      GitHubAPI.setToken(val);
      els.tokenStatus.textContent = "Verifying token...";
      try {
        const user = await GitHubAPI.verifyToken();
        els.tokenStatus.textContent = `Signed in as ${user.login}. Token saved only in this browser.`;
        Utils.toast("GitHub token verified.");
      } catch (e) {
        els.tokenStatus.textContent = "Token could not be verified — check scope and expiry.";
        Utils.toast("Invalid token", "error");
      }
    });

    els.startBtn.addEventListener("click", async () => {
      els.startBtn.disabled = true;
      await startUpload();
      els.startBtn.disabled = false;
      await App.refreshAfterUpload();
    });
  }

  function init() {
    cacheEls();
    wire();
    renderQueue();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Upload.init);
