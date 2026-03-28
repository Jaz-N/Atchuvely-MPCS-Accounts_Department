/**
 * VALI EAST NORTHERN DIVISION MPCS LTD
 * Google Apps Script Backend
 * ─────────────────────────────────────────────
 *
 * SETUP:
 *  1. Open Google Sheets → Extensions → Apps Script
 *  2. Paste this entire file into Code.gs
 *  3. Create two sheets:
 *     - "Users"    → columns: Username | Password
 *     - "Projects" → columns: Name | Link | Description | DateAdded
 *  4. Add at least one user row in Users sheet
 *  5. Deploy → New deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  6. Copy the Web App URL into app.js (APPS_SCRIPT_URL)
 */

// ─── Sheet Names ────────────────────────────
var USERS_SHEET    = "Users";
var PROJECTS_SHEET = "Projects";

// ─── Column Indices (1-based) ───────────────
var USER_COL_USERNAME    = 1;
var USER_COL_PASSWORD    = 2;

var PROJ_COL_NAME        = 1;
var PROJ_COL_LINK        = 2;
var PROJ_COL_DESCRIPTION = 3;
var PROJ_COL_DATE        = 4;

// ─────────────────────────────────────────────
//  HTTP HANDLERS
// ─────────────────────────────────────────────

function doPost(e) {
  var result;
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    if      (action === "login")      result = handleLogin(payload);
    else if (action === "getProjects") result = handleGetProjects();
    else if (action === "addProject") result = handleAddProject(payload);
    else                              result = { success: false, message: "Unknown action: " + action };
  } catch (err) {
    result = { success: false, message: "Server error: " + err.message };
  }

  return buildResponse(result);
}

// Allow GET for simple connectivity testing
function doGet(e) {
  return buildResponse({ success: true, message: "MPCS API is running." });
}

// ─────────────────────────────────────────────
//  ACTION HANDLERS
// ─────────────────────────────────────────────

function handleLogin(payload) {
  var username = (payload.username || "").trim().toLowerCase();
  var password = (payload.password || "").trim();

  if (!username || !password) {
    return { success: false, message: "Username and password are required." };
  }

  var sheet = getSheet(USERS_SHEET);
  var data  = sheet.getDataRange().getValues();

  // Skip header row (row 0)
  for (var i = 1; i < data.length; i++) {
    var rowUser = String(data[i][USER_COL_USERNAME - 1] || "").trim().toLowerCase();
    var rowPass = String(data[i][USER_COL_PASSWORD - 1] || "").trim();

    if (rowUser === username && rowPass === password) {
      return { success: true, message: "Login successful.", username: rowUser };
    }
  }

  return { success: false, message: "Invalid username or password." };
}

function handleGetProjects() {
  var sheet = getSheet(PROJECTS_SHEET);
  var data  = sheet.getDataRange().getValues();

  var projects = [];

  // Skip header row (row 0)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = String(row[PROJ_COL_NAME - 1] || "").trim();
    if (!name) continue; // skip empty rows

    projects.push({
      name:        name,
      link:        String(row[PROJ_COL_LINK - 1] || "").trim(),
      description: String(row[PROJ_COL_DESCRIPTION - 1] || "").trim(),
      dateAdded:   String(row[PROJ_COL_DATE - 1] || "").trim()
    });
  }

  return { success: true, projects: projects };
}

function handleAddProject(payload) {
  var name        = (payload.name        || "").trim();
  var link        = (payload.link        || "").trim();
  var description = (payload.description || "").trim();

  if (!name)  return { success: false, message: "Project name is required." };
  if (!link)  return { success: false, message: "Project link is required." };

  var sheet     = getSheet(PROJECTS_SHEET);
  var dateAdded = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY

  sheet.appendRow([name, link, description, dateAdded]);

  return { success: true, message: "Project added successfully." };
}

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────

function getSheet(name) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet "' + name + '" not found. Please create it in your spreadsheet.');
  }
  return sheet;
}

function buildResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
