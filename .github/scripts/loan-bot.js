// Runs inside actions/github-script (see .github/workflows/loan-requests.yml).
// Moves loan request issues through Submitted -> Approved/Rejected -> Issued -> Returned.
const fs = require("fs");
const path = require("path");
const W = require("../../js/loan-workflow.js");

const LABEL_COLOURS = {
  [W.REQUEST_LABEL]: "5319e7",
  "status: submitted": "fbca04",
  "status: needs info": "d93f0b",
  "status: approved": "1d76db",
  "status: rejected": "b60205",
  "status: issued": "0e8a16",
  "status: returned": "c5def5",
};

module.exports = async ({ github, context, core }) => {
  const root = process.env.GITHUB_WORKSPACE || process.cwd();
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  const tools = readJson("catalogue/tools.json");
  const approvers = readJson("catalogue/approvers.json");
  const { owner, repo } = context.repo;
  const issue = context.payload.issue;
  const number = issue.number;
  const today = new Date().toISOString().slice(0, 10);

  if (issue.pull_request || !W.looksLikeLoanRequest(issue)) {
    core.info(`#${number} is not a loan request; nothing to do.`);
    return;
  }

  const comment = (body) => github.rest.issues.createComment({ owner, repo, issue_number: number, body });
  const mention = (logins) => logins.map((l) => "@" + l).join(" ");

  async function ensureLabel(name) {
    try {
      await github.rest.issues.createLabel({ owner, repo, name, color: LABEL_COLOURS[name] || "ededed" });
    } catch (err) {
      if (err.status !== 422) throw err; // 422 = already exists
    }
  }

  async function setStatus(status) {
    const keep = issue.labels.map((l) => l.name)
      .filter((n) => n !== W.REQUEST_LABEL && !n.toLowerCase().startsWith("status: "));
    const wanted = [W.REQUEST_LABEL, W.statusLabel(status)];
    for (const name of wanted) await ensureLabel(name);
    await github.rest.issues.setLabels({ owner, repo, issue_number: number, labels: [...keep, ...wanted] });
  }

  const current = W.statusFromLabels(issue.labels);

  // ---- New or edited request: validate it and notify approvers ----
  if (context.eventName === "issues") {
    if (context.payload.action === "edited" && !["Submitted", "Needs info", null].includes(current)) {
      core.info(`#${number} is ${current}; edits no longer change it.`);
      return;
    }
    const req = W.parseIssueForm(issue.body);
    const errors = W.validateRequest(req, tools);

    if (errors.length) {
      await setStatus("Needs info");
      await comment(`@${issue.user.login} this request can't be reviewed yet:\n\n` +
        errors.map((e) => `- ${e}`).join("\n") +
        `\n\nEdit the issue description (⋯ → Edit) to fix it and it will be re-checked automatically.`);
      return;
    }

    const tool = W.findTool(tools, req.tool);
    const title = `Loan request: ${tool.name} (${req.startDate} → ${req.endDate})`;
    if (issue.title !== title) await github.rest.issues.update({ owner, repo, issue_number: number, title });

    const becameValid = context.payload.action === "opened" || current !== "Submitted";
    await setStatus("Submitted");
    if (becameValid) {
      await comment(`${mention(approvers)} new loan request from @${issue.user.login} for **${tool.name}**, ` +
        `${req.startDate} → ${req.endDate}.\n\n` +
        "Approvers: reply `/approve` or `/reject <reason>`.");
    }
    return;
  }

  // ---- Approver command in a comment ----
  const cmd = W.parseCommand(context.payload.comment.body);
  if (!cmd) return;
  const actor = context.payload.comment.user.login;

  if (!W.isApprover(actor, approvers)) {
    await comment(`@${actor} only approvers (${approvers.join(", ")}) can use \`/${cmd.command}\`. ` +
      "Approvers are listed in `catalogue/approvers.json`.");
    return;
  }

  const step = W.transition(current, cmd.command);
  if (step.error) {
    await comment(`@${actor} ${step.error}`);
    return;
  }

  const req = W.parseIssueForm(issue.body);
  const tool = W.findTool(tools, req.tool) || { name: req.tool, totalLicences: 0 };
  const requester = "@" + issue.user.login;

  if (step.to === "Rejected" && !cmd.note) {
    await comment(`@${actor} please give a reason: \`/reject <reason>\`.`);
    return;
  }

  if (step.to === "Issued") {
    const openIssued = await github.paginate(github.rest.issues.listForRepo,
      { owner, repo, state: "open", labels: W.statusLabel("Issued"), per_page: 100 });
    const out = W.countIssued(openIssued, tool.name);
    if (out >= tool.totalLicences) {
      await comment(`@${actor} all ${tool.totalLicences} ${tool.name} licence(s) are already issued. ` +
        "Mark one as returned first, or raise `totalLicences` in `catalogue/tools.json`.");
      return;
    }
  }

  await setStatus(step.to);
  await github.rest.reactions.createForIssueComment({
    owner, repo, comment_id: context.payload.comment.id, content: "+1",
  });

  const note = cmd.note ? `\n\n> ${cmd.note}` : "";
  const messages = {
    Approved: `${requester} your request for **${tool.name}** was approved by @${actor}.${note}\n\nApprover: reply \`/issue\` once the licence is handed over.`,
    Rejected: `${requester} your request for **${tool.name}** was rejected by @${actor}.${note}`,
    Issued: `${requester} **${tool.name}** was issued to you on ${today}. Please return it by **${req.endDate}**.${note}\n\nApprover: reply \`/return\` when it comes back.`,
    Returned: `${requester} **${tool.name}** was marked as returned on ${today}. Thanks!${note}`,
  };
  await comment(messages[step.to]);

  if (step.to === "Rejected" || step.to === "Returned") {
    await github.rest.issues.update({
      owner, repo, issue_number: number, state: "closed",
      state_reason: step.to === "Rejected" ? "not_planned" : "completed",
    });
  }
};
