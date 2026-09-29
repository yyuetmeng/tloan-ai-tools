# T-Loan AI Tools

Borrow licences for AI tools (Claude Pro, Lovable, Figma, Codex Pro, …) using **only GitHub** —
no Firebase, no server, no extra accounts:

| Piece | GitHub feature |
|---|---|
| Website with the AI Tool Catalogue and request list | **GitHub Pages** |
| Sign-in | **GitHub accounts** |
| Loan requests and their history | **GitHub Issues** (one issue per request) |
| Approve / reject / issue / return | **GitHub Actions** bot reacting to comments |
| Email notifications | **GitHub notifications** |
| Catalogue validation and request form generation | **Java** builder run by GitHub Actions |

Live site (after setup): <https://yyuetmeng.github.io/tloan-ai-tools/>

## How a loan works

1. **Request** — on the website click *Request* on a tool (or *New request*). This opens a GitHub
   issue form: pick the tool, describe the purpose, enter start and end dates (YYYY-MM-DD).
2. The bot checks the request. If something is wrong (unknown tool, bad dates) it labels it
   `status: needs info` and says what to fix; editing the issue re-checks it. If it's fine it labels it
   `status: submitted` and @-mentions the approvers.
3. **Approve** — an approver comments `/approve` (optionally with a note) or `/reject <reason>`.
   Rejected requests are closed.
4. **Issue** — when the licence is handed over, the approver comments `/issue`. The bot refuses if
   every licence of that tool is already out.
5. **Return** — when it comes back, the approver comments `/return`, and the request is closed.

Each step comments on the issue, so the requester and approvers get GitHub notifications
(by email too, if enabled in their GitHub notification settings). The website shows every request and
how many licences of each tool are free.

## Deploy (one-time, about 5 minutes)

1. Merge this code into `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Actions** tab → **Build and deploy** → **Run workflow** (later pushes to `main` deploy automatically).
4. Open <https://yyuetmeng.github.io/tloan-ai-tools/>.

## Everyday admin — all done by editing files on GitHub

- **Add, change or retire a tool:** edit `catalogue/tools.json` (✏️ on GitHub) and commit.
  Set `"active": false` to hide a tool from new requests without losing history.
  The build validates the file, then updates the website and the request form's tool list.
- **Change approvers:** edit `catalogue/approvers.json` — a list of GitHub usernames.
  Approvers should watch the repository (**Watch → All activity**) so they're notified of new requests.

Tool fields:

```jsonc
{
  "id": "claude-pro",                 // lowercase letters, digits, dashes; unique
  "name": "Claude Pro",               // shown in the form; unique
  "vendor": "Anthropic",
  "category": "Assistant",
  "description": "AI assistant for writing, analysis and coding.",
  "websiteUrl": "https://claude.ai",
  "totalLicences": 5,                 // how many can be issued at once
  "active": true
}
```

## Project layout

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/app.js`, `js/config.js` | The GitHub Pages website |
| `js/loan-workflow.js` | Request rules shared by the website and the bot (tests: `js/loan-workflow.test.js`) |
| `catalogue/tools.json`, `catalogue/approvers.json` | The catalogue and approver list |
| `catalogue-builder/` | Java 21 program that validates the catalogue and generates `data/tools.json` and the issue form |
| `.github/ISSUE_TEMPLATE/loan-request.yml` | The request form — **generated**, don't edit by hand |
| `.github/scripts/loan-bot.js`, `.github/workflows/loan-requests.yml` | The approval bot |
| `.github/workflows/deploy.yml` | Builds, tests and deploys to GitHub Pages |

## Run locally

```bash
# Java builder (needs Java 21 + Maven)
mvn -f catalogue-builder/pom.xml package
java -jar catalogue-builder/target/catalogue-builder.jar \
  catalogue/tools.json _site/data/tools.json .github/ISSUE_TEMPLATE/loan-request.yml

# Workflow rule tests (needs Node.js)
node --test js/loan-workflow.test.js

# Website: serve the repo root and open http://localhost:8000
python3 -m http.server 8000
```

## Things to know

- **The repository is public**, so loan requests (tool, dates, purpose, GitHub username) are public too.
  GitHub Pages on a private repository needs a paid GitHub plan.
- Anyone with a GitHub account can submit a request; only people in `approvers.json` can move it along.
- The website reads requests through GitHub's public API without signing in, which allows
  60 page loads per hour per visitor's network — plenty for a small team.
