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

    // Auto-fetch winners from Wikipedia
    if (payload.action === 'fetch_winners') {
      var winners = scrapeWikipediaWinners();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        winners: winners.winners,
        matched: winners.matched,
        raw: winners.raw
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

// =============================================================
// WIKIPEDIA SCRAPER — 98th Academy Awards
// =============================================================
function scrapeWikipediaWinners() {
  var url = 'https://en.wikipedia.org/wiki/98th_Academy_Awards';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var html = response.getContentText();

  // Category name mappings: Wikipedia section text → our category IDs
  var categoryMap = {
    'Best Picture': 'best-picture',
    'Best Director': 'best-director',
    'Best Actor': 'best-actor',
    'Best Actress': 'best-actress',
    'Best Supporting Actor': 'supporting-actor',
    'Best Supporting Actress': 'supporting-actress',
    'Best Original Screenplay': 'original-screenplay',
    'Best Adapted Screenplay': 'adapted-screenplay',
    'Best Animated Feature Film': 'animated-feature',
    'Best Animated Feature': 'animated-feature',
    'Best International Feature Film': 'international-feature',
    'Best International Feature': 'international-feature',
    'Best Documentary Feature Film': 'documentary-feature',
    'Best Documentary Feature': 'documentary-feature',
    'Best Cinematography': 'cinematography',
    'Best Film Editing': 'film-editing',
    'Best Original Score': 'original-score',
    'Best Original Song': 'original-song',
    'Best Production Design': 'production-design',
    'Best Costume Design': 'costume-design',
    'Best Sound': 'sound',
    'Best Visual Effects': 'visual-effects',
    'Best Makeup and Hairstyling': 'makeup',
    'Best Casting': 'casting',
    'Best Animated Short Film': 'animated-short',
    'Best Animated Short': 'animated-short',
    'Best Live Action Short Film': 'live-action-short',
    'Best Live Action Short': 'live-action-short',
    'Best Documentary Short Film': 'documentary-short',
    'Best Documentary Short Subject': 'documentary-short',
    'Best Documentary Short': 'documentary-short'
  };

  // Nominee label → nominee ID mappings (must match index.html CATEGORIES)
  var nomineeMap = {
    // Best Picture
    'Bugonia': 'bugonia', 'F1': 'f1', 'Frankenstein': 'frankenstein',
    'Hamnet': 'hamnet', 'Marty Supreme': 'marty-supreme',
    'One Battle After Another': 'one-battle', 'Sinners': 'sinners',
    'The Secret Agent': 'secret-agent', 'Sentimental Value': 'sentimental-value',
    'Sirāt': 'sirat', 'Sirat': 'sirat',
    // Best Director
    'Chloé Zhao': 'zhao', 'Chloe Zhao': 'zhao',
    'Joachim Trier': 'trier', 'Josh Safdie': 'safdie',
    'Paul Thomas Anderson': 'pta', 'Ryan Coogler': 'coogler',
    // Best Actor
    'Timothée Chalamet': 'chalamet', 'Timothee Chalamet': 'chalamet',
    'Leonardo DiCaprio': 'dicaprio', 'Ethan Hawke': 'hawke',
    'Michael B. Jordan': 'jordan', 'Wagner Moura': 'moura',
    // Best Actress
    'Jessie Buckley': 'buckley', 'Rose Byrne': 'byrne',
    'Kate Hudson': 'hudson', 'Renate Reinsve': 'reinsve',
    'Emma Stone': 'stone',
    // Supporting Actor
    'Benicio Del Toro': 'deltoro', 'Benicio del Toro': 'deltoro',
    'Jacob Elordi': 'elordi', 'Delroy Lindo': 'lindo',
    'Sean Penn': 'penn', 'Stellan Skarsgård': 'skarsgard',
    'Stellan Skarsgard': 'skarsgard',
    // Supporting Actress
    'Elle Fanning': 'fanning', 'Inga Ibsdotter Lilleaas': 'lilleaas',
    'Amy Madigan': 'madigan', 'Wunmi Mosaku': 'mosaku',
    'Teyana Taylor': 'taylor',
    // Original Screenplay
    'Blue Moon': 'os-bluemoon',
    'It Was Just an Accident': 'os-accident',
    // Adapted Screenplay
    'Train Dreams': 'as-traindreams',
    // Animated Feature
    'Arco': 'arco', 'Elio': 'elio', 'KPop Demon Hunters': 'kpop',
    'Little Amélie or the Character of Rain': 'amelie',
    'Zootopia 2': 'zootopia2',
    // Documentary Feature
    'The Alabama Solution': 'alabama',
    'Come See Me in the Good Light': 'goodlight',
    'Cutting through Rocks': 'cuttingrocks',
    'Mr. Nobody Against Putin': 'mrnobody',
    'The Perfect Neighbor': 'perfectneighbor',
    // Animated Short
    'Butterfly': 'ans-butterfly', 'Papillon': 'ans-butterfly',
    'Forevergreen': 'ans-forevergreen',
    'The Girl Who Cried Pearls': 'ans-pearls',
    'Retirement Plan': 'ans-retirement',
    'The Three Sisters': 'ans-threesisters',
    // Live Action Short
    'A Friend of Dorothy': 'las-dorothy',
    'The Singers': 'las-singers',
    'Two People Exchanging Saliva': 'las-saliva',
    // Documentary Short
    'All the Empty Rooms': 'ds-emptyrooms',
    'All the Walls Came Down': 'ds-walls',
    'Bad Hostage': 'ds-badhostage',
    'Cashing Out': 'ds-cashingout',
    'Avatar: Fire and Ash': 'vfx-avatar'
  };

  var winners = {};
  var matched = [];
  var rawFindings = [];

  // Strategy: Wikipedia marks winners in bold within category tables
  // Look for table rows where the first entry is bolded (the winner)
  // Also look for class="background-color" or similar winner indicators

  // Parse each category section
  for (var catName in categoryMap) {
    var catId = categoryMap[catName];
    if (winners[catId]) continue; // Already found

    // Find the category heading in the HTML
    var headingPattern = catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var sectionRegex = new RegExp(headingPattern + '[\\s\\S]*?(?=<h[23]|$)', 'i');
    var sectionMatch = html.match(sectionRegex);

    if (sectionMatch) {
      var section = sectionMatch[0].substring(0, 5000); // Limit search area

      // Wikipedia uses <b> or <strong> for winners, or background-color styling
      // Look for bold text within table cells (the winner is usually the first bolded entry)
      var boldPattern = /<b>([^<]+)<\/b>/gi;
      var boldMatch;
      var foundWinner = false;

      while ((boldMatch = boldPattern.exec(section)) !== null) {
        var boldText = boldMatch[1].replace(/<[^>]+>/g, '').trim();

        // Try direct match
        if (nomineeMap[boldText]) {
          var nomId = nomineeMap[boldText];
          // For screenplay categories, prefix correctly
          if (catId === 'original-screenplay' && !nomId.startsWith('os-')) {
            nomId = 'os-' + nomId.toLowerCase().replace(/\s+/g, '');
          }
          if (catId === 'adapted-screenplay' && !nomId.startsWith('as-')) {
            nomId = 'as-' + nomId.toLowerCase().replace(/\s+/g, '');
          }
          winners[catId] = nomId;
          matched.push(catName + ' → ' + boldText);
          foundWinner = true;
          break;
        }

        // Try partial match
        for (var nomLabel in nomineeMap) {
          if (boldText.indexOf(nomLabel) !== -1 || nomLabel.indexOf(boldText) !== -1) {
            var nomId2 = nomineeMap[nomLabel];
            if (catId === 'original-screenplay' && !nomId2.startsWith('os-')) continue;
            if (catId === 'adapted-screenplay' && !nomId2.startsWith('as-')) continue;
            winners[catId] = nomId2;
            matched.push(catName + ' → ' + boldText + ' (partial: ' + nomLabel + ')');
            foundWinner = true;
            break;
          }
        }
        if (foundWinner) break;
      }

      if (!foundWinner) {
        rawFindings.push(catName + ': no bold winner found');
      }
    } else {
      rawFindings.push(catName + ': section not found on page');
    }
  }

  // Also try a simpler approach: look for winner class styling
  var styledWinnerPattern = /style="[^"]*background[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
  var styledMatch;
  while ((styledMatch = styledWinnerPattern.exec(html)) !== null) {
    var winnerName = styledMatch[1].trim();
    if (nomineeMap[winnerName] && !Object.values(winners).includes(nomineeMap[winnerName])) {
      rawFindings.push('Styled winner found: ' + winnerName);
    }
  }

  return {
    winners: winners,
    matched: matched,
    raw: rawFindings
  };
}
