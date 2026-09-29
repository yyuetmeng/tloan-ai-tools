import { firebaseConfig, emailjsConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc,
  onSnapshot, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (window.emailjs && emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
  emailjs.init({ publicKey: emailjsConfig.publicKey });
}

// ---- Static catalogue (edit this list, or move it into a Firestore collection later) ----
const TOOL_CATALOGUE = ["Claude Pro", "Lovable", "Figma", "Codex Pro"];

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);
const loginView = $("loginView"), requesterView = $("requesterView"), approverView = $("approverView");
const userBox = $("userBox");

let currentUser = null;
let isApprover = false;
let approverEmails = [];

// ---- Auth ----
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    show(loginView); hide(requesterView); hide(approverView);
    userBox.innerHTML = "";
    return;
  }
  approverEmails = await loadApproverEmails();
  isApprover = approverEmails.includes(user.email.toLowerCase());

  userBox.innerHTML = `${user.email} <button id="logoutBtn" class="small">Sign out</button>`;
  $("logoutBtn").onclick = () => signOut(auth);

  hide(loginView);
  if (isApprover) {
    show(approverView); hide(requesterView);
    watchApproverQueues();
  } else {
    show(requesterView); hide(approverView);
    populateToolOptions();
    watchMyRequests();
  }
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    $("loginError").classList.add("hidden");
  } catch (err) {
    $("loginError").textContent = err.message;
    $("loginError").classList.remove("hidden");
  }
});

$("signupBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  if (!email || !password) {
    $("loginError").textContent = "Enter an email and password first.";
    $("loginError").classList.remove("hidden");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    $("loginError").textContent = err.message;
    $("loginError").classList.remove("hidden");
  }
});

// ---- Settings (approver list) ----
async function loadApproverEmails() {
  const ref = doc(db, "settings", "approvers");
  const snap = await getDoc(ref);
  if (snap.exists()) return (snap.data().emails || []).map((e) => e.toLowerCase());
  // First run: nobody configured yet, seed it with the current user as the initial approver.
  await setDoc(ref, { emails: [currentUser.email.toLowerCase()] });
  return [currentUser.email.toLowerCase()];
}

// ---- Requester view ----
function populateToolOptions() {
  const sel = $("reqTool");
  sel.innerHTML = TOOL_CATALOGUE.map((t) => `<option>${t}</option>`).join("");
}

$("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tool = $("reqTool").value;
  const purpose = $("reqPurpose").value.trim();
  const start = $("reqStart").value;
  const end = $("reqEnd").value;
  if (!purpose || !start || !end) return;
  if (end < start) {
    alert("End date must be on or after the start date.");
    return;
  }

  const docRef = await addDoc(collection(db, "requests"), {
    tool, purpose, startDate: start, endDate: end,
    requesterEmail: currentUser.email,
    status: "Submitted",
    approverComments: "",
    dateIssued: null,
    dateReturned: null,
    createdAt: serverTimestamp(),
  });

  sendEmail(emailjsConfig.templates.newRequest, {
    to_email: approverEmails.join(","),
    tool, purpose, start_date: start, end_date: end,
    requester_email: currentUser.email,
    request_id: docRef.id,
  });

  $("requestForm").reset();
  $("requestMsg").textContent = "Request submitted.";
  $("requestMsg").classList.remove("hidden");
  setTimeout(() => $("requestMsg").classList.add("hidden"), 3000);
});

function watchMyRequests() {
  const q = query(collection(db, "requests"), where("requesterEmail", "==", currentUser.email), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => renderMyRow(d.id, d.data()));
    $("myRequestsBody").innerHTML = rows.join("") || `<tr><td colspan="4" class="muted">No requests yet.</td></tr>`;
  });
}

function renderMyRow(id, r) {
  const notes = r.status === "Rejected" ? escapeHtml(r.approverComments || "") : "";
  return `<tr>
    <td>${r.tool}</td>
    <td>${r.startDate} – ${r.endDate}</td>
    <td><span class="badge ${r.status}">${r.status}</span></td>
    <td class="muted">${notes}</td>
  </tr>`;
}

// ---- Approver view ----
function watchApproverQueues() {
  const all = query(collection(db, "requests"), orderBy("createdAt", "desc"));
  onSnapshot(all, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPending(items.filter((r) => r.status === "Submitted"));
    renderApproved(items.filter((r) => r.status === "Approved"));
    renderIssued(items.filter((r) => r.status === "Issued"));
    renderAll(items);
  });
}

function renderPending(items) {
  $("pendingBody").innerHTML = items.map((r) => `
    <tr>
      <td>${r.requesterEmail}</td>
      <td>${r.tool}</td>
      <td>${r.startDate} – ${r.endDate}</td>
      <td>${escapeHtml(r.purpose)}</td>
      <td>
        <button class="small" onclick="window.__approve('${r.id}')">Approve</button>
        <button class="small danger" onclick="window.__reject('${r.id}')">Reject</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5" class="muted">Nothing pending.</td></tr>`;
}

function renderApproved(items) {
  $("approvedBody").innerHTML = items.map((r) => `
    <tr>
      <td>${r.requesterEmail}</td><td>${r.tool}</td><td>${r.startDate} – ${r.endDate}</td>
      <td><button class="small" onclick="window.__issue('${r.id}')">Mark issued</button></td>
    </tr>`).join("") || `<tr><td colspan="4" class="muted">Nothing awaiting issue.</td></tr>`;
}

function renderIssued(items) {
  $("issuedBody").innerHTML = items.map((r) => `
    <tr>
      <td>${r.requesterEmail}</td><td>${r.tool}</td><td>${r.dateIssued || ""}</td>
      <td><button class="small" onclick="window.__return('${r.id}')">Mark returned</button></td>
    </tr>`).join("") || `<tr><td colspan="4" class="muted">Nothing awaiting return.</td></tr>`;
}

function renderAll(items) {
  $("allBody").innerHTML = items.map((r) => `
    <tr>
      <td>${r.requesterEmail}</td><td>${r.tool}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>${r.startDate} – ${r.endDate}</td>
    </tr>`).join("");
}

async function setStatus(id, fields) {
  await updateDoc(doc(db, "requests", id), fields);
}

window.__approve = async (id) => {
  const snap = await getDoc(doc(db, "requests", id));
  const r = snap.data();
  await setStatus(id, { status: "Approved" });
  sendEmail(emailjsConfig.templates.decision, {
    to_email: r.requesterEmail, tool: r.tool, decision: "Approved", comments: "",
  });
};

window.__reject = async (id) => {
  const comment = prompt("Reason for rejection (shown to the requester):") || "";
  const snap = await getDoc(doc(db, "requests", id));
  const r = snap.data();
  await setStatus(id, { status: "Rejected", approverComments: comment });
  sendEmail(emailjsConfig.templates.decision, {
    to_email: r.requesterEmail, tool: r.tool, decision: "Rejected", comments: comment,
  });
};

window.__issue = async (id) => {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await getDoc(doc(db, "requests", id));
  const r = snap.data();
  await setStatus(id, { status: "Issued", dateIssued: today });
  sendEmail(emailjsConfig.templates.issued, {
    to_email: r.requesterEmail, tool: r.tool, issue_date: today, end_date: r.endDate,
  });
};

window.__return = async (id) => {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await getDoc(doc(db, "requests", id));
  const r = snap.data();
  await setStatus(id, { status: "Returned", dateReturned: today });
  sendEmail(emailjsConfig.templates.returned, {
    to_email: `${r.requesterEmail},${currentUser.email}`, tool: r.tool, return_date: today,
  });
};

// ---- Helpers ----
function sendEmail(templateId, params) {
  if (!window.emailjs || emailjsConfig.publicKey === "YOUR_EMAILJS_PUBLIC_KEY") {
    console.warn("EmailJS not configured — skipping email send.", templateId, params);
    return;
  }
  emailjs.send(emailjsConfig.serviceId, templateId, params).catch((err) => console.error("Email failed:", err));
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
