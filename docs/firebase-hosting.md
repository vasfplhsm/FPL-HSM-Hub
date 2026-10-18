# Move the Hub to Firebase Hosting

You can keep the `FPL-HSM-Hub` folder on your Desktop and deploy it from Terminal or PowerShell. Firebase Hosting will serve the website; Firebase Authentication and Firestore provide administrator sign-in and announcement storage. GitHub remains your code backup. No paid hosting upgrade is required for this static app, subject to Firebase's free Spark quotas.

**Current status:** deployment files are prepared, but no Firebase project or website has been created or deployed by this chat. The project owner must create the project and sign in to the Firebase CLI. Keep the existing GitHub Pages site until the Firebase version is verified.

## 1. Download and extract the folder

Download the project ZIP and extract it to your Desktop. Open the extracted folder. You should see `package.json`, `firebase.json`, `public`, `src`, `docs` and `firebase` together. Do not upload the ZIP itself to Firebase.

If your ZIP came from GitHub, copy `docs/config.json` into the `config` folder and rename the copy to **local.json**. This retains the five existing application links. The packaged Desktop ZIP supplied in chat already includes that copy.

## 2. Create your Firebase project and administrator

Follow steps 1–5 in [Firebase setup](firebase-setup.md):

1. Create a new dedicated project on the **Spark** plan in [Firebase Console](https://console.firebase.google.com/). Analytics is optional.
2. Register a web app with the **</>** icon. Keep the public `projectId` and `apiKey` from its `firebaseConfig`.
3. Enable **Authentication → Email/Password**, create your admin user in the Users tab, and copy that user's UID.
4. Create the **(default)** Firestore database in production mode, and publish the rules in `firebase/firestore.rules` using the Rules tab.
5. In Firestore, create `admins/<that UID>` with a boolean field `enabled: true`.

Use this dedicated project so deploying rules cannot change permissions for one of your existing pharmacy applications. In **Authentication → Settings → Authorized domains**, confirm the project's `YOUR_PROJECT_ID.web.app` and `YOUR_PROJECT_ID.firebaseapp.com` hostnames are listed. No path or `https://` belongs in that list.

## 3. Connect the local Hub configuration

Open `config/local.json` in a text editor. Keep the existing title and application links. Change its `firebase` entry from `null` to:

```json
"firebase": {
  "projectId": "YOUR_REAL_PROJECT_ID",
  "apiKey": "YOUR_PUBLIC_WEB_API_KEY"
}
```

Replace those example values with the public values from Firebase Console. Keep the JSON commas and quotation marks intact. Never add your password, service-account JSON or private keys to the folder. You can instead provide the public `firebaseConfig` in this chat to have this file prepared for you.

## 4. Install Node.js and the Firebase command-line tool

Install the current Node.js LTS release, version 22 or newer, from [nodejs.org](https://nodejs.org/). Close and reopen your terminal after installation.

In Terminal or PowerShell, run:

```sh
node --version
npm install -g firebase-tools@15.34.0
firebase login
```

`firebase login` opens your browser. Sign in with the Google account that owns the new Firebase project. This is separate from the email/password account used to edit announcements. Keep this CLI login on your own computer; do not send login tokens in chat.

## 5. Build and deploy the website

Open Terminal or PowerShell **inside the extracted project folder**. On Windows, you can open the folder in File Explorer, click the address bar, type `powershell`, and press Enter. On macOS, use `cd` to enter the Desktop folder, for example `cd ~/Desktop/FPL-HSM-Hub`.

Run these commands individually:

```sh
npm test
npm run build
firebase deploy --only hosting --project YOUR_REAL_PROJECT_ID
```

Replace `YOUR_REAL_PROJECT_ID` with the exact Firebase project ID. No `npm install` is required for the Hub itself. The project already includes `firebase.json`; **do not run `firebase init`**, which may offer to replace existing files.

Only the generated `dist/` folder is uploaded. Uploaded legacy sources, local configuration files and the repository's private tooling are outside the hosting directory. The build includes the intended public branding, application links and public Firebase configuration. Hosting applies the supplied security headers.

After a successful deployment, the CLI prints the actual **Hosting URL**. Open that URL and verify the site. Firebase usually assigns a `web.app` address based on the project/site ID; use the URL reported by your deployment.

If Firebase reports that Hosting has not been initialized, open **Build → Hosting → Get started** in the project's Console, then retry the deployment. Do not replace your existing project files with a starter template.

## 6. Verify announcements and complete the switch

1. Confirm the logo, full name, light/dark mode and all sidebar/mobile links.
2. Choose **Pentadbir**, sign in, and publish a harmless test notice.
3. Open the site in a private/incognito window. Confirm the notice is readable, but editing is unavailable without an authorized admin login.
4. Complete the non-admin/revoked-admin checks in the Firebase setup guide.
5. Share the new Hosting URL with staff. You may keep GitHub Pages as a backup; turning it off is optional and is not part of the prepared deployment.

The Hosting deploy command does not publish Firestore rules or create admin accounts. The guide uses Firebase Console for those one-time tasks. If you later intentionally update rules in this dedicated Hub project, deploy them separately:

```sh
firebase deploy --only firestore:rules --project YOUR_REAL_PROJECT_ID
```

## Future updates

For website code changes, edit the folder and repeat:

```sh
npm test
npm run build
firebase deploy --only hosting --project YOUR_REAL_PROJECT_ID
```

For announcement text, use the Hub's admin editor. No terminal, rebuild or website deployment is needed for each announcement once Firebase is connected.
