# View and zoom attachments inside the Hub

Click the image or file button on an announcement to open a large preview over the Hub. The homepage stays open underneath.

- **JPG and PNG:** use **+**, **−** and **Muat skrin**. The percentage shows image scale; the maximum is 400%. Scroll inside the preview to read enlarged areas. On phones the viewer fills the screen.
- **PDF:** the document opens in an embedded Google Drive viewer. Use the zoom and page controls inside that preview. These are Google's controls; the Hub does not attempt to control a cross-origin PDF frame.
- Choose **Tutup** or press Escape to return. **Muat turun** and **Buka di Google Drive** are available as optional fallbacks.

If a Drive thumbnail is unavailable, images also fall back to the embedded Drive viewer. Google controls and availability can vary by browser, file conversion status and account policy. If a preview is blank or requests access, check the file's public view-only sharing and use the fallback link. PDF content is rendered by Google, not downloaded into the Hub's own renderer.

## Update your existing Desktop folder and keep its configuration

The [Viewer Update ZIP](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Viewer-Update.zip) contains the updated `public/`, `src/`, `tests/` and `firebase.json`, plus installation notes. It contains **no `config/` folder**, so it does not replace `config/local.json` or your custom application links.

1. Keep a backup of your existing folder.
2. Extract the update ZIP. Copy its `public/`, `src/`, `tests/` and `firebase.json` into your existing Hub folder, replacing matching files. The update includes both source files in `src/`; it is safe to replace that folder as a whole. Leave your existing `config/` folder in place.
3. Open Terminal or PowerShell in your existing Hub folder and run:

```sh
npm run build
firebase deploy --only hosting --project fpl-hsm-pharmacy-hub
```

This viewer update needs Hosting only. The previously deployed upload script and Firestore rules still apply. Existing announcement files work without uploading them again. No new Firebase project, script deployment, dependency installation or billing upgrade is needed.

The full Desktop ZIP remains available for a fresh installation. Its bundled configuration is the supplied baseline; merge any newer local changes if you choose that package instead of the update ZIP.

## Verification

Check a JPG, PNG and PDF on the deployed site, including a private/incognito session. Confirm image zoom/fit/scrolling, PDF zoom/page controls, mobile layout and closing back to the Hub. Local Chromium tests cover Hub-owned behavior with intercepted Google responses. They verify the PDF frame URL and lifecycle but cannot establish that Google's live viewer toolbar works on each browser. The owner confirmed uploads work before this viewer update; the new embedded PDF preview still needs a live check after deployment.
