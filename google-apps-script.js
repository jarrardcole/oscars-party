// =============================================================
// OSCAR POOL 2026 — Google Apps Script Backend
// =============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com and create a new project
//    (or open a blank Google Sheet → Extensions → Apps Script)
// 2. Paste this entire file into Code.gs (replace any existing code)
// 3. Click Deploy → New deployment
// 4. Select type: "Web app"
// 5. Set "Execute as": Me
// 6. Set "Who has access": Anyone
// 7. Click Deploy and authorize when prompted
// 8. Copy the Web App URL → paste it into the Admin panel in index.html
// =============================================================

function getOrCreateSheet(name, defaultValue) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (defaultValue !== undefined) {
      sheet.getRange('A1').setValue(defaultValue);
    }
  }
  return sheet;
}

function doGet(e) {
  try {
    var sheet = getOrCreateSheet('State', '{}');
    var stateData = sheet.getRange('A1').getValue();
    var updated = sheet.getRange('A2').getValue();

    // Get pending picks
    var picksSheet = getOrCreateSheet('Picks', '[]');
    var picksRaw = picksSheet.getRange('A1').getValue();
    var pendingPicks = [];
    if (picksRaw) {
      try { pendingPicks = JSON.parse(picksRaw); } catch(e) {}
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      state: stateData,
      lastUpdated: updated,
      pendingPicks: pendingPicks
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Submit picks from a player
    if (payload.action === 'submit_picks') {
      var picksSheet = getOrCreateSheet('Picks', '[]');
      var existing = [];
      var raw = picksSheet.getRange('A1').getValue();
      if (raw) {
        try { existing = JSON.parse(raw); } catch(e) { existing = []; }
      }

      // Upsert player picks
      var found = false;
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].name && existing[i].name.toLowerCase() === payload.player.name.toLowerCase()) {
          existing[i] = payload.player;
          found = true;
          break;
        }
      }
      if (!found) {
        existing.push(payload.player);
      }

      picksSheet.getRange('A1').setValue(JSON.stringify(existing));

      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Admin publishes full state
    if (payload.action === 'publish') {
      var sheet = getOrCreateSheet('State', '{}');
      sheet.getRange('A1').setValue(JSON.stringify(payload.state));
      sheet.getRange('A2').setValue(new Date().toISOString());

      // Clear pending picks since admin state includes all merged players
      var picksSheet = getOrCreateSheet('Picks', '[]');
      picksSheet.getRange('A1').setValue('[]');

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        lastUpdated: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
