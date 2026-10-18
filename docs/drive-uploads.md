# JPG, PNG and PDF uploads while keeping Firebase Spark

Files are stored in your Google Drive through a dedicated Apps Script web app. Firebase Authentication and Firestore remain on Spark. This does **not** use Firebase Storage or require enabling Blaze. Google Drive capacity and Apps Script free quotas still apply.

Admins can attach **one JPG, PNG or PDF, up to 5 MB**, to each announcement. A title is required; text is optional when a file is attached. Visitors click the image or file button to open its preview inside the Hub. Images have zoom-in/out and fit-to-screen controls; PDFs use the embedded Drive viewer's zoom/page controls. Published files are shared as **anyone with the link, view only**. They must be suitable for the public announcement board.

**Current setup:** the owner's supplied Apps Script `/exec` URL is already configured in the public build and Desktop ZIP. If you completed script setup, proceed to step 3 to deploy the updated website and Firestore rules. The live service has not been verified here; its health request was blocked by this environment's network proxy.

## 1. Create the dedicated upload script

1. Sign in to the Google account that will own the announcement files.
2. Open [script.google.com](https://script.google.com/) and create a **New project** named “FPL HSM Hub Uploads”. Keep it separate from your Planner and existing spreadsheet scripts.
3. Replace the starter code with the complete [apps-script/DriveUploads.gs](../apps-script/DriveUploads.gs) file from this project. Save it.
4. Open **Project Settings → Script properties → Add script property** and set:

| Property | Value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `fpl-hsm-pharmacy-hub` |
| `FIREBASE_WEB_API_KEY` | The public `apiKey` from your Firebase web configuration |

5. In the script editor, select **setupUploadFolder** from the function list and click **Run**. Approve the Drive and external-request permissions for your own project. This creates a private “FPL HSM Hub - Lampiran” folder and sets `UPLOAD_FOLDER_ID` automatically.
6. Keep this folder private. The service shares individual files only after confirming the announcement references them. Do not move unrelated documents into this folder.

The script uses Drive access to manage the dedicated folder. Every upload, publish and delete request first verifies the Firebase ID token with Google's authentication service and checks the account's enabled admin role in Firestore. Client-supplied user IDs or hidden buttons are not trusted. The script checks file size, MIME type, extension and file signature before saving.

## 2. Deploy the upload web app

1. Choose **Deploy → New deployment → Web app**.
2. Set **Execute as: Me** (the Drive folder owner).
3. Set access to **Anyone**, so the Hub can send requests without a second Google login. This exposes the endpoint, but its server-side Firebase checks still reject unauthorized upload/manage requests. The public `doGet` only returns a service status.
4. Deploy, then copy the **Web app URL ending in `/exec`**.
5. Provide that URL in this chat, or add it to the existing `firebase` block in `config/local.json`:

```json
"firebase": {
  "projectId": "fpl-hsm-pharmacy-hub",
  "apiKey": "YOUR_EXISTING_PUBLIC_WEB_API_KEY",
  "driveUploadUrl": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
},
"modules": {
```

This is a fragment: preserve your existing module entries and closing braces. Use the deployed `/exec` URL, not the editor or `/dev` URL. If your organization's policies do not allow this web-app access setting or public view-only Drive links, the integration cannot operate as designed; ask the Google Workspace administrator about those restrictions.

For later script updates, use **Deploy → Manage deployments → Edit → New version → Deploy** to retain the same URL.

## 3. Update the Firestore rules and website

The updated rule file permits validated Drive attachment metadata. It still restricts all announcement writes to enabled admins. In your dedicated Hub project, publish the complete updated `firebase/firestore.rules` through Firebase Console, or run:

```sh
npm test
npm run build
firebase deploy --only "hosting,firestore:rules" --project fpl-hsm-pharmacy-hub
```

If using the updated Desktop ZIP, its public Firebase project configuration and supplied upload URL are included. Preserve any newer local settings you have made. Do not run `firebase init`, enable Firebase Storage, or put an admin password in the configuration.

## 4. Use and verify uploads

1. Open **Pentadbir** and sign in with your existing Firebase admin account.
2. Enter the announcement title and optional text/date. Choose a file under **Lampiran**. Images have a local preview before publication.
3. Press **Terbitkan pengumuman**. Upload/save controls are disabled while processing to avoid duplicate requests.
4. Confirm the image or PDF opens inside the Hub in a private/incognito browser, with no editor available to visitors. Check the image zoom controls and PDF viewer's built-in zoom/page controls on your devices.
5. Verify a non-admin account cannot use the upload endpoint, even if it has its own Firebase token. Test replacing and removing an attachment, and deleting its announcement.

New files stay private until the service verifies their Firestore announcement reference. Removing/replacing a published attachment trashes the old file after the announcement changes. Deleting a notice removes the record before trashing its file. Cleanup/share failures are reported separately from successful publication, so the editor does not invite duplicate posts.

If sharing fails, edit and save the notice again after fixing the Drive policy/service issue. If cleanup fails, check the dedicated Drive folder. An upload interrupted before its response may leave a private temporary file there. Trash unused files to preserve storage capacity. Files already downloaded by visitors cannot be recalled.

Google Drive thumbnails may take time to become available. If the enlarged image cannot load, the Hub falls back to an embedded Drive preview. Download and external-open links are available inside the viewer. This is not a malware scanning service; use approved announcement materials.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Upload input is disabled | Add the correct `driveUploadUrl` and rebuild/redeploy the website. Text announcements continue to work. |
| Upload fails | Check the Apps Script `/exec` deployment settings, project properties, Drive capacity, file type/size and Firebase admin role. |
| Sign-in verification fails only in Apps Script | Check that the server uses the same Firebase project/key. A key restricted to browser HTTP referrers cannot be used by Apps Script server requests; use an appropriate separate API-restricted key for server validation if you configured such restrictions. |
| Save is rejected after upload | Publish the updated Firestore rules. Concurrent edits are also rejected when the record changed; reload and reselect the latest notice. |
| Published file cannot be opened | Check sharing policy and save the notice again to retry sharing. Keep attachment files in the dedicated folder. |

Local tests use simulated Firebase/Apps Script services. Actual Apps Script cross-origin behavior, Drive sharing and updated Firestore rules must be verified after deploying the updated website and rules.
