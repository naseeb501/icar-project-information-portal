import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.2";
import { APP_CONFIG, isSupabaseConfigured } from "./config.js";
import { createCombinedWord, downloadBlob } from "./word-export.js";

const loginCard = document.getElementById("loginCard");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginNotice = document.getElementById("loginNotice");
const dashboard = document.getElementById("dashboard");
const dashboardNotice = document.getElementById("dashboardNotice");
const rowsElement = document.getElementById("submissionRows");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const downloadAllBtn = document.getElementById("downloadAllBtn");

let allSubmissions = [];
let visibleSubmissions = [];

const supabase = isSupabaseConfigured()
  ? createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY)
  : null;

function setNotice(element, message, type = "info") {
  element.textContent = message;
  element.className = `notice show ${type}`;
}

function clearNotice(element) {
  element.textContent = "";
  element.className = "notice";
  if (element === dashboardNotice) element.style.margin = "16px 18px 0";
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function createTextCell(value, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = value || "—";
  return td;
}

function createPeopleCell(project) {
  const td = document.createElement("td");
  const lines = [];
  if (project.pi_name) lines.push(`PI: ${project.pi_name}`);
  if (Array.isArray(project.co_pis) && project.co_pis.length) {
    lines.push(`Co-PI(s): ${project.co_pis.join("; ")}`);
  }
  td.textContent = lines.join("\n") || "—";
  td.style.whiteSpace = "pre-line";
  return td;
}

function flattenForTable(submissions) {
  const flattened = [];
  submissions.forEach((submission) => {
    (submission.projects || []).forEach((project) => {
      flattened.push({ submission, project });
    });
  });
  return flattened;
}

function renderRows() {
  rowsElement.replaceChildren();
  const flattened = flattenForTable(visibleSubmissions);

  flattened.forEach(({ submission, project }, index) => {
    const row = document.createElement("tr");
    row.appendChild(createTextCell(String(index + 1)));

    const scientistCell = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = submission.scientist_name || "—";
    const designation = document.createElement("div");
    designation.className = "muted";
    designation.textContent = submission.designation || "";
    scientistCell.append(strong, designation);
    row.appendChild(scientistCell);
    row.appendChild(createTextCell(submission.division));

    row.appendChild(createTextCell(project.title));

    const roleCell = document.createElement("td");
    const roleBadge = document.createElement("span");
    roleBadge.className = "badge";
    roleBadge.textContent = project.role || "—";
    roleCell.appendChild(roleBadge);
    row.appendChild(roleCell);

    row.appendChild(createPeopleCell(project));
    row.appendChild(createTextCell(project.funding_agency));
    row.appendChild(createTextCell(project.category));
    row.appendChild(createTextCell(project.status));
    row.appendChild(createTextCell(formatDate(submission.submitted_at, true), "muted"));
    rowsElement.appendChild(row);
  });

  emptyState.classList.toggle("hidden", flattened.length > 0);
  document.getElementById("respondentCount").textContent = String(visibleSubmissions.length);
  document.getElementById("projectCount").textContent = String(flattened.length);
  const latest = visibleSubmissions
    .map((submission) => submission.submitted_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  document.getElementById("lastSubmission").textContent = latest ? formatDate(latest, true) : "—";
  downloadAllBtn.disabled = flattened.length === 0;
}

function searchableProjectText(project) {
  return [
    project.title,
    project.role,
    project.pi_name,
    ...(project.co_pis || []),
    project.funding_agency,
    project.category,
    project.status,
    project.remarks,
  ].join(" ").toLowerCase();
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    visibleSubmissions = structuredClone(allSubmissions);
    renderRows();
    return;
  }

  visibleSubmissions = allSubmissions.flatMap((submission) => {
    const respondentText = [
      submission.scientist_name,
      submission.designation,
      submission.division,
      submission.employee_id,
      submission.email,
      submission.mobile,
    ].join(" ").toLowerCase();

    if (respondentText.includes(query)) return [structuredClone(submission)];

    const matchingProjects = (submission.projects || []).filter((project) =>
      searchableProjectText(project).includes(query),
    );

    return matchingProjects.length
      ? [{ ...structuredClone(submission), projects: matchingProjects }]
      : [];
  });

  renderRows();
}

async function loadSubmissions() {
  clearNotice(dashboardNotice);
  setNotice(dashboardNotice, "Loading submissions…", "info");

  try {
    const { data, error } = await supabase
      .from(APP_CONFIG.TABLE_NAME)
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    allSubmissions = data || [];
    visibleSubmissions = structuredClone(allSubmissions);
    searchInput.value = "";
    renderRows();
    clearNotice(dashboardNotice);
  } catch (error) {
    console.error(error);
    setNotice(
      dashboardNotice,
      "Submissions could not be loaded. Confirm that this login email matches the administrator email used in the SQL policy.",
      "error",
    );
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearNotice(loginNotice);

  if (!supabase) {
    setNotice(loginNotice, "Supabase is not configured in config.js.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  try {
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    setNotice(loginNotice, "Sign-in failed. Please verify the authorized email and password.", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In";
  }
}

async function handleAuth(session) {
  const signedIn = Boolean(session?.user);
  loginCard.classList.toggle("hidden", signedIn);
  dashboard.classList.toggle("show", signedIn);
  if (signedIn) await loadSubmissions();
}

async function downloadCombined() {
  if (!visibleSubmissions.length) return;
  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = "Preparing Word file…";
  try {
    const blob = await createCombinedWord(visibleSubmissions);
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `DSRE-consolidated-project-information-${date}.docx`);
    setNotice(dashboardNotice, "Consolidated Word file generated successfully.", "success");
  } catch (error) {
    console.error(error);
    setNotice(dashboardNotice, "The Word file could not be generated. Please try again.", "error");
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = "Download Word File";
  }
}

loginForm.addEventListener("submit", handleLogin);
searchInput.addEventListener("input", applySearch);
document.getElementById("refreshBtn").addEventListener("click", loadSubmissions);
downloadAllBtn.addEventListener("click", downloadCombined);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
});

if (!supabase) {
  setNotice(
    loginNotice,
    "Setup required: add your Supabase project URL and publishable/anon key in config.js.",
    "error",
  );
} else {
  const { data: { session } } = await supabase.auth.getSession();
  await handleAuth(session);
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    window.setTimeout(() => handleAuth(nextSession), 0);
  });
}
