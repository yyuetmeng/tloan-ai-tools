# T-Loan AI Tools — standalone web app

A self-contained replacement for the SharePoint version: requesters submit a loan
request for a catalogued AI tool (Claude Pro, Lovable, Figma, Codex Pro), it routes
to an approver by email, and the approver moves it through
Submitted → Approved/Rejected → Issued → Returned, exactly like the SharePoint design.

No server to run — it's a static site (plain HTML/CSS/JS) backed by:
- **Firebase Authentication** — email/password sign-in
- **Firebase Firestore** — stores requests and the approver list, live-updating
- **EmailJS** — sends the four notification emails, entirely from the browser
- **GitHub Pages** — hosts the static site for free

## 1. Create a Firebase project (5 min)

1. Go to <https://console.firebase.google.com> → "Add project" → follow the prompts (Google Analytics is optional, skip it).
2. Project settings (gear icon) → General → "Your apps" → click the `</>` (web) icon → register an app (any nickname) → **do not** tick Firebase Hosting.
3. Copy the `firebaseConfig` object shown and paste its values into `js/firebase-config.js` in this repo.
4. Build → Authentication → Get started → Sign-in method → enable **Email/Password**.
5. Build → Firestore Database → Create database → start in **production mode** → pick a region.
6. Firestore → Rules tab → paste the contents of `firestore.rules` from this repo → Publish.

## 2. Set the first approver

The app auto-creates a `settings/approvers` document the first time *anyone* signs in,
listing that person as the sole approver. Simplest path:

1. Deploy the site (Section 4) and have the intended approver sign up first
   (Create account, using their real work email) — they become the initial approver automatically.
2. To add or change approvers afterwards, open Firestore Database in the Firebase console,
   go to `settings/approvers`, and edit the `emails` array directly (all lowercase).

## 3. Set up EmailJS for notifications (10 min)

1. Sign up free at <https://www.emailjs.com>.
2. Add an Email Service (e.g. connect your Gmail/Outlook) → note the **Service ID**.
3. Create four Email Templates, matching the four stages, using these variable names in each template body:
   | Template | Suggested name | Variables available |
   |---|---|---|
   | New request → approver | `template_new_request` | `to_email, tool, purpose, start_date, end_date, requester_email, request_id` |
   | Approve/Reject decision → requester | `template_decision` | `to_email, tool, decision, comments` |
   | Issued → requester | `template_issued` | `to_email, tool, issue_date, end_date` |
   | Returned → requester + approver | `template_returned` | `to_email, tool, return_date` |
4. Account → General → copy your **Public Key**.
5. Fill the Service ID, Public Key and the four template IDs into `js/firebase-config.js` (`emailjsConfig`).

If you skip this section, the app still works — it just logs a console warning instead of sending mail.

## 4. Push to GitHub and deploy (5 min)

```bash
cd tloan-webapp
git init
git add .
git commit -m "Initial commit: T-Loan AI Tools app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then in the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The included workflow (`.github/workflows/deploy.yml`) will run automatically on every push
to `main` and publish the site at `https://<your-username>.github.io/<your-repo>/`.

## 5. Test end-to-end

1. Open the deployed site, "Create account" as a normal requester (a different email from the approver).
2. Submit a request — confirm the approver's inbox gets the new-request email (if EmailJS is configured).
3. Sign in as the approver, Approve or Reject it — confirm the requester gets the decision email.
4. Mark it Issued, then Returned — confirm each stage fires its email and the status badge updates live for the requester.

## Notes and things to harden before production use

- The current build treats **any signed-in user not in the approver list as a requester** — there's no invite-only signup; anyone with the link can create an account. Add an allow-list or your organization's SSO if that matters.
- The AI Tool Catalogue can be managed by the Java service in [`catalogue-service/`](catalogue-service/README.md) — deploy it and set `catalogueApiUrl` in `firebase-config.js`. Until then the app falls back to the hard-coded `TOOL_CATALOGUE` array in `app.js`.
- Firestore's free (Spark) tier comfortably covers small teams; check Firebase pricing if usage grows.
- `firestore.rules` enforces that only the approver list can approve/issue/return, and that requesters can only see their own requests — review it against your own security requirements before going live.
