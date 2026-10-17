# Validation record

## Automated checks

- `npm test`: configuration allowlist, unsafe URL rejection, local/fallback/malformed configuration handling, actual HTTP assets, headers, private-file denial and method restrictions.
- `npm run build`: generates static assets and validated public configuration in `dist/`.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs`: real Chromium checks for dashboard, Malaysia clock, all routes, active navigation, desktop and 390px/320px mobile overflow, link attributes, missing module links, unknown pages, configuration failure/retry and malicious URL rejection. Does not visit external applications.

Executed in the onboarding machine: all **4 Node tests passed**, the build passed, and the Chromium browser checks passed. Desktop and mobile screenshots were also visually inspected. Chromium was already installed at `/usr/bin/chromium`; a separate Playwright browser download was blocked by network policy and was not needed. None of these tests establishes live module availability or authorization.

## Manual acceptance before production

GitHub Pages preparation: `npm run build:pages` passed. The Chromium suite also passed against generated static files served under `/FPL-HSM-Hub/`, including desktop and mobile layouts. This verifies project-subdirectory asset loading; it does not establish that GitHub has published the site.

The Hub is a launcher, so business functions must be checked inside each original application by an authorized staff member:

- Planner: passkey verification; multi-date submissions; duplicate and advance-date rules; cancellation; monthly/weekly dashboards; holiday sync and automation.
- MyUbat: authorized/unauthorized access; name and MRN matching; DT/PT references; Postage tracking; taken/remarks writes; copy buttons; concurrent edits.
- Catalogue: actual backend compatibility, medication search, category/quota filters, details and refresh; indication/dose accuracy and source/last-updated labels.
- Deployment: chosen host's HTTPS/access policy and response-header configuration; no attachments, credentials, source uploads or patient records in public output.

No staff passkeys, patient records, production writes, spreadsheet access or deployment changes were used during Hub validation. These application-level checks remain **unverified**.
