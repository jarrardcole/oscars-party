# Oscar Pool 2026

## Overview
Prediction game for the 98th Academy Awards (March 15, 2026). Players pick winners for all 24 categories before the ceremony, then hosts mark winners live. Real-time leaderboard with tiered scoring.

Hosted by Matt & Caitlyn.

## Architecture
- **Single HTML file** (`index.html`) — no build process, no dependencies
- **Google Sheets sync** via Apps Script (`google-apps-script.js`)
- **localStorage** for local state persistence
- **Admin mode** via `?mode=admin` URL parameter

## Scoring Tiers
| Points | Categories |
|--------|------------|
| 5 | Best Picture |
| 4 | Director, Lead Actor, Lead Actress |
| 3 | Supporting Actor/Actress, Original/Adapted Screenplay |
| 2 | Animated Feature, International, Documentary, Cinematography, Editing, Score, Song, Production Design, Costume Design |
| 1 | Sound, VFX, Makeup, Casting, Animated Short, Live Action Short, Documentary Short |

**Max: 54 points** | **Tiebreaker:** Predict Sinners' total wins (16 nominations)

## URLs
- Guest: `jarrardcole.com/oscars2026`
- Admin: `jarrardcole.com/oscars2026admin`
- Hosting: GitHub Pages from this repo

## Google Sheets Setup
1. Create blank Google Sheet
2. Extensions → Apps Script → paste `google-apps-script.js` into Code.gs
3. Deploy → Web app → Anyone can access
4. Copy URL → paste into Admin panel in the app

## Key Files
- `index.html` — Complete app (single file)
- `google-apps-script.js` — Backend for Google Sheets sync
