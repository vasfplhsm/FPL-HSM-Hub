# Inspection and integration decision

The Hub now also launches the user-supplied **Formulari HSM** (`https://hsm-formulary.web.app/`) and **Portal Farmasi HSM** (`https://farmasihsm.my.canva.site/ver2026/`). These are external resource links, not new backend integrations. Their content and authentication remain with the original sites; no live content or clinical data was imported or verified.

The initial checkout had no commits or files. Six uploaded files supplied the brief, Planner backend/frontend, MyUbat frontend, catalogue JSON backend and catalogue frontend. Additional DT, PT and Postage backends were provided in chat. Uploads remain untouched outside the checkout; they are not served by the Hub.

## Interfaces inspected

| Module | Confirmed source interface | Decision |
| --- | --- | --- |
| Planner | HtmlService `doGet()` serves `index`; frontend uses `google.script.run`. Server exposes `submitMultipleDatesWeb`, `cancelMultipleDatesWeb`, `getStaffLeaves`, staff/passkey management and automation functions. | Open existing Apps Script application. Preserve project, passkeys, concurrency locks, duplicate/advance-booking checks, monthly/weekly sheets and scheduled tasks. No writes or trigger changes made. |
| MyUbat DT | Name B, MRN C, rows 5 onward; remarks D; reference prefix E + run F + suffix G; taken H. `search`, `setTaken`, `setRemarks` through GET. | Open approved existing MyUbat frontend. No direct API requests from Hub. |
| MyUbat PT | Same name/MRN/remarks/taken fields; reference PT code E + day F + run G. Same GET actions. | Same boundary as DT. |
| Postage | Name A, MRN B, rows 2 onward; date D, remarks E, duration F, dispensed I, tracking J. Skips `guide` and `data utama`. `search`, `setRemarks`, `ping`. Uses lock on remarks writes. | Keep separate original backend. |
| Catalogue | Backend reads medication B through L: name, location, pharmacology, category, quota, preparation, indication, dosage, prescriber category, department, brand. JSON actions `medications`, `franklist`, `franksearch`, `lastUpdated`, `all`. Frontend instead calls `google.script.run` methods. | Open supplied hosted catalogue. Do not assume the pasted frontend and backend are a matched deployment. |

MyUbat searches normalize whitespace, permit numeric MRN fragments of any nonempty length, require three characters for nonnumeric queries, and use one partial-match spreadsheet TextFinder filtered to relevant columns and rows. They cap matching cells at 40 before row deduplication. DT/PT reverse the results; Postage does not. These are source observations, not live validation. No matching rules were rewritten or run against real records.

The catalogue frontend supports local medication filtering, detailed cards and separate Frank Shann lookup; its dose data comes from the backend. The Hub does not copy or generate any medication information. The brief's older B–I schema is a subset of the supplied B–L implementation; no live sheet structure was verified.

## Why a launcher

1. A common dashboard and module landing pages work without modifying existing systems.
2. Existing authentication remains in each application's original origin. Launching avoids iframe restrictions and login issues. No ALLOWALL change or authentication relaxation is required.
3. Moving Planner HTML to static hosting would break `google.script.run`.
4. Catalogue's supplied JSON backend and Apps Script frontend are not directly compatible as pasted. A hosted version may already differ; it has not been fetched or authenticated here.
5. Patient search must not be connected through an unverified public API.

No React, Firebase SDK, Supabase, remote fonts or analytics were introduced. The existing Firebase-hosted **links** are reused; the Hub itself does not add a Firebase service or cost.

## Security boundaries and next integration gate

The homepage now displays announcements rather than duplicate app cards. A separate **Pentadbir** route uses email/password Firebase Authentication and Firestore for creating/editing/deleting notices. The public project ID and web API key are configuration identifiers, not authorization. Only the server-side rules in `firebase/firestore.rules` grant write access via protected admin-role documents. Local JSON is a read-only fallback while Firebase is unconfigured; it is not the chosen publishing workflow. Admin ID/refresh tokens stay in memory. Firebase configuration and deployed rule behavior still require the user's setup and live validation.

The pasted MyUbat handler code shows no authorization check before reading or writing. Search identifiers and remarks are transported in URL query strings, and mutations use GET. Concatenating those scripts also creates duplicate handler/constant definitions. These issues must be resolved in a separate backend change before implementing a unified patient search UI. The Hub does not call, redeploy, or alter them, and does not assert the current hosted apps lack additional protection.

For deeper integration, first verify institutional approval and server-enforced staff identity/authorization on each data operation. Use a defined authenticated request protocol that keeps patient identifiers out of URLs and avoids browser persistence or sensitive logs. Verify deployment permissions, origin restrictions, request forgery protection, input validation and concurrent updates using authorized testing. Keep Sheets schemas and matching/reference algorithms unchanged unless separately approved. Then add a small server-side adapter and test actual access denial, search results and writes in an authorized test environment.

Do not deploy the pasted “Anyone” patient-data endpoints as a workaround. A hidden link, Planner passkey or Hub card does not authorize MyUbat operations. A future unified Hub requires a real identity boundary; this launcher makes no logged-in-user claim.

Application URLs supplied by the user are stored only in ignored local configuration and generated deployment output. They are visible to users when launching an application; never put credentials or patient identifiers in those URLs. The local HTTP server uses an explicit file allowlist so `/attachments`, source files, `.git` and local configuration are not served.
