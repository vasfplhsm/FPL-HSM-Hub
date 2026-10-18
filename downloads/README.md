# Desktop downloads

[Download the Viewer Update ZIP](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Viewer-Update.zip) for your existing Desktop folder. It opens attachments inside the Hub with image zoom controls and embedded PDF viewing. This package contains **no configuration folder** and leaves your custom `config/local.json` untouched.

Extract the update and copy `public/`, `src/`, `tests/` and `firebase.json` into your existing Hub folder, replacing matching files. Keep your `config/` folder. Then run these commands from your existing Hub folder:

```sh
npm run build
firebase deploy --only hosting --project fpl-hsm-pharmacy-hub
```

Your previously deployed Apps Script service and Firestore rules still apply. Existing attachments do not need uploading again. See the [viewer update guide](../docs/attachment-viewer.md).

[Download the complete FPL-HSM-Hub-Firebase.zip](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Firebase.zip) for a fresh installation. That package includes the supplied baseline public configuration in `config/local.json`; preserve or merge any newer local settings. Read `START-HERE.txt` and the [Firebase Hosting guide](../docs/firebase-hosting.md). Fresh installations also need the supplied Firestore rules and [Drive upload setup](../docs/drive-uploads.md).

Both packages use source snapshot `0a578df` and contain no Git credentials or Firebase CLI login state. They are Desktop downloads, outside Firebase Hosting's `dist/` deployment. Files stay in Google Drive while Firebase remains on Spark.

Local viewer tests use simulated Google responses. Google's actual embedded PDF zoom/page controls need checking on your deployed site.

SHA-256:

- Viewer update: `b74c50c72144e50c38ca0eb90908b2c4165576d3f98b646433b80445fa34e2a5`
- Complete folder: `7be28dad78dbf5ad57e68cbd6247ff7c022ff812c0b96ab10d51b0684a4554d0`
