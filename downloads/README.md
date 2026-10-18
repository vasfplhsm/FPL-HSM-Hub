# Desktop download

[Download FPL-HSM-Hub-Firebase.zip](https://github.com/vasfplhsm/FPL-HSM-Hub/raw/refs/heads/main/downloads/FPL-HSM-Hub-Firebase.zip)

Extract the ZIP to your Desktop, open the `FPL-HSM-Hub` folder, and read `START-HERE.txt`. The ZIP includes the supplied public Firebase configuration, Apps Script upload URL and application links in `config/local.json`. Preserve any newer local settings in your existing folder.

To activate JPG/PNG/PDF attachments, deploy **both Hosting and Firestore rules** to your existing project:

```sh
npm test
npm run build
firebase deploy --only "hosting,firestore:rules" --project fpl-hsm-pharmacy-hub
```

Read the [Drive upload guide](../docs/drive-uploads.md) and [Firebase Hosting guide](../docs/firebase-hosting.md). No Firebase Storage or Blaze upgrade is needed. Live uploads, sharing and production permissions still require verification on your deployed site.

This is a source snapshot of commit `ac9b497`. It contains no Git credentials or Firebase CLI login state. It is a Desktop download, not part of the Firebase Hosting `dist/` deployment.

SHA-256: `a7fa817c81366f8e92f7f60966112498888f0601492aab8d157018e6a6504446`
