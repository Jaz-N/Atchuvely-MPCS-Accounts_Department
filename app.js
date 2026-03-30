/**
 * VALI EAST NORTHERN DIVISION MPCS LTD
 * Management Dashboard — Frontend Logic
 *
 * Replace APPS_SCRIPT_URL with your deployed Google Apps Script Web App URL.
 */

// ─────────────────────────────────────────────
//  CONFIGURATION — EDIT THIS
// ─────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxawqgBZRS8JeMqKAkoeRJr1IMdk2JgePEIew2AcM7AFQM84aUwaLC99dGbBQmIV_XfHA/exec";

// Session key names
const SESSION_USER_KEY = "mpcs_user";
const SESSION_TOKEN_KEY = "mpcs_token";

// ─────────────────────────────────────────────
//  PAGE DETECTION
// ─────────────────────────────────────────────
const isLoginPage = document.body.classList.contains("login-page");
const isDashboardPage = document.body.classList.contains("dashboard-page");

// ─────────────────────────────────────────────
//  SESSION HELPERS
// ─────────────────────────────────────────────
function setSession(username) {
  const token = btoa(username + ":" + Date.now());
  sessionStorage.setItem(SESSION_USER_KEY, username);
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

function getSession() {
  return {
    username: sessionStorage.getItem(SESSION_USER_KEY),
    token: sessionStorage.getItem(SESSION_TOKEN_KEY),
  };
}

function clearSession() {
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

function isLoggedIn() {
  const { username, token } = getSession();
  return !!(username && token);
}

// ─────────────────────────────────────────────
//  ROUTE GUARDS
// ─────────────────────────────────────────────
if (isLoginPage && isLoggedIn()) {
  window.location.href = "dashboard.html";
}

if (isDashboardPage && !isLoggedIn()) {
  window.location.href = "index.html";
}

// ─────────────────────────────────────────────
//  LOGIN PAGE LOGIC
// ─────────────────────────────────────────────
if (isLoginPage) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
}

async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorBanner = document.getElementById("login-error");
  const errorText = document.getElementById("login-error-text");
  const btn = document.getElementById("login-btn");

  hideElement(errorBanner);

  if (!username || !password) {
    errorText.textContent = "Please enter both username and password.";
    showElement(errorBanner);
    return;
  }

  setLoading(btn, true);

  try {
    const res = await apiCall({ action: "login", username, password });

    if (res.success) {
      setSession(username);
      window.location.href = "dashboard.html";
    } else {
      errorText.textContent = res.message || "Invalid credentials. Please try again.";
      showElement(errorBanner);
    }
  } catch (err) {
    errorText.textContent = "Connection error. Check your Apps Script URL and try again.";
    showElement(errorBanner);
    console.error("Login error:", err);
  } finally {
    setLoading(btn, false);
  }
}

function togglePassword() {
  const field = document.getElementById("password");
  field.type = field.type === "password" ? "text" : "password";
}

// ─────────────────────────────────────────────
//  DASHBOARD PAGE LOGIC
// ─────────────────────────────────────────────
let allProjects = [];

if (isDashboardPage) {
  const { username } = getSession();
  const nameEl = document.getElementById("user-name-sidebar");
  const avatarEl = document.getElementById("user-avatar");
  if (nameEl) nameEl.textContent = username || "User";
  if (avatarEl) avatarEl.textContent = (username || "U").charAt(0).toUpperCase();

  loadProjects();
}

async function loadProjects() {
  const grid = document.getElementById("projects-grid");
  const loading = document.getElementById("projects-loading");
  const empty = document.getElementById("projects-empty");
  const totalEl = document.getElementById("total-projects");
  const activeEl = document.getElementById("active-projects");

  showElement(loading);
  hideElement(grid);
  hideElement(empty);

  try {
    const res = await apiCall({ action: "getProjects" });

    if (res.success) {
      allProjects = res.projects || [];

      if (totalEl) totalEl.textContent = allProjects.length;
      if (activeEl) activeEl.textContent = allProjects.length;

      if (allProjects.length === 0) {
        showElement(empty);
      } else {
        renderProjects(allProjects);
        showElement(grid);
      }
    } else {
      showError("Failed to load data: " + (res.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Load error:", err);
    showError("Could not connect to the backend. Verify your Apps Script URL.");
  } finally {
    hideElement(loading);
  }
}

function renderProjects(projects) {
  const grid = document.getElementById("projects-grid");
  grid.innerHTML = "";

  projects.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="project-card-top"></div>
      <div class="project-card-body">
        <span class="project-index">${String(i + 1).padStart(2, "0")}</span>
        <h3 class="project-name">${escapeHtml(p.name)}</h3>
        <p class="project-desc">${escapeHtml(p.description) || "No description provided."}</p>
      </div>
      <div class="project-card-footer">
        <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="btn-open">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
          Access
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterProjects() {
  const query = document.getElementById("search-input").value.toLowerCase();
  const filtered = allProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      (p.description || "").toLowerCase().includes(query)
  );

  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-empty");

  if (filtered.length === 0) {
    hideElement(grid);
    showElement(empty);
    const h3 = document.querySelector(".empty-state h3");
    const pg = document.querySelector(".empty-state p");
    if (h3) h3.textContent = "No matching modules";
    if (pg) pg.textContent = "Try a different search term.";
  } else {
    showElement(grid);
    hideElement(empty);
    renderProjects(filtered);
  }
}

// ─────────────────────────────────────────────
//  REGISTER MODULE (in Settings)
// ─────────────────────────────────────────────
async function handleAddProject() {
  const name = document.getElementById("proj-name").value.trim();
  const link = document.getElementById("proj-link").value.trim();
  const desc = document.getElementById("proj-desc").value.trim();

  const successBanner = document.getElementById("add-success");
  const errorBanner = document.getElementById("add-error");
  const errorText = document.getElementById("add-error-text");
  const btn = document.getElementById("add-btn");

  hideElement(successBanner);
  hideElement(errorBanner);

  if (!name) {
    errorText.textContent = "Module name is required.";
    showElement(errorBanner);
    return;
  }
  if (!link) {
    errorText.textContent = "Access link is required.";
    showElement(errorBanner);
    return;
  }
  if (!isValidUrl(link)) {
    errorText.textContent = "Please enter a valid URL (include https://).";
    showElement(errorBanner);
    return;
  }

  setLoading(btn, true);

  try {
    const res = await apiCall({ action: "addProject", name, link, description: desc });

    if (res.success) {
      showElement(successBanner);
      clearAddForm();
      loadProjects();
      successBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      errorText.textContent = res.message || "Failed to register module.";
      showElement(errorBanner);
    }
  } catch (err) {
    errorText.textContent = "Connection error. Please try again.";
    showElement(errorBanner);
    console.error("Register error:", err);
  } finally {
    setLoading(btn, false);
  }
}

function clearAddForm() {
  ["proj-name", "proj-link", "proj-desc"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// ─────────────────────────────────────────────
//  CHANGE PASSWORD
// ─────────────────────────────────────────────
async function handleChangePassword() {
  const current = document.getElementById("pwd-current").value;
  const newPwd = document.getElementById("pwd-new").value;
  const confirm = document.getElementById("pwd-confirm").value;

  const successBanner = document.getElementById("pwd-success");
  const errorBanner = document.getElementById("pwd-error");
  const errorText = document.getElementById("pwd-error-text");
  const btn = document.getElementById("pwd-btn");

  hideElement(successBanner);
  hideElement(errorBanner);

  if (!current || !newPwd || !confirm) {
    errorText.textContent = "All password fields are required.";
    showElement(errorBanner);
    return;
  }
  if (newPwd !== confirm) {
    errorText.textContent = "New passwords do not match.";
    showElement(errorBanner);
    return;
  }
  if (newPwd.length < 6) {
    errorText.textContent = "New password must be at least 6 characters.";
    showElement(errorBanner);
    return;
  }

  setLoading(btn, true);

  const { username } = getSession();

  try {
    const res = await apiCall({
      action: "changePassword",
      username,
      currentPassword: current,
      newPassword: newPwd,
    });

    if (res.success) {
      showElement(successBanner);
      clearPasswordForm();
      successBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      errorText.textContent = res.message || "Failed to update password.";
      showElement(errorBanner);
    }
  } catch (err) {
    errorText.textContent = "Connection error. Please try again.";
    showElement(errorBanner);
    console.error("Change password error:", err);
  } finally {
    setLoading(btn, false);
  }
}

function clearPasswordForm() {
  ["pwd-current", "pwd-new", "pwd-confirm"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// ─────────────────────────────────────────────
//  VIEW SWITCHING
// ─────────────────────────────────────────────
function showView(viewId, navEl) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));

  const view = document.getElementById("view-" + viewId);
  if (view) view.classList.add("active");
  if (navEl) navEl.classList.add("active");

  closeSidebar();
  return false;
}

// ─────────────────────────────────────────────
//  MOBILE SIDEBAR
// ─────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle("open");
  overlay.classList.toggle("visible", isOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

// ─────────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────────
function handleLogout() {
  clearSession();
  window.location.href = "index.html";
}

// ─────────────────────────────────────────────
//  API COMMUNICATION
// ─────────────────────────────────────────────
async function apiCall(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// ─────────────────────────────────────────────
//  UTILITY HELPERS
// ─────────────────────────────────────────────
function showElement(el) {
  if (el) el.classList.remove("hidden");
}

function hideElement(el) {
  if (el) el.classList.add("hidden");
}

function setLoading(btn, isLoading) {
  if (!btn) return;
  const text = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");
  btn.disabled = isLoading;
  if (text) text.classList.toggle("hidden", isLoading);
  if (loader) loader.classList.toggle("hidden", !isLoading);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function showError(msg) {
  console.error(msg);
}
