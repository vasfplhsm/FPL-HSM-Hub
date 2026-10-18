# Set up the announcement editor

GitHub Pages serves the Hub. Firebase Authentication signs in the administrator, and Cloud Firestore stores announcements and enforces who may change them. Visitors need no account and can only read announcements. The editor is inside the Hub under **Pentadbir**.

Use a **new dedicated Firebase project** for this Hub. Do not replace the rules of an existing pharmacy application. A small announcement board can fit the free Spark quotas; no billing upgrade is required for this implementation. Firebase can limit service if free quotas are exhausted.

## 1. Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Choose **Add project / Create a project**. Name it something like “FPL HSM Pharmacy Hub”.
3. Keep the **Spark** plan. Google Analytics is not required; you may disable it.
4. Wait until the project is created, then open it.

## 2. Register the web app

1. On Project overview, choose the web icon **</>**.
2. Enter an app nickname such as “Pharmacy Hub”. You do not need Firebase Hosting because the site stays on GitHub Pages.
3. Register the app. Firebase displays a `firebaseConfig` object.
4. Keep its **projectId** and public web **apiKey**. The remaining SDK fields are not required by this implementation. These are public browser configuration values, not admin credentials.

You can find them again under **Project settings → General → Your apps → Web app → SDK setup and configuration**.

## 3. Enable administrator sign-in

1. Open **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**. Email-link sign-in is not needed.
3. Under **Settings → Authorized domains**, add `vasfplhsm.github.io` if it is not already listed. Enter the hostname only, without a scheme or project path.
4. Under **Users**, choose **Add user**. Enter the administrator's email and a strong password directly in Firebase Console.
5. Copy that user's **UID**. You need it in step 5.

Do not put the admin password, a service-account JSON file or private keys in this repository or chat. Admins enter their email/password only into the Hub sign-in form over HTTPS. The Hub holds authentication tokens in memory; reloading the page signs the admin out.

## 4. Create the Firestore database and publish the rules

1. Open **Build → Firestore Database → Create database**.
2. Create the **(default)** database using the standard edition supported by the Spark plan. Choose an appropriate region (for example, Singapore if available). Database location cannot be changed later.
3. Choose **production mode**, not test mode.
4. Open the **Rules** tab. In this new Hub project, replace the starter rules with the complete contents of [firebase/firestore.rules](../firebase/firestore.rules), then press **Publish**.

Those rules allow public reading of announcement text, but allow creating, updating or deleting announcements only for authenticated accounts whose `/admins/<UID>` document has `enabled: true`. They reject client changes to admin roles and prevent announcements from storing extra fields. They do not rely on hidden buttons or a password in JavaScript.

## 5. Authorize your administrator

1. Open **Firestore Database → Data → Start collection**.
2. Collection ID: `admins`.
3. Document ID: paste the exact Authentication **UID** from step 3. Do not use the email address as the document ID.
4. Add field `enabled`, select type **boolean**, and set the value to **true**.
5. Save.

Creating this role through Firebase Console uses your project administrator permission. Website visitors cannot create or edit these role documents. Creating an Authentication account alone does not grant publishing rights. To revoke access later, set its `enabled` field to `false` or remove the role document; subsequent writes will be denied by Firestore.

## 6. Connect the Hub

Provide the public `firebaseConfig` from step 2 so it can be added to this machine's ignored `config/local.json`. Only these two properties are saved to the Hub's public configuration:

```json
"firebase": {
  "projectId": "your-firebase-project-id",
  "apiKey": "your-public-firebase-web-api-key"
}
```

Keep the existing branding and module links in that file. Then run `npm run build:pages`, commit the updated site files, and push `main`. Pages continues using **main → /docs**. No Firebase hosting deployment or npm package installation is needed.

The web API key identifies the project; it does not grant admin privileges. Firebase Authentication and the published Firestore rules protect writes. Never replace the rules with public-write access to fix a sign-in problem.

## 7. Publish your first announcement

1. Open the Hub and choose **Pentadbir** in the header.
2. Sign in with the email/password created in Firebase Authentication.
3. Enter a title, optional date and announcement text, then press **Terbitkan pengumuman**.
4. Return to **Laman Utama** to see it. Other visitors see the public board with no editing form.
5. To edit a notice, choose **Sunting** in the admin list. To remove one, choose **Padam**, then confirm the deletion. Sign out when finished.

Only post content suitable for the public Pages website. Do not include patient details or confidential staff information. The latest 20 published records are loaded; within that set dated notices display newest first.

## Verify access before relying on it

- An admin account with `enabled: true` can publish, edit and delete a harmless test notice.
- A signed-out browser can read it, but has no editor and cannot write directly to Firestore.
- A test Authentication account without an admin role cannot access the editor or write to Firestore, even with its own ID token.
- Disabling the admin role causes further writes from that account to fail.

These live checks require the configured Firebase project. Local tests use intercepted service responses and do not establish that your project's rules have been deployed correctly.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Editor is not connected | Public Firebase configuration has not yet been added and published. |
| Sign-in fails | Enable Email/Password, confirm the account exists, and check the password in Firebase Console. |
| Account signs in but admin access fails | The document is under `admins`, its ID exactly matches the Auth UID, `enabled` is boolean `true`, and the supplied rules were published in the same project. |
| Announcements cannot load | Check the project ID/key, the (default) Firestore database and public announcement-read rule. The navigation still works during a feed outage. |
| Publishing fails | Check the role and rules; retry after a temporary network failure. Titles are limited to 160 characters and body text to 8000. |
| Browser is signed out after reload | Intentional: admin tokens are kept only in memory. Sign in again. |
