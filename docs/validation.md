# Validation record

## Automated checks

The browser suite checks that the homepage contains the announcement board and no duplicate app cards/URLs. It clicks each sidebar/mobile shortcut, verifies the exact destination opens in an isolated new tab and checks that the Hub stays on its dashboard. It also checks Enter-key launching and the safe missing-link fallback. External popup requests are intercepted before they reach the original applications.

- `npm test`: configuration allowlist, unsafe URL rejection, local/fallback/malformed configuration handling, actual HTTP assets, headers, private-file denial, method restrictions, notice validation, and Firebase REST auth/write protocol using simulated responses.
- `npm run build`: generates static assets and validated public configuration in `dist/`.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs`: real Chromium checks for dashboard, Malaysia clock, all five routes, exact new resource URLs, logo/favicon, active navigation, desktop/tablet and 390px/320px mobile overflow, link attributes, missing module links, unknown pages, configuration failure/retry and malicious URL rejection. Theme checks cover light/dark switching, keyboard toggle, persistence across reload, display-only storage and following device preference for a new visitor. Does not visit external applications.

- `tests/admin-browser.cjs`: intercepted Firebase responses verify non-admin denial, admin sign-in, failed-save draft recovery, publishing, editing, confirmed deletion, read-only homepage, mobile editor layout, sign-out and memory-only session behavior.

The 23 Node tests pass, including file signature/type/size checks, metadata validation, upload/commit/share ordering, private upload retry/cancellation, lost commit response recovery, cleanup warnings and concurrency preconditions. Apps Script code also executes in a Node VM with simulated Google services to check token/role enforcement, private/idempotent uploads, reference-gated sharing/deletion and folder/notice ownership. These are not deployed Apps Script tests.

The attachment browser suite covers file-only PDF notices, upload failure/retry, local PNG preview, replacement/removal, visitor file links, mobile layout and cleanup on deletion. Firebase and Apps Script requests are intercepted; no live files or notices are created by those tests.

The viewer browser suite (`tests/attachment-viewer-browser.cjs`) checks JPG/PNG opening inside the Hub, zoom in/out, 400% limit, fit-to-screen, scrollable enlarged content, plain-text filenames, modal keyboard focus/Escape, mobile/landscape layouts, dark mode, trusted PDF embed URLs, image-to-Drive fallback and frame cleanup on close/navigation. Image bytes are real fixtures; Google responses are intercepted. Google's embedded PDF toolbar and live sharing must be checked on the deployed site. The owner reported successful uploads before this viewer update.

The owner's public Firebase configuration and supplied Apps Script `/exec` URL are now included. Read-only live Firestore and Apps Script health requests were blocked by this environment's network proxy (HTTP tunnel 403), so production Firebase sign-in, persistence, rule enforcement, browser CORS and Drive sharing remain **unverified**. This network result does not establish whether either service is working. The official Firestore emulator download was previously blocked as well. Deploy the updated Hosting files and Firestore rules, then follow the setup guides' live admin/non-admin checks; simulated services do not replace those checks.

## Manual acceptance before production

Firebase Hosting migration preparation: Firebase CLI **15.34.0** was installed in the tool cache and the Hosting emulator served the generated `dist/` using the new `firebase.json` with a demo project. The homepage, all configured HTTP security headers, private/source-file exclusion checks and both browser suites passed against the Hosting emulator. The browser admin suite still used intercepted Firebase responses. This is local Hosting validation, not a live Firebase deployment; a real project, account authorization and backend setup are still required.

GitHub Pages preparation: `npm run build:pages` passed. The Chromium suite also passed against generated static files served under `/FPL-HSM-Hub/`, including desktop and mobile layouts. This verifies project-subdirectory asset loading; it does not establish that GitHub has published the site.

The Hub is a launcher, so business functions must be checked inside each original application by an authorized staff member:

- Planner: passkey verification; multi-date submissions; duplicate and advance-date rules; cancellation; monthly/weekly dashboards; holiday sync and automation.
- MyUbat: authorized/unauthorized access; name and MRN matching; DT/PT references; Postage tracking; taken/remarks writes; copy buttons; concurrent edits.
- Catalogue: actual backend compatibility, medication search, category/quota filters, details and refresh; indication/dose accuracy and source/last-updated labels.
- Deployment: chosen host's HTTPS/access policy and response-header configuration; no attachments, credentials, source uploads or patient records in public output.

No staff passkeys, patient records, production writes, spreadsheet access or deployment changes were used during Hub validation. These application-level checks remain **unverified**.
