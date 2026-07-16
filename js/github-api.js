/**
 * github-api.js
 * -------------
 * Talks directly to the GitHub REST API from the browser so that new files
 * can be committed to /uploads without a custom server.
 *
 * IMPORTANT: this requires a GitHub Personal Access Token with "repo" scope,
 * entered by you (the site owner) in the Upload panel. The token is stored
 * only in YOUR browser's localStorage — it is never written into any file,
 * never committed, and never sent anywhere except api.github.com. Visitors
 * to your public site never see or need a token; they can only view/download
 * files that are already committed.
 */

const GitHubAPI = (() => {
  const TOKEN_KEY = "cv-gh-token";
  const API_BASE = "https://api.github.com";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }
  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
  function hasToken() {
    return !!getToken();
  }

  function headers() {
    return {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
    };
  }

  async function verifyToken() {
    const res = await fetch(`${API_BASE}/user`, { headers: headers() });
    if (!res.ok) throw new Error("Token invalid or expired.");
    return res.json();
  }

  function repoPath() {
    const { githubOwner, githubRepo } = window.CLOUDVAULT_CONFIG;
    return `${githubOwner}/${githubRepo}`;
  }

  // Reads a file's base64 contents (used for both the upload payload and
  // for computing a duplicate-detection hash before committing).
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function sha256Hex(file) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Commits a single file to uploads/<category>/<filename> via the Contents API.
  async function uploadFile({ file, category, onProgress }) {
    const { branch } = window.CLOUDVAULT_CONFIG;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `uploads/${category}/${safeName}`;
    onProgress && onProgress(10);

    const base64Content = await readFileAsBase64(file);
    onProgress && onProgress(45);

    // Check whether a file already exists at this path (so we send its SHA,
    // which GitHub requires to update an existing file rather than fail).
    let existingSha;
    const existing = await fetch(`${API_BASE}/repos/${repoPath()}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
      headers: headers(),
    });
    if (existing.ok) {
      const data = await existing.json();
      existingSha = data.sha;
    }

    const body = {
      message: `Upload ${safeName} via CloudVault web uploader`,
      content: base64Content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    };

    onProgress && onProgress(70);

    const res = await fetch(`${API_BASE}/repos/${repoPath()}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    onProgress && onProgress(95);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed (${res.status})`);
    }

    onProgress && onProgress(100);
    return { path, overwritten: !!existingSha };
  }

  return { getToken, setToken, hasToken, verifyToken, uploadFile, sha256Hex };
})();
