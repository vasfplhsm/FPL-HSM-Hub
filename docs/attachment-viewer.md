# View, zoom and rotate attachments inside the Hub

Click an announcement image or file button to open a large preview over the Hub.

- **JPG, PNG and PDF:** use **↶ / ↷** to rotate left or right in 90° steps. **Asal** resets rotation and zoom. Rotation applies only to the current preview; it does not modify the uploaded file or another visitor's view.
- Use **+**, **−** and **Muat skrin** to zoom or fit the page/image. The maximum is 400%. Scroll inside the preview to read enlarged areas. On phones the viewer fills the screen.
- **PDF:** use **‹ / ›** to change pages. The Hub renders one page at a time using locally bundled Mozilla PDF.js. It rotates the page content, keeping the toolbar upright. Rotation is retained while changing pages and resets when closing/reopening the file.
- Choose **Tutup** or press Escape to return. **Muat turun** and **Buka di Google Drive** remain available.

PDF previews are rendered to canvas. Document scripts, interactive forms, links and annotation controls are not enabled. For text selection, screen-reader document access, password-protected documents or advanced PDF features, use **Buka di Google Drive** or download the file into your preferred PDF reader. Rendering limits each canvas to eight million pixels to control memory use on phones.

If image thumbnails or interactive PDF rendering are unavailable, the Hub falls back to an embedded Drive preview. The Hub cannot rotate the contents of that cross-origin fallback. Published files must retain public view-only sharing and stay in the dedicated Hub folder.

## Update your existing folder and keep its configuration

The [Viewer Update ZIP](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Viewer-Update.zip) includes the updated `public/`, `src/`, `tests/`, `apps-script/` and `firebase.json`, plus installation notes. It contains **no `config/` folder** and does not replace your custom `config/local.json` or application links.

1. Keep a backup of your current Hub folder.
2. Extract the update ZIP. Copy `public/`, `src/`, `tests/`, `apps-script/` and `firebase.json` into your existing Hub folder, replacing matching files. Keep the complete `public/assets/vendor/pdfjs/` directory together with its licenses. Leave your `config/` folder in place.
3. Update your **existing FPL HSM Hub Uploads** Apps Script project with the complete updated [DriveUploads.gs](../apps-script/DriveUploads.gs). Keep the existing script properties and upload folder. Do not create a new project or folder.
4. Choose **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**. Keep the same web-app deployment and `/exec` URL. Execute as the folder owner; access remains **Anyone**. Upload and file-management operations still require Firebase admin authorization. The new `readPdf` operation serves only currently published, publicly shared PDFs in the dedicated Hub folder.
5. Open Terminal or PowerShell in your existing Hub folder and run:

```sh
npm run build
firebase deploy --only hosting --project fpl-hsm-pharmacy-hub
```

The existing Firestore rules still apply. Previously uploaded files do not need uploading again. No new Firebase project, `firebase init`, npm dependency installation, Storage service or billing upgrade is needed. If the script has not been updated, images can rotate and PDFs fall back to the previous Drive preview without Hub rotation controls.

The full Desktop ZIP remains available for a fresh installation. Its configuration is the supplied baseline; preserve your newer local changes if you choose that package instead of the update ZIP.

## Published PDF access

The browser makes an anonymous `text/plain` POST to the configured Apps Script URL with the announcement ID and file ID. The script performs a **public** Firestore read without using the owner's credentials. Before reading file bytes, it requires the current announcement's PDF metadata to match the file ID and size, the file's marker to match the project and notice, membership in the dedicated Hub folder, and public view-only sharing. Draft, private, trashed, removed or unrelated files are rejected. PDF data stays in the current browser session and is released when the preview closes; it is not persisted in local storage or Firestore.

This is an additional read workload within Apps Script quotas. Files remain in Drive and Firebase stays on Spark. The owner confirmed uploads worked before these viewer updates; the updated PDF read endpoint still requires a live check after deploying its new version.

## Verification

Check JPG, PNG and a multi-page PDF on the deployed site and in a private/incognito session. Verify left/right rotation, reset, zoom, scrolling, page navigation and phone layout. Local Chromium tests use real image bytes and a real three-page PDF rendered by the actual bundled PDF.js worker. They check rotated page pixels, not a simulated PDF toolbar. Firebase/Apps Script responses are intercepted, and authorization/ownership checks run against the actual Apps Script source using mocked Google services. These checks do not establish that your live Google deployment, CORS or sharing policies work.
