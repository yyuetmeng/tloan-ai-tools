import { repository } from "./config.js";

const W = window.LoanWorkflow;
const $ = (id) => document.getElementById(id);
const repo = repository || repoFromPagesUrl();
const repoUrl = `https://github.com/${repo}`;

let tools = [];
let requests = [];

$("repoLink").href = repoUrl;
$("newRequestLink").href = requestUrl();
$("statusFilter").innerHTML += W.STATUSES.map((s) => `<option>${s}</option>`).join("");

["search", "category"].forEach((id) => $(id).addEventListener("input", renderTools));
["statusFilter", "requesterFilter"].forEach((id) => $(id).addEventListener("input", renderRequests));

await Promise.all([loadTools(), loadRequests()]);

// ---- Data ----
async function loadTools() {
  // The deployed site gets data/tools.json from the Java builder; locally, fall back to the source file.
  for (const url of ["data/tools.json", "catalogue/tools.json"]) {
    try {
      const res = await fetch(url);
      if (res.ok) { tools = await res.json(); break; }
    } catch { /* try the next one */ }
  }
  const cats = [...new Set(tools.map((t) => t.category).filter(Boolean))].sort();
  $("category").innerHTML += cats.map((c) => `<option>${esc(c)}</option>`).join("");
  renderTools();
}

async function loadRequests() {
  try {
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues?labels=${W.REQUEST_LABEL}` +
        `&state=all&per_page=100&page=${page}`, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) {
        throw new Error(res.status === 403
          ? "GitHub's hourly limit for anonymous requests was reached — try again later."
          : `Couldn't load requests from GitHub (HTTP ${res.status}).`);
      }
      const batch = (await res.json()).filter((i) => !i.pull_request);
      requests.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (err) {
    $("requestsError").textContent = err.message;
    $("requestsError").classList.remove("hidden");
  }
  renderTools();     // availability depends on issued requests
  renderRequests();
}

// ---- Rendering ----
function renderTools() {
  const q = $("search").value.trim().toLowerCase();
  const cat = $("category").value;
  const shown = tools.filter((t) => t.active !== false)
    .filter((t) => !cat || t.category === cat)
    .filter((t) => !q || [t.name, t.vendor, t.description, t.category].some((f) => (f || "").toLowerCase().includes(q)));

  $("tools").innerHTML = shown.map((t) => {
    const free = Math.max(0, t.totalLicences - W.countIssued(requests, t.name));
    return `
      <article class="tool">
        <h3>${t.websiteUrl ? `<a href="${esc(t.websiteUrl)}" target="_blank" rel="noopener">${esc(t.name)}</a>` : esc(t.name)}</h3>
        <div class="muted">${esc(t.vendor || "")}${t.category ? ` · ${esc(t.category)}` : ""}</div>
        <p>${esc(t.description || "")}</p>
        <div class="tool-foot">
          <span class="badge ${free ? "Approved" : "Rejected"}">${free} of ${t.totalLicences} available</span>
          <a class="button small" href="${requestUrl(t.name)}" target="_blank" rel="noopener">Request</a>
        </div>
      </article>`;
  }).join("") || `<p class="muted">No tools match.</p>`;
}

function renderRequests() {
  const status = $("statusFilter").value;
  const who = $("requesterFilter").value.trim().toLowerCase();
  const rows = requests
    .map((i) => ({ issue: i, req: W.parseIssueForm(i.body), status: W.statusFromLabels(i.labels) || "Submitted" }))
    .filter((r) => !status || r.status === status)
    .filter((r) => !who || r.issue.user.login.toLowerCase().includes(who));

  $("requestsBody").innerHTML = rows.map(({ issue, req, status }) => `
    <tr>
      <td><a href="${esc(issue.html_url)}" target="_blank" rel="noopener">#${issue.number}</a></td>
      <td><img class="avatar" src="${esc(issue.user.avatar_url)}&s=40" alt="" /> ${esc(issue.user.login)}</td>
      <td>${esc(req.tool)}</td>
      <td class="nowrap">${esc(req.startDate)} – ${esc(req.endDate)}</td>
      <td><span class="badge ${status.replace(/\s/g, "")}">${status}</span></td>
    </tr>`).join("") || `<tr><td colspan="5" class="muted">No requests yet.</td></tr>`;
}

// ---- Helpers ----
function requestUrl(toolName) {
  const params = new URLSearchParams({ template: "loan-request.yml", title: "Loan request" });
  if (toolName) params.set("tool", toolName);
  return `${repoUrl}/issues/new?${params}`;
}

function repoFromPagesUrl() {
  const owner = location.hostname.split(".")[0];
  const name = location.pathname.split("/").filter(Boolean)[0] || `${owner}.github.io`;
  return `${owner}/${name}`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
