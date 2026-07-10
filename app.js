import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.2";
import { APP_CONFIG, isSupabaseConfigured } from "./config.js";
import { createPersonalWord, downloadBlob, safeFilename } from "./word-export.js";

const form = document.getElementById("projectForm");
const projectList = document.getElementById("projectList");
const projectTemplate = document.getElementById("projectTemplate");
const copiTemplate = document.getElementById("copiTemplate");
const notice = document.getElementById("formNotice");
const submitBtn = document.getElementById("submitBtn");
const downloadOwnBtn = document.getElementById("downloadOwn");

const supabase = isSupabaseConfigured()
  ? createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY)
  : null;

function showNotice(message, type = "info") {
  notice.textContent = message;
  notice.className = `notice show ${type}`;
  notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearNotice() {
  notice.textContent = "";
  notice.className = "notice";
}

function addCoPi(projectCard, initialValue = "") {
  const fragment = copiTemplate.content.cloneNode(true);
  const row = fragment.querySelector("[data-copi-row]");
  const input = fragment.querySelector("[data-copi-name]");
  input.value = initialValue;
  row.querySelector("[data-remove-copi]").addEventListener("click", () => row.remove());
  projectCard.querySelector("[data-copi-list]").appendChild(fragment);
}

function updateProjectNumbers() {
  const cards = [...projectList.querySelectorAll("[data-project]")];
  cards.forEach((card, index) => {
    card.querySelector("[data-project-number]").textContent = String(index + 1);
    card.querySelector("[data-project-heading-number]").textContent = String(index + 1);
    const removeButton = card.querySelector("[data-remove-project]");
    removeButton.disabled = cards.length === 1;
    removeButton.title = cards.length === 1 ? "At least one project is required" : "Remove this project";
  });
}

function updateRoleRequirement(projectCard) {
  const role = projectCard.querySelector('[data-field="role"]').value;
  const piInput = projectCard.querySelector('[data-field="pi_name"]');
  const isCoPi = role === "Co-Principal Investigator (Co-PI)";
  piInput.required = isCoPi;
  piInput.disabled = !isCoPi;
  piInput.placeholder = isCoPi
    ? "Enter the name of the Principal Investigator"
    : "Automatically set to the respondent when role is PI";
  if (!isCoPi) piInput.value = "";
  piInput.closest(".field").querySelector("label").classList.toggle("required", isCoPi);
}

function addProject(initial = null) {
  const fragment = projectTemplate.content.cloneNode(true);
  const card = fragment.querySelector("[data-project]");

  card.querySelector("[data-add-copi]").addEventListener("click", () => addCoPi(card));
  card.querySelector("[data-remove-project]").addEventListener("click", () => {
    card.remove();
    updateProjectNumbers();
  });
  card.querySelector('[data-field="role"]').addEventListener("change", () => updateRoleRequirement(card));

  if (initial) {
    Object.entries(initial).forEach(([key, value]) => {
      const field = card.querySelector(`[data-field="${key}"]`);
      if (field && !Array.isArray(value)) field.value = value ?? "";
    });
    (initial.co_pis || []).forEach((name) => addCoPi(card, name));
  } else {
    addCoPi(card);
  }

  projectList.appendChild(fragment);
  updateRoleRequirement(card);
  updateProjectNumbers();
}

function collectSubmission() {
  const scientistName = document.getElementById("scientistName").value.trim();
  const projects = [...projectList.querySelectorAll("[data-project]")].map((card) => {
    const getValue = (name) => card.querySelector(`[data-field="${name}"]`)?.value.trim() || "";
    const role = getValue("role");
    const enteredCoPis = [...card.querySelectorAll("[data-copi-name]")]
      .map((input) => input.value.trim())
      .filter(Boolean);
    const coPis = role === "Co-Principal Investigator (Co-PI)"
      ? [scientistName, ...enteredCoPis].filter(
          (name, index, values) => name && values.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index,
        )
      : enteredCoPis;

    return {
      title: getValue("title"),
      role,
      pi_name: role === "Principal Investigator (PI)" ? scientistName : getValue("pi_name"),
      co_pis: coPis,
      funding_agency: getValue("funding_agency"),
      category: getValue("category"),
      status: getValue("status"),
      start_date: getValue("start_date") || null,
      end_date: getValue("end_date") || null,
      remarks: getValue("remarks"),
    };
  });

  return {
    scientist_name: scientistName,
    designation: document.getElementById("designation").value.trim(),
    employee_id: document.getElementById("employeeId").value.trim(),
    email: document.getElementById("email").value.trim(),
    mobile: document.getElementById("mobile").value.trim(),
    division: document.getElementById("division").value,
    institute: "ICAR Research Complex for NEH Region, Umiam, Meghalaya",
    projects,
    submitted_at: new Date().toISOString(),
  };
}

function validateDates(submission) {
  for (const [index, project] of submission.projects.entries()) {
    if (project.start_date && project.end_date && project.start_date > project.end_date) {
      showNotice(`In Project ${index + 1}, the end date cannot be earlier than the start date.`, "error");
      return false;
    }
  }
  return true;
}

function validateForm() {
  clearNotice();
  if (!form.checkValidity()) {
    form.reportValidity();
    showNotice("Please complete all required fields before continuing.", "error");
    return false;
  }
  if (!projectList.querySelector("[data-project]")) {
    showNotice("Please add at least one project.", "error");
    return false;
  }
  return true;
}

async function downloadOwnCopy() {
  if (!validateForm()) return;
  const submission = collectSubmission();
  if (!validateDates(submission)) return;

  downloadOwnBtn.disabled = true;
  downloadOwnBtn.textContent = "Preparing Word file…";
  try {
    const blob = await createPersonalWord(submission);
    const name = safeFilename(submission.scientist_name);
    downloadBlob(blob, `${name}-project-information.docx`);
    showNotice("Your Word copy has been generated successfully.", "success");
  } catch (error) {
    console.error(error);
    showNotice("The Word file could not be generated. Please try again.", "error");
  } finally {
    downloadOwnBtn.disabled = false;
    downloadOwnBtn.textContent = "Download My Word Copy";
  }
}

async function submitForm(event) {
  event.preventDefault();
  if (!validateForm()) return;
  if (document.getElementById("website").value) return;

  const submission = collectSubmission();
  if (!validateDates(submission)) return;

  if (!supabase) {
    showNotice(
      "Central submission is not configured yet. The administrator must add the Supabase URL and publishable key in config.js. You can still download your Word copy.",
      "error",
    );
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const payload = { ...submission };
    delete payload.submitted_at;

    const { error } = await supabase.from(APP_CONFIG.TABLE_NAME).insert(payload);
    if (error) throw error;

    showNotice(
      "Project information submitted successfully. You may also download your Word copy for your records.",
      "success",
    );
    form.dataset.submitted = "true";
  } catch (error) {
    console.error(error);
    showNotice(
      "Submission could not be saved. Please check your internet connection or contact the portal administrator.",
      "error",
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Project Information";
  }
}

document.getElementById("addProjectTop").addEventListener("click", () => addProject());
document.getElementById("addProjectBottom").addEventListener("click", () => addProject());
downloadOwnBtn.addEventListener("click", downloadOwnCopy);
form.addEventListener("submit", submitForm);

addProject();

if (!isSupabaseConfigured()) {
  showNotice(
    "Preview mode: the form and personal Word download work now. Add Supabase settings in config.js to enable central submissions.",
    "info",
  );
}
