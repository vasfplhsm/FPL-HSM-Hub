# Validation record

## Automated checks

The browser suite checks that the homepage contains the announcement board and no duplicate app cards/URLs. It clicks each sidebar/mobile shortcut, verifies the exact destination opens in an isolated new tab and checks that the Hub stays on its dashboard. It also checks Enter-key launching and the safe missing-link fallback. External popup requests are intercepted before they reach the original applications.

- `npm test`: configuration allowlist, unsafe URL rejection, local/fallback/malformed configuration handling, actual HTTP assets, headers, private-file denial, method restrictions, notice validation, and Firebase REST auth/write protocol using simulated responses.
- `npm run build`: generates static assets and validated public configuration in `dist/`.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs`: real Chromium checks for dashboard, Malaysia clock, all five routes, exact new resource URLs, logo/favicon, active navigation, desktop/tablet and 390px/320px mobile overflow, link attributes, missing module links, unknown pages, configuration failure/retry and malicious URL rejection. Theme checks cover light/dark switching, keyboard toggle, persistence across reload, display-only storage and following device preference for a new visitor. Does not visit external applications.

- `tests/admin-browser.cjs`: intercepted Firebase responses verify non-admin denial, admin sign-in, failed-save draft recovery, publishing, editing, confirmed deletion, read-only homepage, mobile editor layout, sign-out and memory-only session behavior.

Executed outcomes: **12 Node tests passed**, the Pages build passed, and both browser suites passed with intercepted external services. The unconfigured admin page was also checked to show setup guidance with no login or publishing form, and desktop/mobile screenshots were inspected. No Firebase config has been supplied yet, so the deployed editor must remain disconnected. Production Firebase sign-in, persistence and rule enforcement are **unverified**. The official Firestore emulator download was blocked by the environment's network policy, so emulator rule execution was not completed either. Follow the setup guide's live admin/non-admin tests after connecting a project. Tests using simulated responses do not replace these checks.

## Manual acceptance before production

GitHub Pages preparation: `npm run build:pages` passed. The Chromium suite also passed against generated static files served under `/FPL-HSM-Hub/`, including desktop and mobile layouts. This verifies project-subdirectory asset loading; it does not establish that GitHub has published the site.

The Hub is a launcher, so business functions must be checked inside each original application by an authorized staff member:

- Planner: passkey verification; multi-date submissions; duplicate and advance-date rules; cancellation; monthly/weekly dashboards; holiday sync and automation.
- MyUbat: authorized/unauthorized access; name and MRN matching; DT/PT references; Postage tracking; taken/remarks writes; copy buttons; concurrent edits.
- Catalogue: actual backend compatibility, medication search, category/quota filters, details and refresh; indication/dose accuracy and source/last-updated labels.
- Deployment: chosen host's HTTPS/access policy and response-header configuration; no attachments, credentials, source uploads or patient records in public output.

No staff passkeys, patient records, production writes, spreadsheet access or deployment changes were used during Hub validation. These application-level checks remain **unverified**.
