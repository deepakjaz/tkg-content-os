(function () {
  "use strict";

  /* =========================================================
     STORAGE KEYS — this is the public data contract.
     Other modules may READ these keys. Only this file WRITES them.
     See README.md for the documented schema.
     ========================================================= */
  var KEY_ASSETS = "tkg_vault_assets_v1";
  var KEY_BRAND  = "tkg_vault_brand_v1";

  var CATEGORIES = ["Logo", "Product", "Menu Item", "Packaging", "Background", "QR Code", "Stall Photo", "Icon", "Other"];

  /* =========================================================
     STATE
     ========================================================= */
  var state = {
    assets: [],
    brand: null,
    editingAssetId: null,   // null = creating new
    filters: { search: "", category: "", status: "" }
  };

  /* =========================================================
     PERSISTENCE
     ========================================================= */
  function loadAssets() {
    try {
      var raw = localStorage.getItem(KEY_ASSETS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Brand Vault: failed to parse assets, starting fresh.", e);
      return [];
    }
  }

  function saveAssets() {
    localStorage.setItem(KEY_ASSETS, JSON.stringify(state.assets));
  }

  function loadBrand() {
    try {
      var raw = localStorage.getItem(KEY_BRAND);
      return raw ? JSON.parse(raw) : defaultBrandProfile();
    } catch (e) {
      console.error("Brand Vault: failed to parse brand profile, using default.", e);
      return defaultBrandProfile();
    }
  }

  function saveBrand() {
    state.brand.lastUpdated = new Date().toISOString();
    localStorage.setItem(KEY_BRAND, JSON.stringify(state.brand));
  }

  function defaultBrandProfile() {
    return {
      brand: "TKG",
      colors: [
        { name: "Charcoal", hex: "#161513" },
        { name: "Ember", hex: "#FF5722" },
        { name: "Gold", hex: "#D4AF37" },
        { name: "Marble", hex: "#F2EFE9" }
      ],
      typography: { display: "", body: "" },
      voice: "",
      lastUpdated: new Date().toISOString()
    };
  }

  function makeAssetId() {
    return "ast_" + Math.random().toString(36).slice(2, 8);
  }

  /* =========================================================
     DOM REFS
     ========================================================= */
  var el = {
    swatchRow: document.getElementById("swatch-row"),
    typographyDisplay: document.getElementById("typography-display"),
    voiceDisplay: document.getElementById("voice-display"),
    brandProfileView: document.getElementById("brand-profile-view"),
    brandForm: document.getElementById("brand-form"),
    brandFormColors: document.getElementById("brand-form-colors"),
    btnEditBrand: document.getElementById("btn-edit-brand"),
    btnAddColor: document.getElementById("btn-add-color"),
    btnCancelBrand: document.getElementById("btn-cancel-brand"),
    inputDisplayFont: document.getElementById("input-display-font"),
    inputBodyFont: document.getElementById("input-body-font"),
    inputVoice: document.getElementById("input-voice"),

    searchInput: document.getElementById("search-input"),
    filterCategory: document.getElementById("filter-category"),
    filterStatus: document.getElementById("filter-status"),
    assetGrid: document.getElementById("asset-grid"),
    emptyState: document.getElementById("empty-state"),
    btnNewAsset: document.getElementById("btn-new-asset"),
    btnEmptyNew: document.getElementById("btn-empty-new"),

    modalBackdrop: document.getElementById("modal-backdrop"),
    modalTitle: document.getElementById("modal-title"),
    assetForm: document.getElementById("asset-form"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCancelAsset: document.getElementById("btn-cancel-asset"),
    btnDeleteAsset: document.getElementById("btn-delete-asset"),

    fName: document.getElementById("f-name"),
    fCategory: document.getElementById("f-category"),
    fStatus: document.getElementById("f-status"),
    fTags: document.getElementById("f-tags"),
    fDescription: document.getElementById("f-description"),
    fSource: document.getElementById("f-source"),
    fVersion: document.getElementById("f-version"),
    fReference: document.getElementById("f-reference"),
    referenceHint: document.getElementById("reference-hint"),

    toast: document.getElementById("toast")
  };

  /* =========================================================
     TOAST
     ========================================================= */
  var toastTimer = null;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2200);
  }

  /* =========================================================
     BRAND PROFILE — render + edit
     ========================================================= */
  function renderBrandProfile() {
    el.swatchRow.innerHTML = "";
    (state.brand.colors || []).forEach(function (c) {
      var s = document.createElement("div");
      s.className = "swatch";
      var chip = document.createElement("div");
      chip.className = "swatch__chip";
      chip.style.background = c.hex;
      var label = document.createElement("span");
      label.className = "swatch__label";
      label.textContent = (c.name || "—") + " " + c.hex;
      s.appendChild(chip);
      s.appendChild(label);
      el.swatchRow.appendChild(s);
    });
    if (!state.brand.colors || state.brand.colors.length === 0) {
      el.swatchRow.innerHTML = '<span class="brand-profile__value" style="color:var(--text-dim)">No colors set</span>';
    }

    var disp = state.brand.typography && state.brand.typography.display;
    var body = state.brand.typography && state.brand.typography.body;
    if (disp || body) {
      el.typographyDisplay.textContent = [disp, body].filter(Boolean).join(" / ");
    } else {
      el.typographyDisplay.textContent = "—";
    }

    el.voiceDisplay.textContent = state.brand.voice || "—";
  }

  function openBrandForm() {
    el.brandFormColors.innerHTML = "";
    (state.brand.colors || []).forEach(function (c) { addColorRow(c.name, c.hex); });
    el.inputDisplayFont.value = (state.brand.typography && state.brand.typography.display) || "";
    el.inputBodyFont.value = (state.brand.typography && state.brand.typography.body) || "";
    el.inputVoice.value = state.brand.voice || "";

    el.brandProfileView.hidden = true;
    el.brandForm.hidden = false;
  }

  function closeBrandForm() {
    el.brandForm.hidden = true;
    el.brandProfileView.hidden = false;
  }

  function addColorRow(name, hex) {
    var row = document.createElement("div");
    row.className = "color-row";

    var colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = hex || "#FF5722";

    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "field-input";
    nameInput.placeholder = "Color name";
    nameInput.value = name || "";

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "color-row__remove";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove color");
    removeBtn.addEventListener("click", function () { row.remove(); });

    row.appendChild(colorInput);
    row.appendChild(nameInput);
    row.appendChild(removeBtn);
    el.brandFormColors.appendChild(row);
  }

  function collectColorsFromForm() {
    var rows = el.brandFormColors.querySelectorAll(".color-row");
    var colors = [];
    rows.forEach(function (row) {
      var hex = row.querySelector('input[type="color"]').value;
      var name = row.querySelector('input[type="text"]').value.trim();
      colors.push({ name: name || "Untitled", hex: hex });
    });
    return colors;
  }

  el.btnEditBrand.addEventListener("click", openBrandForm);
  el.btnAddColor.addEventListener("click", function () { addColorRow("", "#FF5722"); });
  el.btnCancelBrand.addEventListener("click", closeBrandForm);

  el.brandForm.addEventListener("submit", function (e) {
    e.preventDefault();
    state.brand.colors = collectColorsFromForm();
    state.brand.typography = {
      display: el.inputDisplayFont.value.trim(),
      body: el.inputBodyFont.value.trim()
    };
    state.brand.voice = el.inputVoice.value.trim();
    saveBrand();
    renderBrandProfile();
    closeBrandForm();
    showToast("Brand profile saved");
  });

  /* =========================================================
     ASSET GRID — filtering + render
     ========================================================= */
  function populateCategoryFilter() {
    CATEGORIES.forEach(function (cat) {
      var opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      el.filterCategory.appendChild(opt);
    });
  }

  function getFilteredAssets() {
    var q = state.filters.search.trim().toLowerCase();
    return state.assets.filter(function (a) {
      if (state.filters.category && a.category !== state.filters.category) return false;
      if (state.filters.status && a.status !== state.filters.status) return false;
      if (q) {
        var haystack = [a.name, a.description, (a.tags || []).join(" ")].join(" ").toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function statusStampClass(status) {
    if (status === "Approved") return "asset-card__stamp--approved";
    if (status === "Archived") return "asset-card__stamp--archived";
    return "asset-card__stamp--draft";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "numeric" });
  }

  function renderAssetGrid() {
    var list = getFilteredAssets();
    el.assetGrid.innerHTML = "";

    if (state.assets.length === 0) {
      el.emptyState.hidden = false;
      el.assetGrid.hidden = true;
      return;
    }
    el.emptyState.hidden = true;
    el.assetGrid.hidden = false;

    list.forEach(function (asset) {
      var card = document.createElement("div");
      card.className = "asset-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.addEventListener("click", function () { openAssetForm(asset.assetId); });
      card.addEventListener("keypress", function (e) {
        if (e.key === "Enter") openAssetForm(asset.assetId);
      });

      var stamp = document.createElement("div");
      stamp.className = "asset-card__stamp " + statusStampClass(asset.status);
      stamp.textContent = (asset.version || "v1") + " · " + asset.status.slice(0, 3).toUpperCase();
      card.appendChild(stamp);

      var category = document.createElement("div");
      category.className = "asset-card__category";
      category.textContent = asset.category;
      card.appendChild(category);

      var name = document.createElement("div");
      name.className = "asset-card__name";
      name.textContent = asset.name;
      card.appendChild(name);

      if (asset.tags && asset.tags.length) {
        var tagsWrap = document.createElement("div");
        tagsWrap.className = "asset-card__tags";
        asset.tags.slice(0, 4).forEach(function (t) {
          var tag = document.createElement("span");
          tag.className = "asset-card__tag";
          tag.textContent = t;
          tagsWrap.appendChild(tag);
        });
        card.appendChild(tagsWrap);
      }

      var footer = document.createElement("div");
      footer.className = "asset-card__footer";
      var src = document.createElement("span");
      src.textContent = asset.source;
      var date = document.createElement("span");
      date.textContent = formatDate(asset.lastUpdated);
      footer.appendChild(src);
      footer.appendChild(date);
      card.appendChild(footer);

      el.assetGrid.appendChild(card);
    });
  }

  /* =========================================================
     ASSET MODAL — create / edit / delete
     ========================================================= */
  function referenceHintFor(source) {
    switch (source) {
      case "github": return "repo-relative path";
      case "gdrive":
      case "canva":
      case "url": return "paste the link";
      default: return "where the real file lives";
    }
  }

  el.fSource.addEventListener("change", function () {
    el.referenceHint.textContent = referenceHintFor(el.fSource.value);
  });

  function openAssetForm(assetId) {
    state.editingAssetId = assetId || null;

    if (assetId) {
      var asset = state.assets.find(function (a) { return a.assetId === assetId; });
      if (!asset) return;
      el.modalTitle.textContent = "Edit Asset";
      el.fName.value = asset.name;
      el.fCategory.value = asset.category;
      el.fStatus.value = asset.status;
      el.fTags.value = (asset.tags || []).join(", ");
      el.fDescription.value = asset.description || "";
      el.fSource.value = asset.source;
      el.fVersion.value = asset.version || "";
      el.fReference.value = asset.reference || "";
      el.btnDeleteAsset.hidden = false;
    } else {
      el.modalTitle.textContent = "New Asset";
      el.assetForm.reset();
      el.fStatus.value = "Draft";
      el.fSource.value = "upload";
      el.fVersion.value = "v1";
      el.btnDeleteAsset.hidden = true;
    }

    el.referenceHint.textContent = referenceHintFor(el.fSource.value);
    el.modalBackdrop.hidden = false;
  }

  function closeAssetForm() {
    el.modalBackdrop.hidden = true;
    state.editingAssetId = null;
  }

  el.btnNewAsset.addEventListener("click", function () { openAssetForm(null); });
  el.btnEmptyNew.addEventListener("click", function () { openAssetForm(null); });
  el.btnCloseModal.addEventListener("click", closeAssetForm);
  el.btnCancelAsset.addEventListener("click", closeAssetForm);
  el.modalBackdrop.addEventListener("click", function (e) {
    if (e.target === el.modalBackdrop) closeAssetForm();
  });

  el.assetForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var tags = el.fTags.value.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var now = new Date().toISOString();

    if (state.editingAssetId) {
      var asset = state.assets.find(function (a) { return a.assetId === state.editingAssetId; });
      asset.name = el.fName.value.trim();
      asset.category = el.fCategory.value;
      asset.status = el.fStatus.value;
      asset.tags = tags;
      asset.description = el.fDescription.value.trim();
      asset.source = el.fSource.value;
      asset.version = el.fVersion.value.trim() || "v1";
      asset.reference = el.fReference.value.trim();
      asset.lastUpdated = now;
      showToast("Asset updated");
    } else {
      state.assets.push({
        assetId: makeAssetId(),
        name: el.fName.value.trim(),
        category: el.fCategory.value,
        status: el.fStatus.value,
        tags: tags,
        description: el.fDescription.value.trim(),
        brand: state.brand.brand || "TKG",
        version: el.fVersion.value.trim() || "v1",
        lastUpdated: now,
        source: el.fSource.value,
        reference: el.fReference.value.trim()
      });
      showToast("Asset added");
    }

    saveAssets();
    renderAssetGrid();
    closeAssetForm();
  });

  el.btnDeleteAsset.addEventListener("click", function () {
    if (!state.editingAssetId) return;
    if (!confirm("Delete this asset? This can't be undone.")) return;
    state.assets = state.assets.filter(function (a) { return a.assetId !== state.editingAssetId; });
    saveAssets();
    renderAssetGrid();
    closeAssetForm();
    showToast("Asset deleted");
  });

  /* =========================================================
     FILTER BAR EVENTS
     ========================================================= */
  el.searchInput.addEventListener("input", function () {
    state.filters.search = el.searchInput.value;
    renderAssetGrid();
  });
  el.filterCategory.addEventListener("change", function () {
    state.filters.category = el.filterCategory.value;
    renderAssetGrid();
  });
  el.filterStatus.addEventListener("change", function () {
    state.filters.status = el.filterStatus.value;
    renderAssetGrid();
  });

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    state.assets = loadAssets();
    state.brand = loadBrand();
    populateCategoryFilter();
    renderBrandProfile();
    renderAssetGrid();
  }

  init();
})();
