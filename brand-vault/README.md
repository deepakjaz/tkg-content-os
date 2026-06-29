# Brand Vault

Single source of truth for a brand's identity: assets (logos, photos, menu items, icons, etc.) and core brand facts (colors, typography, voice).

This module is **standalone**. It does not import code from any other module. Other modules may *read* its data via the contract below, but only Brand Vault writes to it.

---

## Status: V1

Run it by opening `index.html` directly — no build step, no server, no dependencies.

---

## Data Contract (for other modules to read)

Brand Vault owns two `localStorage` keys. Treat both as **read-only** from outside this module.

### `tkg_vault_assets_v1`

A JSON array of Asset records:

```json
{
  "assetId":     "string, e.g. ast_7f3a2c",
  "name":        "string",
  "category":    "Logo | Product | Menu Item | Packaging | Background | QR Code | Stall Photo | Icon | Other",
  "tags":        ["string", "..."],
  "description": "string",
  "status":      "Approved | Draft | Archived",
  "brand":       "string, e.g. TKG",
  "version":     "string, e.g. v1, v2",
  "lastUpdated": "ISO 8601 timestamp",
  "source":      "upload | github | gdrive | canva | url | local",
  "reference":   "string \u2014 meaning depends on source (see below)"
}
```

**`reference` field by source:**
- `upload` / `local` \u2014 a note describing where the real file lives (e.g. "Deepak's phone, WhatsApp backup")
- `github` \u2014 a repo-relative path, e.g. `brand-vault/assets/logo-main.png`
- `gdrive` / `canva` / `url` \u2014 a direct link

Brand Vault does **not** guarantee the file behind `reference` is fetchable in-browser. It is a pointer, not a storage guarantee. Modules consuming this data should treat `reference` as "where a human or a future integration would go to get the real file," not as an `<img src>` that always resolves.

### `tkg_vault_brand_v1`

A single JSON object of brand-level facts (not assets \u2014 no file reference):

```json
{
  "brand":      "string, e.g. TKG",
  "colors":     [{ "name": "string", "hex": "string" }, "..."],
  "typography": { "display": "string", "body": "string" },
  "voice":      "string \u2014 free text describing tone/voice rules",
  "lastUpdated": "ISO 8601 timestamp"
}
```

---

## Reading this data from another module (optional helper)

```js
// shared/utils/vaultReader.js exposes:
function getVaultAssets() {
  try { return JSON.parse(localStorage.getItem('tkg_vault_assets_v1')) || []; }
  catch { return []; }
}
function getVaultBrandProfile() {
  try { return JSON.parse(localStorage.getItem('tkg_vault_brand_v1')) || null; }
  catch { return null; }
}
```

Any module is free to read these keys directly without the helper \u2014 it's just a convenience wrapper, not a required dependency.

---

## What's NOT in V1

- No real file upload/storage (by design \u2014 see architecture note below)
- No multi-brand switching UI (the `brand` field exists on every record for future use, but V1 assumes a single active brand: TKG)
- No image preview rendering (a `url`-sourced asset *could* be previewed, but V1 doesn't attempt this yet)
- No sync to GitHub/Drive/Canva \u2014 `source` and `reference` are metadata only, not live integrations

## Architecture Note

Brand Vault is intentionally **storage-agnostic**. It catalogs *what exists and where to find it*, not the bytes themselves. This is a deliberate choice, not a limitation to fix later: a static, no-backend PWA cannot reliably store real binary files, and pretending otherwise would create a fragile system. The asset model is built so a future cloud-storage integration only needs to change what `reference` resolves to \u2014 not the schema itself.
