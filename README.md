# CloudVault — personal file hosting portal on GitHub Pages

A free, self-hosted file portal: upload documents, images, videos, audio, and
archives to a GitHub repository, and get a clean dashboard where you (or
anyone you share a link with) can browse, preview, and download them —
no server, no database, no hosting bill.

- **Hosting:** GitHub Pages (static, free)
- **Storage:** files committed straight into this repo's `/uploads` folder
- **Index:** a GitHub Action scans `/uploads` on every push and regenerates
  `data/files.json`, which the frontend reads to render the dashboard —
  so adding a file to the repo is enough, no HTML editing required
- **Upload from the browser:** optional, via the GitHub REST API using your
  own personal access token (kept in your browser only — see the security
  note below)

---

## 1. Repository setup

1. Create a new GitHub repository (public, so Pages and shared links work
   for visitors without a GitHub account).
2. Push this project's files to the repository's default branch (`main`).
3. Open `js/config.js` and set:

   ```js
   window.CLOUDVAULT_CONFIG = {
     githubOwner: "your-github-username",
     githubRepo: "your-repo-name",
     branch: "main",
     siteName: "CloudVault",
     ...
   };
   ```

   This is the **only file you need to edit** to point the site at your repo.

## 2. Enable GitHub Pages

1. Go to **Settings → Pages** in your repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` — the included workflow (`.github/workflows/build-index.yml`)
   builds the file index and deploys the site automatically.
4. Your site will be live at `https://<your-username>.github.io/<your-repo>/`.

No manual "gh-pages branch" setup is needed; the workflow handles deployment.

## 3. Adding files the simple way (no upload panel needed)

Just drop files into the matching folder and push:

```
uploads/documents/   → PDF, DOC, DOCX, TXT, MD, XLS, XLSX, PPT, PPTX, CSV
uploads/images/      → JPG, PNG, GIF, SVG, WEBP, BMP
uploads/videos/      → MP4, WEBM, MOV, MKV
uploads/audio/       → MP3, WAV, OGG, FLAC, M4A
uploads/archives/    → ZIP, RAR, 7Z, TAR, GZ
uploads/others/      → anything else
```

On push, the GitHub Action:
1. Runs `scripts/generate-index.js`, which walks `/uploads` and writes
   `data/files.json` with each file's name, size, type, category, upload
   date (from git history), a SHA-256 hash (used for duplicate detection),
   and its public URL.
2. Commits that updated index back to the repo.
3. Deploys the updated site to GitHub Pages.

The dashboard always reflects whatever is committed — nothing is hardcoded.

## 4. Uploading directly from the website (optional)

The dashboard has an **Upload** button with drag-and-drop, multi-file queues,
progress bars, and automatic duplicate detection (by content hash, not just
filename). It commits files straight to your repo using the GitHub Contents
API, called directly from your browser.

To use it you'll need a **GitHub Personal Access Token**:

1. Go to **github.com → Settings → Developer settings → Personal access
   tokens → Fine-grained tokens**.
2. Create a token scoped **only to this repository**, with **Contents:
   Read and write** permission. Set an expiry (e.g. 90 days) and note it
   somewhere safe.
3. In the dashboard, click **Upload**, paste the token into the "GitHub
   personal access token" field, and click **Save**.
4. Drag files into the dropzone (or click to choose), then **Start upload**.

New files appear on the dashboard once the GitHub Action finishes rebuilding
the index — usually within a minute.

### Security note

This is a static site with no backend, so there is no server to hold a
secret safely. The token you paste in is:

- stored **only** in your own browser's `localStorage` (`cv-gh-token`)
- sent **only** to `api.github.com`, never to any third party
- **never** written into any file, never committed, never visible in the
  page source

Visitors to your public site do not need a token and never see one — they
can only view and download files that are already committed. Only paste
your token into the browser you personally use to manage the site, and
avoid using a token with more than repository-scoped access.

If you'd rather not manage a token at all, just use the "push files
directly" method from Section 3 — the upload panel is entirely optional.

## 5. Sharing files

Every file gets its own page at `file.html?id=<path>`, with:

- an inline preview (image viewer, embedded PDF, HTML5 video/audio player,
  plain-text/Markdown reader, or an Office Online embed for DOC/XLS/PPT
  files once the site is publicly deployed)
- a **Copy link** button for the direct shareable URL
- a **QR code** for scanning on another device
- file metadata (type, size, upload date) and a **Download** button

Anyone with the link can view or download — no GitHub account required.

## 6. Search, filters, and sorting

- The search box filters by file name, extension, or tag as you type.
- Sidebar and filter-bar chips narrow by category (Documents, Images,
  Videos, Audio, Archives, Others).
- The sort dropdown supports newest/oldest first, largest/smallest file,
  alphabetical, and file type.
- A grid/list view toggle is remembered between visits.

## 7. Project structure

```
├── index.html              Dashboard (homepage)
├── file.html               Individual file preview/share page
├── css/styles.css          All styling (design tokens, layout, themes)
├── js/
│   ├── config.js           Your GitHub username/repo — edit this
│   ├── utils.js            Shared formatting/theme/toast helpers
│   ├── github-api.js       Browser-side GitHub Contents API client
│   ├── app.js              Dashboard controller (search/filter/sort/grid)
│   ├── upload.js           Upload modal + queue + duplicate detection
│   └── viewer.js           file.html controller (preview + QR + share)
├── data/files.json         Auto-generated file index — do not hand-edit
├── scripts/generate-index.js   Builds data/files.json from /uploads
├── uploads/                Your actual files, organized by category
├── .github/workflows/build-index.yml   Rebuilds index + deploys on push
└── assets/icons/           Optional custom icons
```

## 8. Local preview

Because the dashboard fetches `data/files.json` over HTTP, opening
`index.html` directly from the filesystem (`file://`) won't work in most
browsers. Serve the folder locally instead:

```bash
cd cloudvault
python3 -m http.server 8080
# then open http://localhost:8080
```

Run `node scripts/generate-index.js` locally first if you've added files
and want to preview the dashboard before pushing.

## 9. Customization

- **Colors, type, and card style** live entirely in `css/styles.css` as
  CSS custom properties under `:root` and `[data-theme="dark"]`.
- **Category → extension mapping** is defined in both
  `scripts/generate-index.js` (server-side index build) and `js/upload.js`
  (client-side auto-detect on upload) — keep them in sync if you add types.
- **Storage meter** in the sidebar is cosmetic (GitHub has no fixed quota
  for reasonable personal use); adjust `storageQuotaBytes` in
  `js/config.js` if you want the bar to mean something specific to you.

---

Built with HTML5, CSS3, and vanilla ES6+ JavaScript — no build step, no
framework, no dependencies beyond two small CDN-hosted fonts and the free
QR code image API used for share codes.
