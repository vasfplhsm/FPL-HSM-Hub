# Desktop downloads

[Download the Viewer Update ZIP](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Viewer-Update.zip) for your existing Desktop folder. It adds **JPG, PNG and PDF rotation**, zoom/fit and PDF page navigation. This package contains **no configuration folder** and leaves your custom `config/local.json` untouched.

1. Extract the update and copy `public/`, `src/`, `tests/`, `apps-script/` and `firebase.json` into your existing Hub folder, replacing matching files. Keep your `config/` folder.
2. Replace the code in your existing Hub Uploads Apps Script project with the included `apps-script/DriveUploads.gs`. Choose **Deploy → Manage deployments → Edit → New version → Deploy**, keeping its existing URL, properties and folder. This step enables PDF rotation; older script versions retain the Drive fallback without Hub PDF rotation controls.
3. Run these commands from your existing Hub folder:

```sh
npm run build
firebase deploy --only hosting --project fpl-hsm-pharmacy-hub
```

The existing Firestore rules still apply, and existing attachments do not need uploading again. See the [viewer update guide](../docs/attachment-viewer.md). File writes remain admin-only; the new anonymous PDF read operation checks publication, ownership, folder and public view-only sharing.

[Download the complete FPL-HSM-Hub-Firebase.zip](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Firebase.zip) for a fresh installation. It includes the supplied baseline configuration in `config/local.json`; preserve newer local changes. Read `START-HERE.txt`, the [Hosting guide](../docs/firebase-hosting.md) and [Drive setup](../docs/drive-uploads.md).

Both packages use source snapshot `2f27cbc` and contain no Git credentials or Firebase CLI login state. They include locally bundled PDF.js 6.4.299 with fonts, decoders and licenses. Files stay in Drive and Firebase remains on Spark. Local checks use real PDF/image rendering with simulated Google service responses; the updated live PDF endpoint still needs checking after deployment.

SHA-256:

- Viewer update: `be1f36db7aae3462b693de3d773c25d9d19debf9b61273dd5eb560719435a621`
- Complete folder: `b9bd00cb049f146aff042d4a4f62c6c56492ab2d38c45c68ad058bc766ebcc78`
