/**
 * vaultReader.js
 *
 * Optional, read-only helper for OTHER modules to read Brand Vault data.
 * This file does not write to Brand Vault's storage — only brand-vault/script.js does that.
 *
 * Usage from another module:
 *   <script src="../shared/utils/vaultReader.js"></script>
 *   const assets = window.VaultReader.getAssets();
 *   const approved = window.VaultReader.getApprovedAssets();
 *   const brand = window.VaultReader.getBrandProfile();
 *
 * See brand-vault/README.md for the full schema this reads.
 */
(function () {
  "use strict";

  var KEY_ASSETS = "tkg_vault_assets_v1";
  var KEY_BRAND  = "tkg_vault_brand_v1";

  function getAssets() {
    try {
      var raw = localStorage.getItem(KEY_ASSETS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("VaultReader: could not read assets.", e);
      return [];
    }
  }

  function getApprovedAssets() {
    return getAssets().filter(function (a) { return a.status === "Approved"; });
  }

  function getAssetsByCategory(category) {
    return getAssets().filter(function (a) { return a.category === category; });
  }

  function getBrandProfile() {
    try {
      var raw = localStorage.getItem(KEY_BRAND);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("VaultReader: could not read brand profile.", e);
      return null;
    }
  }

  window.VaultReader = {
    getAssets: getAssets,
    getApprovedAssets: getApprovedAssets,
    getAssetsByCategory: getAssetsByCategory,
    getBrandProfile: getBrandProfile
  };
})();
