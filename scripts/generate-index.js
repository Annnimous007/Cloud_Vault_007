#!/usr/bin/env node
/**
 * generate-index.js
 * ------------------
 * Walks the /uploads directory, reads every file's metadata, and writes a
 * single JSON index at /data/files.json. The website's frontend reads that
 * JSON file to render the dashboard — nothing on the page is hand-edited.
 *
 * Run automatically by .github/workflows/build-index.yml on every push that
 * touches /uploads. Can also be run locally with: node scripts/generate-index.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const OUTPUT_FILE = path.join(ROOT, 'data', 'files.json');

// Maps a file extension to one of the six dashboard categories.
const CATEGORY_MAP = {
  documents: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'csv'],
  images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'],
  videos: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  // spreadsheets & slide decks are grouped visually but still tracked as "documents"
  spreadsheets: ['xls', 'xlsx', 'ppt', 'pptx'],
};

function categoryFor(ext) {
  for (const [category, exts] of Object.entries(CATEGORY_MAP)) {
    if (exts.includes(ext)) {
      return category === 'spreadsheets' ? 'documents' : category;
    }
  }
  return 'others';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Uses the git history to find when a file was first committed, so upload
// dates stay accurate even though the working copy's mtime changes on checkout.
function firstCommitDate(relativePath) {
  try {
    const out = execSync(
      `git log --diff-filter=A --follow --format=%aI -- "${relativePath}" | tail -1`,
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
    if (out) return out;
  } catch (e) {
    // git not available or file not yet committed — fall back below
  }
  return null;
}

function sha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    if (entry.name === '.gitkeep' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function buildIndex() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('No uploads/ directory found.');
    process.exit(1);
  }

  const allFiles = walk(UPLOADS_DIR);
  const files = allFiles.map(({ fullPath, relPath }) => {
    const stat = fs.statSync(fullPath);
    const ext = path.extname(relPath).slice(1).toLowerCase();
    const name = path.basename(relPath);
    const topFolder = relPath.split(path.sep)[0];
    const validCategories = ['documents', 'images', 'videos', 'audio', 'archives', 'others'];
    const category = validCategories.includes(topFolder) ? topFolder : categoryFor(ext);
    const uploadedAt = firstCommitDate(path.join('uploads', relPath)) || stat.mtime.toISOString();
    const posixPath = ['uploads', relPath].join('/').split(path.sep).join('/');

    return {
      id: posixPath.replace(/^uploads\//, ''),
      name,
      category,
      ext,
      size: stat.size,
      sizeLabel: formatBytes(stat.size),
      uploadedAt,
      path: posixPath,
      url: posixPath,
      hash: sha256(fullPath),
      tags: [],
    };
  });

  files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  const index = {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    files,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`Indexed ${files.length} file(s) -> ${path.relative(ROOT, OUTPUT_FILE)}`);
}

buildIndex();
