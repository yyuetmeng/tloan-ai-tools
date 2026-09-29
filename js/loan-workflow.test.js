// Run with: node --test js/loan-workflow.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const W = require("./loan-workflow.js");

const tools = [
  { name: "Claude Pro", totalLicences: 2, active: true },
  { name: "Old Tool", totalLicences: 1, active: false },
];
const body = (tool, start, end, purpose = "Prototype a feature") =>
  `### Tool\n\n${tool}\n\n### Purpose\n\n${purpose}\n\n### Start date\n\n${start}\n\n### End date\n\n${end}`;

test("parses an issue form body", () => {
  assert.deepEqual(W.parseIssueForm(body("Claude Pro", "2026-10-01", "2026-10-31")), {
    tool: "Claude Pro", purpose: "Prototype a feature", startDate: "2026-10-01", endDate: "2026-10-31",
  });
  assert.equal(W.parseIssueForm(body("Claude Pro", "_No response_", "x")).startDate, "");
});

test("validates tool and dates", () => {
  assert.deepEqual(W.validateRequest(W.parseIssueForm(body("claude pro", "2026-10-01", "2026-10-01")), tools), []);
  const errors = W.validateRequest(W.parseIssueForm(body("Old Tool", "2026-02-30", "2026-01-01", "")), tools);
  assert.equal(errors.length, 3, errors.join(" | "));
  assert.match(W.validateRequest(W.parseIssueForm(body("Nope", "2026-10-02", "2026-10-01")), tools).join(" "),
    /not in the AI Tool Catalogue.*on or after/);
});

test("parses approver commands", () => {
  assert.deepEqual(W.parseCommand("/reject  No budget left\nthanks"), { command: "reject", note: "No budget left" });
  assert.deepEqual(W.parseCommand("/Approve"), { command: "approve", note: "" });
  assert.equal(W.parseCommand("Looks good /approve"), null);
  assert.equal(W.parseCommand("/deploy"), null);
});

test("enforces the status flow", () => {
  assert.deepEqual(W.transition("Submitted", "approve"), { to: "Approved" });
  assert.deepEqual(W.transition("Approved", "issue"), { to: "Issued" });
  assert.deepEqual(W.transition("Issued", "return"), { to: "Returned" });
  assert.ok(W.transition("Approved", "approve").error);
  assert.ok(W.transition("Needs info", "approve").error);
});

test("reads status from labels and counts licences out", () => {
  const issue = (tool, status, state = "open") => ({ state, body: body(tool, "2026-10-01", "2026-10-02"), labels: [{ name: W.REQUEST_LABEL }, { name: W.statusLabel(status) }] });
  assert.equal(W.statusFromLabels(["loan-request", "status: needs info"]), "Needs info");
  const issues = [issue("Claude Pro", "Issued"), issue("claude pro", "Issued"), issue("Claude Pro", "Issued", "closed"), issue("Claude Pro", "Approved"), issue("Figma", "Issued")];
  assert.equal(W.countIssued(issues, "Claude Pro"), 2);
});

test("recognises loan requests and approvers", () => {
  assert.ok(W.looksLikeLoanRequest({ labels: [], body: body("A", "b", "c") }));
  assert.ok(!W.looksLikeLoanRequest({ labels: [{ name: "bug" }], body: "### Steps" }));
  assert.ok(W.isApprover("YYuetmeng", ["yyuetmeng"]));
  assert.ok(!W.isApprover("someone", ["yyuetmeng"]));
});
