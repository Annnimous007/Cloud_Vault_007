/**
 * config.js
 * ---------
 * Edit these three values to match your own GitHub repository, then commit.
 * Nothing else in the codebase needs to change to point the site at your repo.
 */
window.CLOUDVAULT_CONFIG = {
  githubOwner: "your-github-username",
  githubRepo: "your-repo-name",
  branch: "main",

  // Shown in the sidebar / page title.
  siteName: "CloudVault",
  siteTagline: "Personal file portal",

  // Soft cap used only for the sidebar storage meter (GitHub has no real quota
  // for reasonable personal use, but a visual reference helps).
  storageQuotaBytes: 1024 * 1024 * 1024, // 1 GB shown as "full"
};
