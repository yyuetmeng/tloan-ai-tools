// Loan request rules shared by the GitHub Actions bot (.github/scripts/loan-bot.js, via require)
// and the website (loaded as a plain <script>, exposed as window.LoanWorkflow).
// A loan request is a GitHub issue created from .github/ISSUE_TEMPLATE/loan-request.yml.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LoanWorkflow = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const REQUEST_LABEL = "loan-request";
  const STATUS_PREFIX = "status: ";
  const STATUSES = ["Submitted", "Needs info", "Approved", "Rejected", "Issued", "Returned"];

  // Approver commands, typed as a comment on the request issue.
  const COMMANDS = {
    approve: { from: "Submitted", to: "Approved" },
    reject: { from: "Submitted", to: "Rejected" },
    issue: { from: "Approved", to: "Issued" },
    return: { from: "Issued", to: "Returned" },
  };

  const statusLabel = (status) => STATUS_PREFIX + status.toLowerCase();

  function statusFromLabels(labels) {
    const names = (labels || []).map((l) => (typeof l === "string" ? l : l.name).toLowerCase());
    return STATUSES.find((s) => names.includes(statusLabel(s))) || null;
  }

  // Issue forms render each answer under a "### <label>" heading.
  function parseIssueForm(body) {
    const fields = {};
    const parts = String(body || "").replace(/\r\n/g, "\n").split(/^### +/m).slice(1);
    for (const part of parts) {
      const newline = part.indexOf("\n");
      const heading = (newline === -1 ? part : part.slice(0, newline)).trim().toLowerCase();
      const value = newline === -1 ? "" : part.slice(newline + 1).trim();
      fields[heading] = value === "_No response_" ? "" : value;
    }
    return {
      tool: fields["tool"] || "",
      purpose: fields["purpose"] || "",
      startDate: fields["start date"] || "",
      endDate: fields["end date"] || "",
    };
  }

  function looksLikeLoanRequest(issue) {
    const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
    if (labels.includes(REQUEST_LABEL)) return true;
    const body = String(issue.body || "");
    return /^### +Tool\s*$/m.test(body) && /^### +Start date\s*$/m.test(body);
  }

  function findTool(tools, name) {
    const wanted = String(name || "").trim().toLowerCase();
    return tools.find((t) => t.name.trim().toLowerCase() === wanted) || null;
  }

  function isValidDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + "T00:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }

  function validateRequest(req, tools) {
    const errors = [];
    const tool = findTool(tools, req.tool);
    if (!req.tool) errors.push("Choose a tool.");
    else if (!tool) errors.push(`"${req.tool}" is not in the AI Tool Catalogue.`);
    else if (tool.active === false) errors.push(`${tool.name} is not currently available for loan.`);
    if (!req.purpose) errors.push("Describe the purpose.");
    const startOk = isValidDate(req.startDate), endOk = isValidDate(req.endDate);
    if (!startOk) errors.push("Start date must be a real date in YYYY-MM-DD format.");
    if (!endOk) errors.push("End date must be a real date in YYYY-MM-DD format.");
    if (startOk && endOk && req.endDate < req.startDate) errors.push("End date must be on or after the start date.");
    return errors;
  }

  // "/reject Budget freeze" -> { command: "reject", note: "Budget freeze" }. Only the first line counts.
  function parseCommand(commentBody) {
    const firstLine = String(commentBody || "").trim().split(/\r?\n/)[0];
    const m = /^\/(\w+)\b\s*(.*)$/.exec(firstLine);
    if (!m || !COMMANDS[m[1].toLowerCase()]) return null;
    return { command: m[1].toLowerCase(), note: m[2].trim() };
  }

  function transition(currentStatus, command) {
    const rule = COMMANDS[command];
    if (!rule) return { error: `Unknown command /${command}.` };
    if (currentStatus !== rule.from) {
      return { error: `/${command} only works on a request that is ${rule.from}; this one is ${currentStatus || "not yet valid"}.` };
    }
    return { to: rule.to };
  }

  function isApprover(login, approvers) {
    const l = String(login || "").toLowerCase();
    return approvers.some((a) => a.toLowerCase() === l);
  }

  // How many licences of a tool are currently out (open issues in the Issued state).
  function countIssued(issues, toolName) {
    return issues.filter((i) =>
      i.state === "open" && statusFromLabels(i.labels) === "Issued" &&
      findTool([{ name: toolName }], parseIssueForm(i.body).tool)).length;
  }

  return {
    REQUEST_LABEL, STATUSES, COMMANDS, statusLabel, statusFromLabels, parseIssueForm,
    looksLikeLoanRequest, findTool, validateRequest, parseCommand, transition, isApprover, countIssued,
  };
});
