# Farmasi Pesakit Luar HSM Pharmacy Hub

A lightweight, responsive entry point for Farmasi Pesakit Luar, Hospital Seri Manjung. The Hub brings Planner Cuti, MyUbat reference search, Katalog Ubat, Formulari HSM and Portal Farmasi HSM into one navigation system. It uses plain HTML, CSS and JavaScript, with a small Node server for local development. No runtime packages, paid services or database migrations are required.

## What works

- Bahasa Melayu dashboard and navigation, five application/resource cards and module pages.
- The supplied FPL HSM logo appears as the favicon, touch icon and main branding; teal, aqua and deep blue themes follow its colours.
- Light/dark toggle in the header. The first visit follows the device theme; an explicit choice is remembered. Only the `fpl-hsm-theme` display preference is saved in browser storage.
- Malaysia date and clock (`Asia/Kuala_Lumpur`), desktop sidebar and mobile bottom navigation.
- Your five supplied URLs are configured in this machine's ignored `config/local.json` and in the published `docs/config.json`.
- Each configured card, sidebar link and mobile shortcut opens its original application directly in one click in a new tab; Hub remains open. No intermediate confirmation page is required. Unconfigured links still show setup guidance.
- Missing-link, configuration loading, retry, error and unknown-page states.
- Keyboard focus, skip navigation and reduced-motion support.
- No patient search forms, patient storage, analytics, backend proxy or data downloads in the Hub.

This release uses the **central launcher architecture** allowed by the project brief. It does not merge or restyle the existing application screens. Searches, filters, copy-reference buttons, leave submissions, cancellations and medication details continue to belong to those applications. A configured link means only that its URL is present, not that its server or business functions have been verified. No module authentication is inherited from the Hub.

## Run locally

1. Install Node.js 22 or newer if needed.
2. Open a terminal in this folder (`/workspace/FPL-HSM-Hub` in this cloud machine).
3. Run `npm start`. No `npm install` is needed.
4. On your own computer, open the local address and port printed by the server (default port 4173). In cloud onboarding, validation is performed internally; the interface does not provide a web preview.

Stop the server with Ctrl+C. Change the port with `PORT=4174 npm start`. It binds to your local machine by default. Use `HOST=0.0.0.0` only behind your chosen access-controlled hosting boundary.

## Configure application links

If `config/local.json` is missing, copy `config/example.json` to `config/local.json`. Keep the existing structure. In `modules`, replace each empty `url` with its approved staff-facing HTTPS application URL:

```json
"planner": { "name": "Planner Cuti FPL HSM", "url": "https://example.org/planner" }
```

Do the same for `myubat`, `katalog`, `formulary` and `farmasi`. Use the complete Planner Apps Script `/exec` URL and the staff-facing application or portal pages. Do **not** use Sheet links or JSON backend endpoints. URLs with credentials, query parameters or fragments are rejected. You can change the title, department, hospital and module names in the same file. Restart the server after editing; rebuild before deploying static output.

`local.json` is ignored by Git. The links you provided are retained there in this cloud machine. A fresh Git clone uses blank local links until you supply that file; copy the published `docs/config.json` to `config/local.json` to preserve the current links before rebuilding. No secret, patient identifier, passkey, API token or private spreadsheet ID belongs in this configuration. The title and module links are sent to browsers and appear in the build.

## Files

```text
public/index.html          Page structure
public/assets/app.js       Dashboard, module pages, navigation and states
public/assets/icons.js     Local SVG icons (no icon CDN)
public/assets/theme.js     Light/dark/system theme and display preference
public/assets/fpl-hsm-logo.png  Supplied original FPL HSM logo
public/assets/styles.css   Shared responsive design
config/example.json       Safe blank configuration template
config/local.json         Your machine's links; ignored by Git
src/config.js             Public configuration validation
src/server.js             Local server and security headers
scripts/build.js          Static build; no bundler required
tests/hub.test.js          Node configuration and HTTP tests
tests/browser.cjs          Optional browser regression checks
docs/integration.md       Inspection findings and integration boundaries
docs/validation.md        Tested capabilities and limitations
dist/                     Generated deployment files; ignored by Git
```

The supplied legacy sources remain in the original uploaded attachments outside this repository. They were inspected but not modified, deployed, or copied into public assets. Existing Sheets, Apps Script deployments, passkeys and automation are unchanged. The logo was copied unchanged from the [user-provided image](https://raw.githubusercontent.com/vasfplhsm/hsmformularyassets/refs/heads/main/ICON%20FPL%20HSM.png) into local assets; the Hub does not fetch it from GitHub at runtime.

## Google Apps Script integration

The Hub links to deployed applications. Planner remains served by its original Apps Script project, so `google.script.run` still executes in its intended environment. The Hub neither embeds the Planner nor copies its frontend into an external host. No CORS bypass is needed. The MyUbat and catalogue links open their existing hosted frontends.

Read [integration notes](docs/integration.md) before attempting deeper integration. The pasted DT, PT and Postage backends are separate Apps Script projects; do not paste them all into one project. Their repeated `doGet`, `MAX_RESULTS` and JSON helper declarations conflict. The supplied MyUbat GET APIs need a separate security review before any direct integration.

## Deployment and updates

### GitHub Pages (public launcher)

GitHub Pages serves this Hub publicly. It does not provide staff sign-in; the original applications must enforce their own authorization. Only branding and approved application links are included, with no patient records or legacy backend source.

1. Run `npm run build:pages`. This writes the Hub to `docs/index.html`, `docs/assets/`, `docs/config.json` and `docs/.nojekyll`. The generated configuration intentionally contains the application links and is public.
2. Commit and push the project to `main` on GitHub.
3. Open your repository's **Settings → Pages**.
4. Choose **Deploy from a branch**, then **main** and **/docs**, and click **Save**.
5. Wait for GitHub's Pages build to complete. The expected project address is `https://vasfplhsm.github.io/FPL-HSM-Hub/`; it is live only after GitHub confirms deployment.

For updates, rerun `npm run build:pages`, commit the generated `docs/` files along with your source changes and push again. There is no Actions workflow or package installation required for branch-based publishing. Relative asset paths and hash navigation support the repository subdirectory.

On a fresh clone, copy the already-published `docs/config.json` to ignored `config/local.json` before rebuilding if you want to retain the current approved links. Otherwise the blank example configuration will be used.

Pages ignores `dist/_headers`. The HTML therefore includes a Content Security Policy meta tag and a no-referrer policy. Header-only controls such as frame-ancestors and X-Frame-Options still require a host that lets you configure HTTP headers. Do not treat Pages as an authentication boundary or deploy confidential records there.

### Other approved hosting

1. Set approved application links in `config/local.json`.
2. Run `npm test`, then `npm run build`.
3. Review `dist/config.json`: it contains the branding and links that staff will receive.
4. Upload **only `dist/`** to your approved internal static host, or run `npm start` behind an authenticated HTTPS reverse proxy. Keep source folders, uploaded attachments and local configuration files off the public host.
5. Apply the response headers in `dist/_headers` using your host's header settings. `_headers` is supported by some static hosts; it is not automatically honored everywhere.
6. Confirm access controls with your administrator, then test each application using an authorized staff account. The Hub contains no sign-in mechanism and is not an authentication boundary. MyUbat must enforce staff authorization itself. Obtain institutional approval before production use involving patient information.

To update, edit the frontend or configuration, rerun tests and rebuild, then replace the deployed `dist/` files. The build does not deploy or alter the original applications. Prefer approved internal hosting. No patient data or legacy source should be published on GitHub Pages.

Cloud environment settings store reusable build/start instructions. Saving that draft does not deploy the Hub, execute scripts or publish an environment snapshot. After review, publish through the environment UI if you want a reusable cloud snapshot.

## Tests

`npm test` runs four built-in Node tests with no additional packages. `npm run build` checks and exports the configured Hub. For optional browser tests, install Playwright locally without changing the package declarations:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
# Leave npm start running in another terminal:
node tests/browser.cjs
```

If Chromium is already installed, set `CHROMIUM_PATH` instead of downloading a browser. In this cloud machine: `CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs`. Browser tests exercise Hub pages only; they never open live modules or submit patient/staff data.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Module is not connected | Add its approved application URL in `config/local.json`, restart, then rebuild if using static hosting. |
| Hub cannot load | Check JSON syntax, keep all five module entries and use HTTPS URLs without query strings. Press “Cuba semula” after correcting the configuration. |
| Change light/dark appearance | Use the moon/sun button in the header. Clear only the `fpl-hsm-theme` local storage key to follow device preference again. |
| Opening `index.html` directly fails | Use `npm start`; the Hub loads configuration through HTTP. |
| App asks for login/passkey | Sign in to that original application. Hub does not replace its access checks. |
| App refuses access or fails | Ask that application's administrator to inspect its deployment. A Hub link cannot fix its backend. |
| Planner's `google.script.run` fails | Use the deployed Apps Script application, not a copied local HTML file. |
| Catalogue HTML and backend disagree | See the inspected JSON/HtmlService mismatch in the integration notes. |
| Port already in use | Stop your previous process or choose another `PORT`. |

## Add another module later

No future modules are implemented. When needed, add its configuration template and identifier in `src/config.js`, then its descriptions in `public/assets/app.js` and icon in `icons.js`. Update browser expectations, mobile navigation layout and HTTP/build checks. Keep module operations in their authorized original application until a server-side integration has been explicitly designed and verified.
