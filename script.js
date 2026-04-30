/* ---------- GLOBAL STATE ---------- */
let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;

let totalPitchesBullpen = 0;
let totalStrikesBullpen = 0;

let totalPitches = 0;          // live-BP / games
let totalStrikesLiveBP = 0;

let mode = "bullpen";          // current tool mode
let pitchType = "";

let actionLog = [];            // for UNDO
let foulsAfterTwoStrikes = 0;

let pitchLocation = 0;
let pitchId = 0;

let points = 0;                // Points-mode only
let comboPitchTypes = [];
let maxPotentialPoints = 0;

let isHeatMapMode = false;
let pendingInPlayType = null;  // holds 'groundball'|'flyball'|'linedrive'|'popup' between steps
let isIntendedMissMapMode = false;
let isTaggingMode = false;

let pitchTags = {};
let missMapSelectedPitchType = 'all';
const EMOJI_FIRE = '\u{1F525}';
const EMOJI_SKULL = '\u{1F480}';

// --------- NEW â€“ ATâ€'BAT SUMMARY ---------
// This array stores summary information for each completed atâ€'bat when running
// in Live BP or Points mode.  Each entry looks like:
// { atBatNumber, batterId, result, pitchCount }
let atBats = [];

/* ---------- NEW â€“ BATTER STATE ---------- */
let batters = [];              // [{id,name,hand}]
let currentBatterId = null;    // id of batter selected in dropdown
let batterAutoId = 1;          // simple incremental id

/* ---------- NEW â€” PITCHER STATE ---------- */
let pitchers          = [];        // [{id,name,hand}]
let currentPitcherId  = null;      // id of pitcher currently on the mound
let pitcherAutoId     = 1;         // simple incremental id

/* ---------- GRID POV ---------- */
let gridPOV = localStorage.getItem('gridPOV') || 'catcher';

/* ---------- RE-TAG STATE ---------- */
let retagSelectedPitchId = null;

/* ---------- PER-PITCH STORAGE  ---------- */
/* All pitches for every batter live here.  */
let pitchData = [];
/* Each entry:
{
  pitchId, pitchType, location, result, outcome,
  prePitchCount:{balls,strikes},
  postPitchCount:{balls,strikes},
  pitchNumber, atBatNumber,
  batterId,              //  <â€” NEW
}
*/

/* ---------- AT-BAT STATE ---------- */
let atBatNumber = 1;
let isNewAtBat = false;
let ballCount = 0;
let pitchCountInAtBat = 0;

/* ---------- INTENDED-ZONE MODE ---------- */
let intendedZoneModePitchCount = 0;
let intendedZoneTotalExactHits = 0;
let intendedZoneAccuracyPoints = 0;
let intendedZoneData = [];
let currentIntendedPitchType = "";
let currentIntendedZone = null;
let currentActualZone = null;



/** Define strike locations (locations 1-9) **/
const strikeLocations = [];
for (let i = 1; i <= 9; i++) {
  strikeLocations.push(i);
}

/** Define shadow locations (locations 10-25) **/
const shadowLocations = [];
for (let i = 10; i <= 25; i++) {
  shadowLocations.push(i);
}

/** Define non-competitive locations (locations 26-49) **/
const nonCompetitiveLocations = [];
for (let i = 26; i <= 49; i++) {
  nonCompetitiveLocations.push(i);
}

/** Define ball locations (locations 10-49) **/
const ballLocations = [];
for (let i = 10; i <= 49; i++) {
  ballLocations.push(i);
}

const zoneGridOrder = [
  26,27,28,29,30,31,32,
  33,10,11,12,13,14,34,
  35,15, 1, 2, 3,16,36,
  37,17, 4, 5, 6,18,38,
  39,19, 7, 8, 9,20,40,
  41,21,22,23,24,25,42,
  43,44,45,46,47,48,49
];


/* ---------- SESSION PERSISTENCE ---------- */
function saveSession() {
  try {
    localStorage.setItem('bullpenSession', JSON.stringify({
      pitchData, atBats, batters, pitchers,
      currentBatterId, currentPitcherId,
      pitchId, batterAutoId, pitcherAutoId, atBatNumber,
      pitchTags, mode,
      pitchCount, strikeCount, ballCount, raceWins,
      totalPitches, totalPitchesBullpen, totalStrikesBullpen, totalStrikesLiveBP,
      foulsAfterTwoStrikes, isNewAtBat, pitchCountInAtBat,
    }));
  } catch (e) { console.warn('saveSession failed:', e); }
}

function loadSession() {
  try {
    const raw = localStorage.getItem('bullpenSession');
    if (!raw) return;
    const s = JSON.parse(raw);
    pitchData          = s.pitchData          || [];
    atBats             = s.atBats             || [];
    batters            = s.batters            || [];
    pitchers           = s.pitchers           || [];
    currentBatterId    = s.currentBatterId    ?? null;
    currentPitcherId   = s.currentPitcherId   ?? null;
    pitchId            = s.pitchId            ?? 0;
    batterAutoId       = s.batterAutoId       ?? 1;
    pitcherAutoId      = s.pitcherAutoId      ?? 1;
    atBatNumber        = s.atBatNumber        ?? 1;
    pitchTags          = s.pitchTags          || {};
    mode               = s.mode               || 'liveBP';
    pitchCount         = s.pitchCount         ?? 0;
    strikeCount        = s.strikeCount        ?? 0;
    ballCount          = s.ballCount          ?? 0;
    raceWins           = s.raceWins           ?? 0;
    totalPitches       = s.totalPitches       ?? 0;
    totalPitchesBullpen   = s.totalPitchesBullpen   ?? 0;
    totalStrikesBullpen   = s.totalStrikesBullpen   ?? 0;
    totalStrikesLiveBP    = s.totalStrikesLiveBP    ?? 0;
    foulsAfterTwoStrikes  = s.foulsAfterTwoStrikes  ?? 0;
    isNewAtBat            = s.isNewAtBat            ?? false;
    pitchCountInAtBat     = s.pitchCountInAtBat     ?? 0;
  } catch (e) { console.warn('loadSession failed:', e); }
}

function clearSession() {
  if (!confirm('Start a new session? All current data will be cleared.')) return;
  localStorage.removeItem('bullpenSession');
  location.reload();
}

/* ---------- 2K CONVERSION ---------- */
function compute2KConversion(data) {
  const reached  = new Set();
  const converted = new Set();
  data.forEach(p => {
    if (p.prePitchCount && p.prePitchCount.strikes === 2) {
      reached.add(p.atBatNumber);
      if (['whiff', 'calledStrike'].includes(p.outcome)) {
        converted.add(p.atBatNumber);
      }
    }
  });
  return { reached: reached.size, converted: converted.size };
}

// Save the pitch log state
document.getElementById('bullpenModeBtn').addEventListener('click', function() {
  mode = "bullpen";
  toggleMode();
});

document.getElementById('liveBPModeBtn').addEventListener('click', function() {
  mode = "liveBP";
  toggleMode();
});

document.getElementById('putawayModeBtn').addEventListener('click', function() {
  mode = "putaway";
  toggleMode();
});

document.getElementById('pointsModeBtn').addEventListener('click', function() {
  mode = "points";
  toggleMode();
});

document.getElementById('intendedZoneModeBtn').addEventListener('click', function() {
  mode = "intendedZone";
  toggleMode();
});

const statsDrawer = document.getElementById('statsDrawer');
const statsDrawerToggle = document.getElementById('statsDrawerToggle');
if (statsDrawer && statsDrawerToggle) {
  statsDrawerToggle.addEventListener('click', () => {
    statsDrawer.classList.toggle('is-expanded');
    statsDrawer.classList.toggle('is-peek');
  });
}

const pitchLogDrawer = document.getElementById('pitchLogDrawer');
const pitchLogDrawerToggle = document.getElementById('pitchLogDrawerToggle');
if (pitchLogDrawer && pitchLogDrawerToggle) {
  pitchLogDrawerToggle.addEventListener('click', () => {
    const isExpanded = pitchLogDrawer.classList.toggle('is-expanded');
    pitchLogDrawerToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  });
}

/* === BATTER UI handlers === */
document.getElementById('addBatterBtn').addEventListener('click', () => {
  const name = document.getElementById('newBatterName').value.trim();
  const hand = document.getElementById('newBatterHand').value;
  if (!name) { alert('Enter a name'); return; }
  addBatter(name, hand);
  document.getElementById('newBatterName').value = '';
});

// Update batter selection: call render functions for pitch log and at-bat log
document.getElementById('batterSelect').addEventListener('change', e => {
  const v = e.target.value;
  currentBatterId = v === '' ? null : Number(v);   // null = show all
  updateLiveStats();
  updateHeatMap();
  renderPitchLog();   // NEW: re-render pitch log according to selected batter
  renderAtBatLog();   // NEW: re-render at-bat summary according to selected batter
});

/* === PITCHER UI handlers === */
document.getElementById('addPitcherBtn').addEventListener('click', () => {
  const name = document.getElementById('newPitcherName').value.trim();
  const hand = document.getElementById('newPitcherHand').value;   // 'LH' | 'RH'
  if (!name) { alert('Enter a pitcher name'); return; }
  addPitcher(name, hand);
  document.getElementById('newPitcherName').value = '';
});

document.getElementById('pitcherSelect').addEventListener('change', e => {
  const v = e.target.value;
  currentPitcherId = v === '' ? null : Number(v);
  updateLiveStats();
  updateHeatMap();
  renderPitchLog();
  renderAtBatLog();
  updateUI();
});

/* === ADD: simple helpers (place near top of script.js) === */
function setDisplay(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? '' : 'none'; // empty string restores default display
}

function setWrapperLayout(layoutClass) {
  const wrapper = document.getElementById('liveBPWrapper');
  if (!wrapper) return;
  wrapper.classList.remove('points-mode', 'intended-zone-layout');
  if (layoutClass) wrapper.classList.add(layoutClass);
}

/**
 * Show/Hide Live BP extras depending on mode.
 * Hidden in Points Mode. Visible in Live BP Mode.
 * Why: Points Mode shouldn't display batter/pitcher controls, live stats, or side tables.
 */
function applyLiveBPVisibilityForMode(currentMode) {
  const showLiveExtras = currentMode === 'liveBP';
  setDisplay('batterManagement', showLiveExtras);
  setDisplay('pitcherControls',  showLiveExtras);
  setDisplay('liveStatsBoard',   showLiveExtras);
  setDisplay('sideLeft',         showLiveExtras); // By Pitch Type table
  setDisplay('sideRight',        showLiveExtras); // By Batter table
  setDisplay('statsDrawer',      showLiveExtras);
  setDisplay('pitchLogDrawer',   showLiveExtras);
  if (!showLiveExtras && pitchLogDrawer) {
    pitchLogDrawer.classList.remove('is-expanded');
    if (pitchLogDrawerToggle) pitchLogDrawerToggle.setAttribute('aria-expanded', 'false');
  }
}

function updateStatsDrawerSummary(countText, totalPitchesText, strikePctText) {
  const countEl = document.getElementById('drawerStatCount');
  const pitchesEl = document.getElementById('drawerStatPitches');
  const strikeEl = document.getElementById('drawerStatStrike');
  if (!countEl || !pitchesEl || !strikeEl) return;
  countEl.textContent = countText;
  pitchesEl.textContent = totalPitchesText;
  strikeEl.textContent = strikePctText;
}

function toggleMode() {
  // 1. **ESSENTIAL CLEANUP:** Reset all mode-specific flags and hidden states
  const heatBtn = document.getElementById('heatMapBtn');
  if (heatBtn) heatBtn.innerText = 'HEAT MAP';
  
  // Reset heat map and miss map flags
  isHeatMapMode = false;
  isIntendedMissMapMode = false;
  
  // Hide overlays (assuming these helper functions exist)
  if (typeof hideHeatMap === 'function') hideHeatMap();
  if (typeof hideIntendedMissMap === 'function') hideIntendedMissMap();
  
  // Set wrapper layout class to default (removes points-mode, etc.)
  setWrapperLayout('');

  // 2. **Switch Layouts** (Force all panels to hide, then show the correct one)
  document.getElementById('bullpenMode').style.display   = 'none';
  document.getElementById('liveBPMode').style.display    = 'none';
  document.getElementById('putawayButtons').style.display = 'none';
  document.getElementById('pointsContainer').style.display = 'none';
  document.getElementById('intendedZoneMode').style.display = 'none';
  
  
  if (mode === "bullpen") {
    document.getElementById('bullpenMode').style.display   = 'block';
    document.getElementById('bullpenTitle').innerText     = 'R2K Mode';

  } else if (mode === "liveBP") {
    document.getElementById('liveBPMode').style.display    = 'block';
    document.getElementById('modeTitle').innerText         = 'Live BP Mode';
    setDisplay('mainPanel', true);
    
    // show Live BP extras (batter/pitcher UI, live stats, side tables)
    applyLiveBPVisibilityForMode('liveBP');
    showPitchTypeSelection();
    updateLiveStats();
    renderPitchLog();
    renderAtBatLog();

  } else if (mode === "putaway") {
    // Putaway mode often uses the bullpen UI
    document.getElementById('bullpenMode').style.display   = 'block';
    document.getElementById('bullpenTitle').innerText     = 'Putaway Mode';

  } else if (mode === "points") {
    document.getElementById('liveBPMode').style.display    = 'block';
    document.getElementById('modeTitle').innerText         = 'Points Mode';
    document.getElementById('pointsContainer').style.display = 'block';
    setDisplay('mainPanel', true);
    setWrapperLayout('points-mode');

    // hide Live BP extras in Points Mode
    applyLiveBPVisibilityForMode('points');
    showComboPitchTypeSelection();
    renderPitchLog();
    renderAtBatLog();

  } else if (mode === "intendedZone") {
    document.getElementById('liveBPMode').style.display    = 'block';
    document.getElementById('intendedZoneMode').style.display = 'block';
    setDisplay('mainPanel', false);
    applyLiveBPVisibilityForMode('points');
    setWrapperLayout('intended-zone-layout');

    // Highlight zone buttons
    document.querySelectorAll("#intendedZoneSelection .intendedZoneBtn").forEach(btn => {
      let zone = parseInt(btn.id.replace("intendedZone-", ""));
      if (strikeLocations.includes(zone))        btn.classList.add("strikeZone");
      else if (shadowLocations.includes(zone))   btn.classList.add("shadowZone");
      else if (nonCompetitiveLocations.includes(zone)) btn.classList.add("nonCompetitiveZone");
    });

    document.getElementById('intendedZonePitchTypeSelection').style.display = 'block';
    document.getElementById('intendedZoneSelection').style.display = 'none';
    document.getElementById('actualZoneSelection').style.display   = 'none';
    document.getElementById('intendedZoneTitle').innerText = 'Intended Zone';
  }

  // 3. Final count/mode resets
  resetCount();
  resetIntendedZoneMode();
}
document.getElementById('strikeBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState());
  strikeCount++;
  pitchCount++;
  if (mode === "bullpen" || mode === "putaway") {
    totalPitchesBullpen++;
    totalStrikesBullpen++;
  } else {
    totalPitches++;
    totalStrikesLiveBP++;
  }
  updateUI();
  updateCurrentCount();

  if (mode === "bullpen" && strikeCount === 2) {
    raceWins++;
    logCount(strikeCount, ballCount, false); // Use ballCount here
    resetCount();
    updateRaceWins();
  }

  if (mode === "putaway" && strikeCount === 2) {
    showPutawayOptions();
  } else {
    checkRaceCondition();
  }
});


document.getElementById('ballBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState());
  pitchCount++;
  ballCount++; // Increment ballCount
  if (mode === "bullpen" || mode === "putaway") {
    totalPitchesBullpen++;
  } else {
    totalPitches++;
  }
  updateUI();
  updateCurrentCount();

  if (mode === "bullpen" && ballCount === 2) {
    logCount(strikeCount, ballCount, false); // Use ballCount here
    resetCount();
  }

  if (mode === "putaway" && ballCount === 2) {
    logCount(strikeCount, ballCount, false);
    resetCount();
  }

  checkRaceCondition();
});


document.getElementById('kBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState());
  raceWins++;
  pitchCount++;
  strikeCount++;
  totalPitchesBullpen++;
  totalStrikesBullpen++;

  const balls = ballCount;
  const strikes = strikeCount;
  
  logCount(strikes, balls, true);
  resetCount();
  updateUI();
  resetPutawayButtons();
});

document.getElementById('noKBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState());
  pitchCount++;
  totalPitchesBullpen++;
  logCount(strikeCount, ballCount, false);
  resetCount();
  updateUI();
  resetPutawayButtons();
});

document.getElementById('undoBtn').addEventListener('click', function() {
  if (actionLog.length > 0) {
    const previousState = actionLog.pop();
    restoreState(previousState);
    updateLiveStats();
    restorePitchLog(previousState.pitchLog);
    restoreCompletedCountLog(previousState.completedCountLog);
    // NEW: re-render logs to honor current batter filter
    renderPitchLog();
    renderAtBatLog();
    if (mode === "points") updatePointsDisplay();
    updateUI();
  }
});

document.getElementById('nextBatterBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState()); // Save the current state for undo functionality
  isNewAtBat = true;
  resetCount(); // Reset the current count to 0-0
  updateCurrentCount(); // Update the UI to reflect the new count
  advanceToNextBatter();
  updateUI();
});

document.querySelectorAll("#comboPitchTypeSelection .comboPitchTypeBtn").forEach(button => {
  button.addEventListener('click', function() {
    this.classList.toggle('selected');
    const pitchTypeId = this.id.replace('combo-', ''); // Remove 'combo-' prefix
    if (comboPitchTypes.includes(pitchTypeId)) {
      comboPitchTypes = comboPitchTypes.filter(pt => pt !== pitchTypeId);
    } else {
      comboPitchTypes.push(pitchTypeId);
    }
  });
});

document.querySelectorAll("#intendedZonePitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    currentIntendedPitchType = this.id.replace("intended-", "");
    document.getElementById("intendedZonePitchTypeSelection").style.display = "none";
    document.getElementById("intendedZoneSelection").style.display = "block";
  });
});

document.querySelectorAll("#intendedZoneSelection .intendedZoneBtn").forEach(button => {
  button.addEventListener('click', function() {
    let zoneId = parseInt(this.id.replace("intendedZone-", ""));
    currentIntendedZone = zoneId;
    document.getElementById("intendedZoneSelection").style.display = "none";
    document.getElementById("actualZoneSelection").style.display = "block";
  });
});

document.querySelectorAll("#actualZoneSelection .actualZoneBtn").forEach(button => {
  button.addEventListener('click', function() {
    let zoneId = parseInt(this.id.replace("actualZone-", ""));
    currentActualZone = zoneId;
    recordIntendedZonePitch();
  });
});

const missMapPitchTypeSelect = document.getElementById('missMapPitchType');
if (missMapPitchTypeSelect) {
  missMapPitchTypeSelect.addEventListener('change', () => {
    missMapSelectedPitchType = missMapPitchTypeSelect.value;
    renderMissSummaryCards();
  });
}


document.getElementById('comboSelectionDoneBtn').addEventListener('click', function() {
  updatePointsDisplay();
  showPitchTypeSelection(); // Proceed to regular pitch recording
});

document.querySelectorAll('#pitchLocationSelection .locationBtn').forEach(button => {
  button.addEventListener('click', function() {
    pitchLocation = parseInt(this.id.replace('location-', ''));  // Capture pitch location
    actionLog.push(saveCurrentState());

    if (mode === 'points') {
      // In Points Mode, process the outcome directly based on location
      processOutcomeBasedOnLocation();
    } else {
      // For other modes, proceed to outcome selection
      showOutcomeSelection();
    }
  });
});

document.querySelectorAll("#pitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pitchType = this.id;
    actionLog.push(saveCurrentState());
    if (mode === 'points') {
      const isCombo = comboPitchTypes.includes(pitchType);
      maxPotentialPoints += isCombo ? 40 : 20;
      updatePointsDisplay();
    }
    showPitchLocationSelection();
  });
});

document.getElementById('tagPitchBtn').addEventListener('click', function() {
  if (!isTaggingMode) {
    enterTaggingMode();
  } else {
    exitTaggingMode();
  }
});

document.querySelectorAll('#flagSelection .flagBtn').forEach(button => {
  button.addEventListener('click', function() {
    // Deselect all other flags
    document.querySelectorAll('#flagSelection .flagBtn').forEach(btn => {
      btn.classList.remove('selected');
    });
    // Select this flag
    this.classList.add('selected');
  });
});

document.getElementById('applyTagBtn').addEventListener('click', function() {
  applyTagToSelectedPitches();
});



function resetPutawayButtons() {
  document.getElementById('putawayButtons').style.display = 'none';
  document.getElementById('r2kButtons').style.display = 'block';
}

function getZoneRowCol(zoneId) {

  const zoneLookup = {
    26: [0,0], 27: [0,1], 28: [0,2], 29: [0,3], 30: [0,4], 31: [0,5], 32: [0,6],
    33: [1,0], 10: [1,1], 11: [1,2], 12: [1,3], 13: [1,4], 14: [1,5], 34: [1,6],
    35: [2,0], 15: [2,1],  1: [2,2],  2: [2,3],  3: [2,4], 16: [2,5], 36: [2,6],
    37: [3,0], 17: [3,1],  4: [3,2],  5: [3,3],  6: [3,4], 18: [3,5], 38: [3,6],
    39: [4,0], 19: [4,1],  7: [4,2],  8: [4,3],  9: [4,4], 20: [4,5], 40: [4,6],
    41: [5,0], 21: [5,1], 22: [5,2], 23: [5,3], 24: [5,4], 25: [5,5], 42: [5,6],
    43: [6,0], 44: [6,1], 45: [6,2], 46: [6,3], 47: [6,4], 48: [6,5], 49: [6,6]
  };
  return zoneLookup[zoneId] || [ -1, -1 ];
}

function getDistanceBetweenZones(zoneIdA, zoneIdB) {
  let [rA, cA] = getZoneRowCol(zoneIdA);
  let [rB, cB] = getZoneRowCol(zoneIdB);
  // We can use simple Euclidean or Manhattan distance. Letâ€™s pick Euclidean:
  let rowDiff = rA - rB;
  let colDiff = cA - cB;
  let dist = Math.sqrt(rowDiff*rowDiff + colDiff*colDiff);
  return dist;
}

function getPitcherHand(pitcherId) {
  return pitchers.find(p => p.id === pitcherId)?.hand ?? 'RH';
}

// Per-pitch override wins; falls back to the batter's registered hand.
function getBatterHand(p) {
  return p.handOverride ?? batters.find(b => b.id === p.batterId)?.hand ?? '';
}

function setAbHand(atBatNumber, newHand) {
  pitchData.forEach(p => {
    if (p.atBatNumber === atBatNumber) p.handOverride = newHand;
  });
  const abEntry = atBats.find(ab => ab.atBatNumber === atBatNumber);
  if (abEntry) abEntry.handOverride = newHand;
  renderPitchLog();
  renderAtBatLog();
  updateHeatMap();
  updateLiveStats();
}

// RH pitcher: arm side = catcher's left = low columns (≤2); LH pitcher: arm side = high columns (≥4).
// This is consistent regardless of gridPOV because CSS scaleX(-1) remaps click targets symmetrically.
function isArmSideCol(col, pitcherHand) {
  return pitcherHand === 'RH' ? col <= 2 : col >= 4;
}

function isGloveSideCol(col, pitcherHand) {
  return pitcherHand === 'RH' ? col >= 4 : col <= 2;
}

function resetIntendedZoneMode() {
  intendedZoneModePitchCount = 0;
  intendedZoneTotalExactHits = 0;
  intendedZoneAccuracyPoints = 0;
  intendedZoneData = [];
  updateIntendedZoneUI();
}

function recordIntendedZonePitch() {
  intendedZoneModePitchCount++;

  // Calculate the miss distance
  let dist = getDistanceBetweenZones(currentIntendedZone, currentActualZone);

  let pointsAwarded = 0;
  if (dist === 0) {
    pointsAwarded = 5;
    intendedZoneTotalExactHits++;
  } else if (dist <= 1) {
    pointsAwarded = 2;
  } else if (dist <= 2) {
    pointsAwarded = 1;
  } else {
    pointsAwarded = -1; // or 0, if you want no negative
  }
  intendedZoneAccuracyPoints += pointsAwarded;

  // Log it in our array
  const pitchEntry = {
    pitchNumber: intendedZoneModePitchCount,
    pitchType: currentIntendedPitchType,
    intendedZone: currentIntendedZone,
    actualZone: currentActualZone,
    distance: dist,
    points: pointsAwarded
  };
  intendedZoneData.push(pitchEntry);

  // Update UI
  updateIntendedZoneUI();
  logIntendedZonePitch(pitchEntry);

  // Reset for next pitch
  currentIntendedPitchType = "";
  currentIntendedZone = null;
  currentActualZone = null;

  // Show pitch type selection again, so user can pick next pitch
  document.getElementById("actualZoneSelection").style.display = "none";
  document.getElementById("intendedZonePitchTypeSelection").style.display = "block";

  if (isIntendedMissMapMode) {
    buildMissMapPitchOptions();
    renderMissSummaryCards();
  }
}

function updateIntendedZoneUI() {
  document.getElementById("intendedZoneTotalPitches").innerText =
    "Total Pitches: " + intendedZoneModePitchCount;
  document.getElementById("intendedZoneAccuracyPoints").innerText =
    "Accuracy Points: " + intendedZoneAccuracyPoints;
  document.getElementById("intendedZoneExactHits").innerText =
    "Exact Hits: " + intendedZoneTotalExactHits;

  let hitPct = 0;
  if (intendedZoneModePitchCount > 0) {
    hitPct = (intendedZoneTotalExactHits / intendedZoneModePitchCount) * 100;
  }
  document.getElementById("intendedZoneHitPercentage").innerText =
    "Hit %: " + hitPct.toFixed(2);
}


function logIntendedZonePitch(pitchEntry) {
  let logUl = document.getElementById("intendedZoneLog");
  let li = document.createElement("li");
  li.textContent = `#${pitchEntry.pitchNumber} â€“ ${pitchEntry.pitchType.toUpperCase()}
    | Intended: ${pitchEntry.intendedZone}
    | Actual: ${pitchEntry.actualZone}
    | Dist: ${pitchEntry.distance.toFixed(2)}
    | Pts: ${pitchEntry.points}`;
  logUl.appendChild(li);
}

document.getElementById("exportIntendedZoneBtn").addEventListener("click", exportIntendedZoneStats);

function exportIntendedZoneStats() {
  if (intendedZoneData.length === 0) {
    alert("No data to export yet!");
    return;
  }

  let totalPitches = intendedZoneData.length;
  let sumDistance = 0;
  let pitchTypeMap = {}; // keyed by pitchType => {count, sumDist, exactHits, zoneMap{}}
  let zoneTargetMap = {}; // keyed by intendedZone => { count, sumDist }

  intendedZoneData.forEach(pitch => {
    sumDistance += pitch.distance;

    // Tally by pitchType
    let pt = pitch.pitchType;
    if (!pitchTypeMap[pt]) {
      pitchTypeMap[pt] = {
        count: 0,
        sumDist: 0,
        exactHits: 0
      };
    }
    pitchTypeMap[pt].count++;
    pitchTypeMap[pt].sumDist += pitch.distance;
    if (pitch.distance === 0) {
      pitchTypeMap[pt].exactHits = (pitchTypeMap[pt].exactHits || 0) + 1;
    }

    // Tally by intended zone
    let iz = pitch.intendedZone;
    if (!zoneTargetMap[iz]) {
      zoneTargetMap[iz] = { count: 0, sumDist: 0, exactHits: 0 };
    }
    zoneTargetMap[iz].count++;
    zoneTargetMap[iz].sumDist += pitch.distance;
    if (pitch.distance === 0) {
      zoneTargetMap[iz].exactHits++;
    }
  });

  let avgDist = sumDistance / totalPitches;
  let exactHitsCount = intendedZoneData.filter(p => p.distance === 0).length;
  let exactHitPct = (exactHitsCount / totalPitches) * 100;

  let lines = [];
  lines.push(`Total Pitches: ${totalPitches}`);
  lines.push(`Avg Distance Off: ${avgDist.toFixed(2)}`);
  lines.push(`Exact Hits: ${exactHitsCount} (${exactHitPct.toFixed(2)}%)`);
  lines.push(`Total Accuracy Points: ${intendedZoneAccuracyPoints}`);

  lines.push("\nBreakdown by Pitch Type:\n");
  Object.keys(pitchTypeMap).forEach(pt => {
    let data = pitchTypeMap[pt];
    let avgDistPT = data.sumDist / data.count;
    let exactPctPT = (data.exactHits / data.count) * 100;
    lines.push(`Pitch Type: ${pt.toUpperCase()}`);
    lines.push(`  Count: ${data.count}`);
    lines.push(`  Avg Distance: ${avgDistPT.toFixed(2)}`);
    lines.push(`  Exact Hits: ${data.exactHits} (${exactPctPT.toFixed(2)}%)`);
  });

  lines.push("\nPerformance by Intended Zone:\n");
  Object.keys(zoneTargetMap).forEach(z => {
    let zData = zoneTargetMap[z];
    let zAvgDist = zData.sumDist / zData.count;
    let zExactPct = (zData.exactHits / zData.count) * 100;
    lines.push(`  Intended Zone ${z}: count=${zData.count}, avgDist=${zAvgDist.toFixed(2)}, exactHit%=${zExactPct.toFixed(2)}`);
  });

  // For convenience, we can copy to clipboard:
  let exportText = lines.join("\n");
  navigator.clipboard.writeText(exportText)
    .then(() => {
      console.log("Intended Zone stats copied to clipboard.");
      alert("Intended Zone stats copied to clipboard!");
    })
    .catch(err => {
      console.error("Failed to copy:", err);
      alert("Failed to copy stats to clipboard.");
    });
}

function updateHeatMap () {
  const activePitch  = [...document.querySelectorAll('#pitchFilterBtns  .filterToggleBtn.active')].map(b => b.dataset.value);
  const activeResult = [...document.querySelectorAll('#resultFilterBtns .filterToggleBtn.active')].map(b => b.dataset.value);
  const fPitchAll  = activePitch.includes('all')  || activePitch.length  === 0;
  const fResultAll = activeResult.includes('all') || activeResult.length === 0;
  const fCount  = document.getElementById('filterCount').value;
  const fBatter = document.getElementById('filterBatter').value;

  const locationCounts = Array(50).fill(0);

  pitchData.forEach(p => {
    if (!fPitchAll  && !activePitch.includes(p.pitchType)) return;

    // Batter filter
    if (fBatter !== 'all') {
      if (fBatter === 'L' || fBatter === 'R') {
        const hand = getBatterHand(p);
        if (hand !== fBatter) return;
      } else if (fBatter.startsWith('id:')) {
        const wantId = Number(fBatter.slice(3));
        if (p.batterId !== wantId) return;
      }
    }

    // Count bucket filter
    const preStrikes = (p.prePitchCount && typeof p.prePitchCount.strikes === 'number')
      ? p.prePitchCount.strikes
      : 0;
    const bucket = preStrikes === 2 ? 'late' : 'early';
    if (fCount !== 'all' && bucket !== fCount) return;

    // Result/outcome filter
    if (!fResultAll && !activeResult.includes(p.outcome)) return;

    locationCounts[p.location]++;
  });

  const maxCount = Math.max(...locationCounts);

  for (let loc = 1; loc <= 49; loc++) {
    const btn = document.getElementById('heatmap-' + loc);
    if (!btn) continue;
    const cnt = locationCounts[loc];
    btn.style.backgroundColor = getHeatMapColor(cnt, maxCount);
    btn.innerText = cnt;
  }
}

function saveCurrentState() {
  return {
    pitchCount,
    strikeCount,
    ballCount,
    pitchCountInAtBat,
    raceWins,
    totalPitchesBullpen,
    totalStrikesBullpen,
    totalPitches,
    totalStrikesLiveBP,
    foulsAfterTwoStrikes,
    mode,
    maxPotentialPoints,
    pitchTags: JSON.parse(JSON.stringify(pitchTags)),
    pitchData: pitchData.slice(),
    pitchId,
    pendingInPlayType,
    atBats: JSON.parse(JSON.stringify(atBats)),
    atBatNumber,
    isNewAtBat,
    pitchLog: document.getElementById('pitchLog').innerHTML, // Save the pitch log state
    completedCountLog: document.getElementById('countLog').innerHTML // Save completed count log state
  };
}

function restoreState(state) {
  pitchCount = state.pitchCount;
  strikeCount = state.strikeCount;
  ballCount = state.ballCount;
  pitchCountInAtBat = state.pitchCountInAtBat;
  raceWins = state.raceWins;
  totalPitchesBullpen = state.totalPitchesBullpen;
  totalStrikesBullpen = state.totalStrikesBullpen;
  totalPitches = state.totalPitches;
  totalStrikesLiveBP = state.totalStrikesLiveBP;
  foulsAfterTwoStrikes = state.foulsAfterTwoStrikes;
  mode = state.mode;
  maxPotentialPoints = state.maxPotentialPoints || 0;
  pitchTags = state.pitchTags || {};
  pitchData = state.pitchData.slice();
  pitchId = state.pitchId;
  pendingInPlayType = state.pendingInPlayType ?? null;
  if (state.atBats) atBats = JSON.parse(JSON.stringify(state.atBats));
  if (state.atBatNumber !== undefined) atBatNumber = state.atBatNumber;
  if (state.isNewAtBat !== undefined) isNewAtBat = state.isNewAtBat;
  updatePitchLogTags();
}

function restorePitchLog(pitchLogHTML) {
  document.getElementById('pitchLog').innerHTML = pitchLogHTML;
}

function restoreCompletedCountLog(completedCountLogHTML) {
  document.getElementById('countLog').innerHTML = completedCountLogHTML;
}

function addBatter(name, hand){
  const id = batterAutoId++;
  batters.push({id,name,hand});

  if (currentBatterId === null) { // only default the *very first* batter
    currentBatterId = id;
  }
  updateBatterDropdown();
  updateHeatmapBatterFilter();
  saveSession();
}

/* --- updateBatterDropdown() --- */
function updateBatterDropdown () {
  const sel = document.getElementById('batterSelect');
  sel.innerHTML = '';

  /* â‡¢ NEW: empty option shows every batter */
  const allOpt = document.createElement('option');
  allOpt.value = '';                   // empty string â†' â€œallâ€
  allOpt.textContent = '- All Batters -';
  sel.appendChild(allOpt);

  batters.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.name} (${b.hand})`;
    sel.appendChild(opt);
  });

  sel.value = currentBatterId ?? '';   // keep current selection
}


function addPitcher (name, hand) {
  const id = pitcherAutoId++;
  pitchers.push({ id, name, hand });

  // default the very first pitcher we add
  if (currentPitcherId === null) currentPitcherId = id;

  updatePitcherDropdown();
  saveSession();
}

function updatePitcherDropdown () {
  const sel = document.getElementById('pitcherSelect');
  sel.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = ''; optAll.textContent = '- All Pitchers -';
  sel.appendChild(optAll);

  pitchers.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.hand})`;
    sel.appendChild(opt);
  });

  sel.value = currentPitcherId ?? '';
}

// Calculate strike percentage based on the log
function calculateStrikePercentageFromLog() {
  let strikes = 0;
  let totalPitches = pitchData.length;

  pitchData.forEach(pitch => {
    if (['whiff', 'calledStrike', 'foul', 'strike', 'inPlay'].includes(pitch.outcome)) {
      strikes++;
    }
  });

  return totalPitches > 0 ? (strikes / totalPitches) * 100 : 0;
}


function updateStrikePercentageDisplay(strikePercentage) {
  document.getElementById('strikePercentageLiveBP').textContent = 'Strike %: ' + strikePercentage.toFixed(2);
}

function showPitchLocationSelection() {
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('pitchLocationSelection').style.display = 'block';
}

function showOutcomeSelection() {
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('pitchLocationSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'block';
}

// â€”â€” unified Outcome Selection handler â€”â€”
document.querySelectorAll("#outcomeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    const outcome = this.id;
    actionLog.push(saveCurrentState());
    processOutcome(outcome);

    // if it wasnâ€™t an Inâ€'Play subâ€'flow, go right back to pitchâ€'type
    if (outcome !== 'inPlay' && outcome !== 'hbp') {
      document.getElementById('outcomeSelection').style.display   = 'none';
      document.getElementById('inPlaySelection').style.display    = 'none';
      document.getElementById('pitchTypeSelection').style.display = 'block';
    }
    // if it *was* inPlay, let showInPlaySelection() have kept the inPlay panel up
  });
});


function processOutcome(outcome) {
  // Capture counts before we touch anything
  const previousCount = {
    balls: ballCount,
    strikes: strikeCount,
    pitchCount: pitchCount
  };
  let scenarioEmojis = '';

  // helper to write one row into pitchData / pitch log
  const logNow = (label, out) =>
    logPitchResult(pitchType, label, pitchLocation, scenarioEmojis, previousCount, out);

  // every click represents a pitch thrown
  pitchCount++;
  pitchCountInAtBat++;

  /* ---------------- BALL ---------------- */
  if (outcome === 'ball') {
    ballCount++;

    if (mode === 'liveBP' || mode === 'points') {
      totalPitches++;
    } else {
      totalPitchesBullpen++;
    }

    // Points mode: penalties
    if (mode === 'points') {
      let pointsToDeduct = 0;

      if (ballLocations.includes(pitchLocation)) {
        pointsToDeduct += 10; scenarioEmojis += '💀';
      }

      // Losing the race to 2 balls within first 3 pitches
      if (previousCount.balls === 1 && ballCount === 2 && strikeCount < 2 && pitchCount <= 3) {
        pointsToDeduct += 20; scenarioEmojis += '💀';
      }

      // Walk
      if (ballCount >= 4) {
        pointsToDeduct += 30; scenarioEmojis += '💀';
      }

      points -= pointsToDeduct;
      if (pointsToDeduct > 0) displayPointsDeduction(pointsToDeduct);
      updatePointsDisplay();
    }

    // **LOG THE PITCH**
    logNow('Ball', 'ball');

    // Walk handling (all modes)
    if (ballCount >= 4) {
      logCount(strikeCount, ballCount, false, true);
      if (mode === 'liveBP' || mode === 'points') {
        logAtBatResult('Walk');
        isNewAtBat = true;
      }
      resetCount();
    }

    // Bullpen: stop at 2 balls
    if (mode === 'bullpen' && ballCount === 2) {
      logCount(strikeCount, ballCount, false);
      resetCount();
    }

    checkRaceCondition();
    updateLiveStats(); updateUI();
    return;
  }

  /* --------- WHIFF / CALLED STRIKE / FOUL ---------- */
  if (['whiff', 'calledStrike', 'foul'].includes(outcome)) {
    if (outcome === 'foul') {
      if (strikeCount < 2) strikeCount++;
      else foulsAfterTwoStrikes++;        // no count change at two strikes
    } else {
      strikeCount++;
    }

    if (mode === 'liveBP' || mode === 'points') {
      totalStrikesLiveBP++; totalPitches++;
    } else {
      totalStrikesBullpen++; totalPitchesBullpen++;
    }

    // Points bonuses
    if (mode === 'points') {
      let pointsToAdd = 0;
      if (strikeLocations.includes(pitchLocation)) { pointsToAdd += 10; scenarioEmojis += '\u{1F3AF}'; }

      if (previousCount.balls === 0 && previousCount.strikes === 0 && strikeCount === 1) {
        pointsToAdd += 10; scenarioEmojis += '🚀';
      }
      if (strikeCount === 2 && previousCount.strikes === 1 && pitchCount <= 3) {
        pointsToAdd += 10; scenarioEmojis += '\u{1F3C1}';
      }
      if (strikeCount >= 3 && previousCount.strikes === 2 &&
          (pitchCount - previousCount.pitchCount) === 1) {
        pointsToAdd += 10; scenarioEmojis += 'âš¡';
      }

      if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
        pointsToAdd *= 2; scenarioEmojis += '\u{1F525}'; displayComboNotification();
      }
      points += pointsToAdd;
      updatePointsDisplay();
    }

    // **LOG THE PITCH**
    const labelMap = { whiff: 'Whiff', calledStrike: 'Called Strike', foul: 'Foul' };
    logNow(labelMap[outcome] || 'Strike', outcome);

    // race / putaway / strikeout
    if (previousCount.strikes < 2 && strikeCount === 2 &&
        mode !== 'putaway' && pitchCountInAtBat <= 3) {
      raceWins++; updateRaceWins();
    }

    if (mode === 'putaway' && strikeCount === 2) {
      showPutawayOptions();
    }

    if (strikeCount >= 3) {
      logCount(strikeCount, ballCount, true);
      if (mode === 'liveBP' || mode === 'points') logAtBatResult('Strikeout');
      isNewAtBat = true;
      resetCount();
    }

    updateLiveStats(); updateUI();
    return;
  }

  /* ------------- explicit STRIKE (points mode) ------------- */
  if (outcome === 'strike') {
    strikeCount++;

    if (mode === 'liveBP' || mode === 'points') {
      totalStrikesLiveBP++; totalPitches++;
    } else {
      totalStrikesBullpen++; totalPitchesBullpen++;
    }

    if (mode === 'points') {
      let pointsToAdd = 0;
      if (strikeLocations.includes(pitchLocation)) { pointsToAdd += 10; scenarioEmojis += '\u{1F3AF}'; }
      if (previousCount.balls === 0 && previousCount.strikes === 0 && strikeCount === 1) {
        pointsToAdd += 10; scenarioEmojis += '🚀';
      }
      if (strikeCount === 2 && previousCount.strikes === 1 && pitchCount <= 3) {
        pointsToAdd += 10; scenarioEmojis += '\u{1F3C1}';
      }
      if (strikeCount >= 3 && previousCount.strikes === 2 &&
          (pitchCount - previousCount.pitchCount) === 1) {
        pointsToAdd += 10; scenarioEmojis += 'âš¡';
      }
      if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
        pointsToAdd *= 2; scenarioEmojis += '\u{1F525}'; displayComboNotification();
      }
      points += pointsToAdd;
      updatePointsDisplay();
    }

    // **LOG THE PITCH**
    logNow('Strike', 'strike');

    if (strikeCount === 2 && mode !== 'putaway' && pitchCountInAtBat <= 3) {
      raceWins++; updateRaceWins();
    }
    if (mode === 'putaway' && strikeCount === 2) showPutawayOptions();

    if (strikeCount >= 3) {
      logCount(strikeCount, ballCount, true);
      if (mode === 'liveBP' || mode === 'points') logAtBatResult('Strikeout');
      isNewAtBat = true;
      resetCount();
    }

    updateLiveStats(); updateUI();
    return;
  }

  /* ---------------- IN PLAY ---------------- */
  if (outcome === 'inPlay') {
    // Do NOT reset counts here. Let the inPlaySelection click finish the at-bat,
    // log, then reset.
    showInPlaySelection();
    return;
  }

  /* ---------------- HBP ---------------- */
  if (outcome === 'hbp') {
    if (mode === 'liveBP' || mode === 'points') { totalPitches++; } else { totalPitchesBullpen++; }

    // **LOG WITH outcome = 'hbp'**
    logPitchResult(pitchType, 'HBP', pitchLocation, '', previousCount, 'hbp');

    if (mode === 'liveBP' || mode === 'points') { logAtBatResult('HBP'); }
    isNewAtBat = true;
    resetCount();
    resetForNextPitch();
    updateLiveStats(); updateUI();
    return;
  }
}

function processOutcomeBasedOnLocation() {
  let outcome = '';

  if (strikeLocations.includes(pitchLocation)) {
    outcome = 'strike';
  } else if (shadowLocations.includes(pitchLocation)) {
    outcome = 'ball'; // Shadow zone counts as a ball but may have different logic in Points Mode
  } else if (nonCompetitiveLocations.includes(pitchLocation)) {
    outcome = 'ball'; // Non-competitive zone is a ball, perhaps with more severe penalties in Points Mode
  } else {
    outcome = 'unknown';
  }

  actionLog.push(saveCurrentState());
  processOutcome(outcome);

  // After recording the pitch in Points Mode, return to pitch-type selection
  // while keeping the current count intact.
  resetForNextPitch(false);
}

/* ---------- LIVE STATS ---------- */
/*  helper â€“ returns an empty counter object for swing, csw, â€¦  */
function makeCounters () {
  const base = {}; ['swing','csw','ipo','iz','ooz','strike','fly','gb','ld','pu','inPlayOuts','inPlayHits','gbOut','fbOut','ldOut','puOut','gbHit','fbHit','ldHit','puHit'].forEach(k=>base[k]=0);
  return { all:{...base}, early:{...base}, late:{...base} };
}

/* early = strikes < 2 | late = strikes == 2
   â”€ The six â€œheadlineâ€ numbers (and the early/late rows underneath)
     are ALWAYS calculated from *every* pitch in pitchData.
   â”€ The two tables underneath still respect the dropdown filter. */

const DONUT_C = 2 * Math.PI * 24; // 150.796 — circumference for r=24

function updateDonut(circleId, textId, value) {
  const circle = document.getElementById(circleId);
  const text   = document.getElementById(textId);
  if (!circle) return;
  const v = Math.max(0, Math.min(100, value));
  circle.style.strokeDashoffset = DONUT_C * (1 - v / 100);
  circle.style.stroke = getTigersPercentColor(v);
  if (text) text.textContent = v.toFixed(1);
}

const BB_COLORS = { fly: '#5b8fc9', gb: '#d4652a', ld: '#4a9e6e', pu: '#a855c9' };

function updateBattedBallDonut(fly, gb, ld, pu, total) {
  const valEl = document.getElementById('donut-val-bb');
  if (valEl) valEl.textContent = String(total);

  const segments = [
    { id: 'donut-bb-fly', count: fly },
    { id: 'donut-bb-gb',  count: gb },
    { id: 'donut-bb-ld',  count: ld },
    { id: 'donut-bb-pu',  count: pu }
  ];

  let offset = 0;
  segments.forEach(seg => {
    const el = document.getElementById(seg.id);
    if (!el) return;
    const pct = total > 0 ? (seg.count / total) : 0;
    const arcLen = DONUT_C * pct;
    el.style.strokeDasharray = `${arcLen} ${DONUT_C - arcLen}`;
    el.style.strokeDashoffset = String(-offset);
    offset += arcLen;
  });
}

function updateLiveStats () {
  const swingEl = document.getElementById('stat-swing');
  const tpBody  = document.querySelector('#tbl-pitchType tbody');
  const btBody  = document.querySelector('#tbl-batter tbody');
  if (!swingEl || !tpBody || !btBody) {
    console.warn('Live BP DOM not present; skipping updateLiveStats');
    return;
  }

  /* ----- choose the two datasets ----- */
  // allData: selected pitcher's pitches across all batters (headline stats)
  const allData = pitchData.filter(p => {
    if (currentPitcherId && p.pitcherId !== currentPitcherId) return false;
    return true;
  });
  // filtered: same pitcher, further narrowed to selected batter (table stats)
  const filtered = allData.filter(p => {
    if (currentBatterId && p.batterId !== currentBatterId) return false;
    return true;
  });

  /* ----- build counters from ALL DATA (for the headline row) ----- */
  const totals = makeCounters();
  const denoms = { all:0, early:0, late:0 };

  allData.forEach(p=>{
    const bucket = p.prePitchCount.strikes===2 ? 'late' : 'early';
    denoms.all++; denoms[bucket]++;

    const swing  = ['whiff','foul'].includes(p.outcome) ||
                   (p.result||'').startsWith('In Play');
    const strike = ['whiff','calledStrike','foul','strike','inPlay']
                   .includes(p.outcome);
    const csw    = ['whiff','calledStrike'].includes(p.outcome);
    const ipo    = (p.result||'').startsWith('In Play');
    const inIZ   = strikeLocations.includes(p.location);
    const inOOZ  = shadowLocations.includes(p.location) ||
                   nonCompetitiveLocations.includes(p.location);

    if (swing)  { totals.all.swing++;  totals[bucket].swing++; }
    if (csw)    { totals.all.csw++;    totals[bucket].csw++;   }
    if (ipo)    { totals.all.ipo++;    totals[bucket].ipo++;
      const res = p.result || '';
      if (res.includes('flyball'))        { totals.all.fly++; totals[bucket].fly++; }
      else if (res.includes('groundball')){ totals.all.gb++;  totals[bucket].gb++;  }
      else if (res.includes('linedrive')) { totals.all.ld++;  totals[bucket].ld++;  }
      else if (res.includes('popup'))     { totals.all.pu++;  totals[bucket].pu++;  }
      if (p.inPlayOut === true)       { totals.all.inPlayOuts++; totals[bucket].inPlayOuts++; }
      else if (p.inPlayOut === false) { totals.all.inPlayHits++; totals[bucket].inPlayHits++; }
    }
    if (inIZ)   { totals.all.iz++;     totals[bucket].iz++;    }
    if (inOOZ)  { totals.all.ooz++;    totals[bucket].ooz++;   }
    if (strike) { totals.all.strike++; totals[bucket].strike++;}
  });

  const pctValue = (n,d)=> d ? (n/d*100) : 0;
  const setLivePct = (id, label, num, den) => {
    const el = document.getElementById(id);
    if (!el) return;
    const value = pctValue(num, den);
    el.innerHTML = `${label}: <span class="stat-value live-stat-value">${value.toFixed(1)}</span>`;
    const valueEl = el.querySelector('.live-stat-value');
    if (valueEl) valueEl.style.color = getTigersPercentColor(value);
  };

  /* ----- write the headline numbers (ALWAYS global) ----- */
  setLivePct('stat-swing', 'Swing%', totals.all.swing, denoms.all);
  setLivePct('stat-csw', 'CSW%', totals.all.csw, denoms.all);
  setLivePct('stat-iz', 'IZ%', totals.all.iz, denoms.all);
  setLivePct('stat-strike', 'Strike%', totals.all.strike, denoms.all);
  setLivePct('stat-early-csw', 'CSW%', totals.early.csw, denoms.early);
  setLivePct('stat-early-strike', 'Strike%', totals.early.strike, denoms.early);
  setLivePct('stat-late-csw', 'CSW%', totals.late.csw, denoms.late);
  setLivePct('stat-late-strike', 'Strike%', totals.late.strike, denoms.late);

  /* ----- update donut arcs ----- */
  updateDonut('donut-strike', 'donut-val-strike', pctValue(totals.all.strike, denoms.all));
  updateDonut('donut-csw',    'donut-val-csw',    pctValue(totals.all.csw,    denoms.all));
  updateDonut('donut-iz',     'donut-val-iz',     pctValue(totals.all.iz,     denoms.all));
  updateDonut('donut-swing',  'donut-val-swing',  pctValue(totals.all.swing,  denoms.all));
  updateBattedBallDonut(totals.all.fly, totals.all.gb, totals.all.ld, totals.all.pu, totals.all.ipo);

  /* ----- BIP Out% donut ----- */
  const bipTotal = totals.all.inPlayOuts + totals.all.inPlayHits;
  const bipOutPct = bipTotal > 0 ? (totals.all.inPlayOuts / bipTotal * 100) : 0;
  updateDonut('donut-bip-out', 'donut-val-bip-out', bipOutPct);
  setLivePct('stat-bip-out', 'BIP Out%', totals.all.inPlayOuts, bipTotal);

  /* ----- tables: still respond to the dropdown filter ----- */
  const aggFiltered = buildAggregators(filtered); // filtered set
  const aggAll      = buildAggregators(allData);  // reference row

  renderLiveTables(aggFiltered, aggAll);
  renderInPlayOutTable(aggFiltered);
  renderOutTypeBarChart(aggFiltered);

  /* ----- coaching insights ----- */
  const insights = computeInsights(allData);
  renderInsights(insights);
}

function advanceToNextBatter () {
  if (!batters.length || currentBatterId === null) return;

  const idx      = batters.findIndex(b => b.id === currentBatterId);
  const nextIdx  = (idx + 1) % batters.length;
  currentBatterId = batters[nextIdx].id;

  // reflect it in the dropdown
  const sel = document.getElementById('batterSelect');
  if (sel) sel.value = currentBatterId;

  // update any UI that depends on the selection
  updateLiveStats();
  updateHeatMap();
}

// Insert a TOTAL row at index 0 with no heat coloring
function insertTotalRow(tbody, label, stats, columns) {
  const tr = tbody.insertRow(0);
  tr.classList.add('total-row');

  const first = tr.insertCell();
  first.textContent = label;
  first.classList.add('total-cell');

  columns.forEach(metric => {
    const pctVal   = Number(stats[metric]) || 0;
    const rawCount = metricCount(stats, metric);
    const td = tr.insertCell();
    td.textContent = `${pctVal.toFixed(1)}% (${rawCount})`;
    td.classList.add('total-cell');   // <- no heatmap here
  });
}

/* â–¬â–¬ paint the two live-stats tables with heat-colors â–¬â–¬ */
function renderLiveTables(aggFiltered, aggAll) {
  /* ---------- BY PITCH TYPE ---------- */
  const tpBody = document.querySelector('#tbl-pitchType tbody');
  tpBody.innerHTML = '';

  const pitchCols = ['usagePct','izPct','oozPct','cswPct','strikePct','swingPct','flyPct','gbPct','ldPct','puPct'];
  const pitchMax  = computeColumnMax(aggFiltered.byPitch, pitchCols);

  // â¬†ï¸ TOTAL row first (for the *filtered* set)
  insertTotalRow(tpBody, '- All -', aggFiltered.overall, pitchCols);

  // then each pitch type
  aggFiltered.byPitch.forEach((stats, pt) => {
    const row = tpBody.insertRow();
    row.insertCell().textContent = pt.toUpperCase();
    pitchCols.forEach(metric => {
      const pctVal   = stats[metric];
      const rawCount = metricCount(stats, metric);
      const cell     = row.insertCell();
      cell.textContent = `${pctVal.toFixed(1)}% (${rawCount})`;
      shadeCellByColumn(cell, pctVal, pitchMax[metric]);
    });
  });

  /* ---------- USAGE DONUT ---------- */
  renderUsageDonut(aggFiltered);

  /* ---------- BY BATTER (respects current filter) ---------- */
  const btBody = document.querySelector('#tbl-batter tbody');
  btBody.innerHTML = '';

  const batterCols = ['earlySwingPct','lateSwingPct','chasePct','cswPct','strikePct'];
  const batterMax  = computeColumnMax(aggFiltered.byBatter, batterCols);

  // â¬†ï¸ TOTAL row first (for the *filtered* set)
  // earlySwing% & lateSwing% use early/late denominators; chase% = OOZ-swings / swings
  insertTotalRow(btBody, '- All -', aggFiltered.overall, batterCols);

  // then each batter (skip any stray aggregate key)
  aggFiltered.byBatter.forEach((stats, id) => {
    if (id === 'ALL') return;  // avoid duplicate/bogus aggregate rows
    const name = (batters.find(b => b.id === id)?.name) || `B${id}`;
    const row = btBody.insertRow();
    row.insertCell().textContent = name;
    batterCols.forEach(metric => {
      const pctVal   = stats[metric];
      const rawCount = metricCount(stats, metric);
      const cell     = row.insertCell();
      cell.textContent = `${pctVal.toFixed(1)}% (${rawCount})`;
      shadeCellByColumn(cell, pctVal, batterMax[metric]);
    });
  });

  /* ---------- LHH / RHH SPLITS ---------- */
  const hsBody = document.querySelector('#tbl-handSplit tbody');
  if (hsBody) {
    hsBody.innerHTML = '';
    const handCols = ['izPct','cswPct','strikePct','swingPct','chasePct'];
    const handMax  = computeColumnMax(aggFiltered.byHand, handCols);
    const HAND_LABELS = { L: 'LHH', R: 'RHH', unknown: '?' };

    // render in a fixed order: L then R
    ['L', 'R'].forEach(hKey => {
      const stats = aggFiltered.byHand.get(hKey);
      if (!stats) return;
      const row = hsBody.insertRow();
      row.insertCell().textContent = HAND_LABELS[hKey] ?? hKey;
      row.insertCell().textContent = stats.pitches;
      handCols.forEach(metric => {
        const pctVal   = stats[metric];
        const rawCount = metricCount(stats, metric);
        const cell     = row.insertCell();
        cell.textContent = `${pctVal.toFixed(1)}% (${rawCount})`;
        shadeCellByColumn(cell, pctVal, handMax[metric]);
      });
    });

    // show/hide the section based on whether there's any hand data
    const section = document.getElementById('handSplitSection');
    if (section) section.style.display = aggFiltered.byHand.size > 0 ? '' : 'none';
  }
}

/* ---------- DRAWER TAB SWITCHING ---------- */
document.querySelectorAll('.drawer-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    const target = this.dataset.tab;
    document.getElementById('drawerTabOverview').style.display = target === 'overview' ? 'flex' : 'none';
    document.getElementById('drawerTabInPlay').style.display   = target === 'inplay'   ? 'flex' : 'none';
  });
});

/* ---------- IN-PLAY OUT TABLE ---------- */
function renderInPlayOutTable(agg) {
  const tbody = document.querySelector('#tbl-inPlayOut tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const BB_OUT_LABELS = { gbOut:'GO', fbOut:'FO', ldOut:'LO', puOut:'PO' };

  // Total row first
  const o = agg.overall;
  const totalBIP = o.inPlayOuts + o.inPlayHits;
  const totalOutPct = totalBIP > 0 ? (o.inPlayOuts / totalBIP * 100) : 0;
  const totalRow = tbody.insertRow();
  totalRow.classList.add('total-row');
  [
    '- All -',
    String(totalBIP),
    `${totalOutPct.toFixed(1)}%`,
    String(o.gbOut),
    String(o.fbOut),
    String(o.ldOut),
    String(o.puOut)
  ].forEach((txt, i) => {
    const td = totalRow.insertCell();
    td.textContent = txt;
    td.classList.add('total-cell');
  });

  // Per pitch type
  agg.byPitch.forEach((stats, pt) => {
    const bip = stats.inPlayOuts + stats.inPlayHits;
    if (bip === 0 && stats.fly + stats.gb + stats.ld + stats.pu === 0) return;
    const outPct = bip > 0 ? (stats.inPlayOuts / bip * 100) : 0;
    const row = tbody.insertRow();
    row.insertCell().textContent = (PITCH_LABELS[pt] || pt).toUpperCase();
    row.insertCell().textContent = String(bip);
    const outCell = row.insertCell();
    outCell.textContent = `${outPct.toFixed(1)}%`;
    if (bip > 0) shadeCellByColumn(outCell, outPct, 100);
    row.insertCell().textContent = String(stats.gbOut);
    row.insertCell().textContent = String(stats.fbOut);
    row.insertCell().textContent = String(stats.ldOut);
    row.insertCell().textContent = String(stats.puOut);
  });
}

/* ---------- OUT TYPE STACKED BAR CHART ---------- */
const BAR_COLORS = { gbOut: '#d4652a', fbOut: '#5b8fc9', ldOut: '#4a9e6e', puOut: '#a855c9' };
const BAR_LABELS_MAP = { gbOut: 'GO', fbOut: 'FO', ldOut: 'LO', puOut: 'PO' };

function renderOutTypeBarChart(agg) {
  const container = document.getElementById('outTypeBarChartSvg');
  if (!container) return;
  container.innerHTML = '';

  const types = [];
  agg.byPitch.forEach((stats, pt) => {
    const totalOuts = stats.gbOut + stats.fbOut + stats.ldOut + stats.puOut;
    if (totalOuts > 0) types.push({ pt, stats, totalOuts });
  });
  if (types.length === 0) return;

  const maxOuts = Math.max(...types.map(t => t.totalOuts));
  const barH = 22;
  const gap = 6;
  const labelW = 30;
  const countW = 30;
  const chartW = 280;
  const svgW = labelW + chartW + countW + 10;
  const svgH = types.length * (barH + gap) + gap;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.setAttribute('width', '100%');
  svg.style.maxWidth = `${svgW}px`;

  types.forEach((item, i) => {
    const y = gap + i * (barH + gap);
    // Label
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', labelW - 4);
    label.setAttribute('y', y + barH / 2 + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('class', 'bar-label');
    label.textContent = (PITCH_LABELS[item.pt] || item.pt).toUpperCase();
    svg.appendChild(label);

    // Stacked bars
    let x = labelW;
    const barW = (item.totalOuts / maxOuts) * chartW;
    ['gbOut', 'fbOut', 'ldOut', 'puOut'].forEach(key => {
      const count = item.stats[key];
      if (count === 0) return;
      const segW = (count / item.totalOuts) * barW;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', segW);
      rect.setAttribute('height', barH);
      rect.setAttribute('rx', 2);
      rect.setAttribute('fill', BAR_COLORS[key]);
      svg.appendChild(rect);
      x += segW;
    });

    // Count
    const countText = document.createElementNS(SVG_NS, 'text');
    countText.setAttribute('x', labelW + barW + 6);
    countText.setAttribute('y', y + barH / 2 + 4);
    countText.setAttribute('class', 'bar-count');
    countText.textContent = String(item.totalOuts);
    svg.appendChild(countText);
  });

  // Legend row at bottom
  const legendY = svgH - 2;
  let lx = labelW;
  ['gbOut', 'fbOut', 'ldOut', 'puOut'].forEach(key => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', lx);
    rect.setAttribute('y', legendY - 8);
    rect.setAttribute('width', 8);
    rect.setAttribute('height', 8);
    rect.setAttribute('rx', 1);
    rect.setAttribute('fill', BAR_COLORS[key]);
    svg.appendChild(rect);
    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('x', lx + 11);
    txt.setAttribute('y', legendY);
    txt.setAttribute('class', 'bar-count');
    txt.textContent = BAR_LABELS_MAP[key];
    svg.appendChild(txt);
    lx += 42;
  });

  container.appendChild(svg);
}

/* ========== COACHING INSIGHTS ENGINE ========== */

const FASTBALL_TYPES = ['fourSeam', 'twoSeam', 'cutter'];

function computeInsights(data) {
  const insights = [];
  if (data.length < 10) return insights;

  const pl = PITCH_LABELS || {};

  // --- 1. Fastball overuse by count ---
  const countBuckets = {};
  data.forEach(p => {
    const key = `${p.prePitchCount.balls}-${p.prePitchCount.strikes}`;
    if (!countBuckets[key]) countBuckets[key] = { total: 0, fb: 0 };
    countBuckets[key].total++;
    if (FASTBALL_TYPES.includes(p.pitchType)) countBuckets[key].fb++;
  });
  for (const [count, b] of Object.entries(countBuckets)) {
    if (b.total >= 4 && (b.fb / b.total) > 0.75) {
      insights.push({
        type: 'warning', category: 'sequencing', priority: 2,
        message: `Heavy fastball in ${count} count (${Math.round(b.fb / b.total * 100)}% FB on ${b.total} pitches)`
      });
    }
  }

  // --- 2. High early-count swing rate ---
  let earlyPitches = 0, earlySwings = 0;
  data.forEach(p => {
    if (p.prePitchCount.strikes < 2) {
      earlyPitches++;
      const swung = ['whiff','foul'].includes(p.outcome) || (p.result||'').startsWith('In Play');
      if (swung) earlySwings++;
    }
  });
  if (earlyPitches >= 10) {
    const earlySwingPct = earlySwings / earlyPitches * 100;
    if (earlySwingPct > 40) {
      insights.push({
        type: 'warning', category: 'swing', priority: 2,
        message: `Hitters jumping early (${earlySwingPct.toFixed(0)}% swing rate <2 strikes)`
      });
    }
  }

  // --- 3. Pitch getting hit hard ---
  const bipByPitch = {};
  data.forEach(p => {
    if (!p.result || !p.result.startsWith('In Play')) return;
    const pt = p.pitchType;
    if (!bipByPitch[pt]) bipByPitch[pt] = { outs: 0, hits: 0 };
    if (p.inPlayOut === true) bipByPitch[pt].outs++;
    else if (p.inPlayOut === false) bipByPitch[pt].hits++;
  });
  for (const [pt, b] of Object.entries(bipByPitch)) {
    const total = b.outs + b.hits;
    if (total >= 3 && (b.hits / total) > 0.6) {
      insights.push({
        type: 'warning', category: 'contact', priority: 2,
        message: `${pl[pt] || pt} getting hit hard (${Math.round(b.hits / total * 100)}% non-out on ${total} BIP)`
      });
    }
    if (total >= 3 && (b.outs / total) >= 0.7) {
      insights.push({
        type: 'positive', category: 'contact', priority: 1,
        message: `${pl[pt] || pt} generating outs effectively (${Math.round(b.outs / total * 100)}% out rate on ${total} BIP)`
      });
    }
  }

  // --- 4. Sequencing repetition (3+ consecutive same pitch) ---
  if (data.length >= 3) {
    const last = data.slice(-5);
    let streak = 1;
    for (let i = last.length - 2; i >= 0; i--) {
      if (last[i].pitchType === last[last.length - 1].pitchType) streak++;
      else break;
    }
    if (streak >= 3) {
      const pt = last[last.length - 1].pitchType;
      insights.push({
        type: 'warning', category: 'sequencing', priority: 3,
        message: `${streak}x ${pl[pt] || pt} in a row — consider mixing`
      });
    }
  }

  // --- 5. Location predictability (last 10 pitches) ---
  const recent = data.slice(-10);
  if (recent.length >= 8) {
    const quadrants = { upper: 0, lower: 0, glove: 0, arm: 0 };
    const insightPitcherHand = getPitcherHand(currentPitcherId);
    let valid = 0;
    recent.forEach(p => {
      const rc = getZoneRowCol(p.location);
      if (!rc || rc[0] === -1) return;
      valid++;
      if (rc[0] <= 2) quadrants.upper++; else quadrants.lower++;
      if (isArmSideCol(rc[1], insightPitcherHand)) quadrants.arm++;
      else if (isGloveSideCol(rc[1], insightPitcherHand)) quadrants.glove++;
    });
    if (valid >= 8) {
      for (const [q, count] of Object.entries(quadrants)) {
        if (count / valid >= 0.7) {
          insights.push({
            type: 'warning', category: 'location', priority: 2,
            message: `Location pattern: ${Math.round(count / valid * 100)}% ${q} in last ${valid} pitches`
          });
        }
      }
    }
  }

  // --- 6. Declining chase rate ---
  if (data.length >= 20) {
    let twoStrikePitches = 0, chaseSwings = 0;
    data.forEach(p => {
      if (p.prePitchCount.strikes === 2) {
        const inOOZ = shadowLocations.includes(p.location) || nonCompetitiveLocations.includes(p.location);
        if (inOOZ) {
          twoStrikePitches++;
          const swung = ['whiff','foul'].includes(p.outcome) || (p.result||'').startsWith('In Play');
          if (swung) chaseSwings++;
        }
      }
    });
    if (twoStrikePitches >= 5) {
      const chasePct = chaseSwings / twoStrikePitches * 100;
      if (chasePct < 20) {
        insights.push({
          type: 'info', category: 'chase', priority: 1,
          message: `Hitters laying off 2-strike chase pitches (${chasePct.toFixed(0)}% chase rate)`
        });
      }
    }
  }

  // --- 8. Popup/flyball production on breaking balls ---
  data.forEach(p => {/* handled in loop 3 already */});
  const breakingTypes = ['curveBall', 'slider', 'sweeper'];
  for (const pt of breakingTypes) {
    const bips = data.filter(p => p.pitchType === pt && p.result && p.result.startsWith('In Play'));
    if (bips.length >= 3) {
      const weakContact = bips.filter(p => p.result.includes('popup') || p.result.includes('flyball')).length;
      if (weakContact / bips.length >= 0.5) {
        insights.push({
          type: 'positive', category: 'contact', priority: 1,
          message: `${pl[pt] || pt} producing weak pop contact (${Math.round(weakContact / bips.length * 100)}% popup+flyball)`
        });
      }
    }
  }

  // Sort by priority descending
  insights.sort((a, b) => b.priority - a.priority);
  return insights;
}

function renderInsights(insights) {
  const panel = document.getElementById('insightsPanel');
  const list = document.getElementById('insightsList');
  const badge = document.getElementById('insightCount');
  const toggle = document.getElementById('statsDrawerToggle');
  if (!panel || !list) return;

  if (insights.length === 0) {
    panel.style.display = 'none';
    if (toggle) toggle.classList.remove('has-insights');
    return;
  }

  panel.style.display = 'block';
  badge.textContent = String(insights.length);
  list.innerHTML = '';

  insights.forEach(ins => {
    const li = document.createElement('li');
    li.className = `insight-item ${ins.type}`;
    li.textContent = ins.message;
    list.appendChild(li);
  });

  // Alert dot on drawer toggle
  if (toggle) {
    toggle.classList.toggle('has-insights', insights.some(i => i.priority >= 2));
  }
}

/* ---------- Pitch Mix Usage Donut ---------- */
const PITCH_FAMILY = {
  fourSeam: 'fastball', twoSeam: 'fastball', cutter: 'fastball',
  curveBall: 'breaking', slider: 'breaking', sweeper: 'breaking',
  changeup: 'offspeed', splitter: 'offspeed'
};

const PITCH_COLORS = {
  fourSeam: '#3b6ea5', twoSeam: '#5a8cba', cutter: '#2d5580',
  curveBall: '#d4652a', slider: '#e8834e', sweeper: '#b04d1a',
  changeup: '#8a8d93', splitter: '#6b6e74'
};

const PITCH_LABELS = {
  fourSeam: '4S', twoSeam: '2S', cutter: 'CT',
  curveBall: 'CB', slider: 'SL', sweeper: 'SW',
  changeup: 'CH', splitter: 'SP'
};

const USAGE_DONUT_R = 40;
const USAGE_DONUT_C = 2 * Math.PI * USAGE_DONUT_R;
const SVG_NS = 'http://www.w3.org/2000/svg';

function renderUsageDonut(agg) {
  const chartEl  = document.getElementById('usageDonutChart');
  const legendEl = document.getElementById('usageDonutLegend');
  if (!chartEl || !legendEl) return;

  const totalPitches = agg.overall.pitches;
  chartEl.innerHTML = '';
  legendEl.innerHTML = '';

  // Build ordered segments: fastball family first, then breaking, then offspeed
  const familyOrder = ['fastball', 'breaking', 'offspeed'];
  const segments = [];
  agg.byPitch.forEach((stats, pt) => {
    segments.push({ pt, pitches: stats.pitches, pct: stats.usagePct || 0 });
  });
  segments.sort((a, b) => {
    const fa = familyOrder.indexOf(PITCH_FAMILY[a.pt] || 'offspeed');
    const fb = familyOrder.indexOf(PITCH_FAMILY[b.pt] || 'offspeed');
    return fa !== fb ? fa - fb : b.pitches - a.pitches;
  });

  // Create SVG
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.classList.add('usage-donut-svg');

  // Background track
  const track = document.createElementNS(SVG_NS, 'circle');
  track.setAttribute('cx', '50');
  track.setAttribute('cy', '50');
  track.setAttribute('r', String(USAGE_DONUT_R));
  track.classList.add('usage-donut-track');
  svg.appendChild(track);

  // Segments
  let offset = 0;
  segments.forEach(seg => {
    if (seg.pct <= 0) return;
    const arcLen = USAGE_DONUT_C * (seg.pct / 100);
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', String(USAGE_DONUT_R));
    circle.classList.add('usage-donut-segment');
    circle.style.stroke = PITCH_COLORS[seg.pt] || '#888';
    circle.style.strokeDasharray = `${arcLen} ${USAGE_DONUT_C - arcLen}`;
    circle.style.strokeDashoffset = String(-offset);
    offset += arcLen;
    svg.appendChild(circle);
  });

  // Center text — total pitch count
  const centerVal = document.createElementNS(SVG_NS, 'text');
  centerVal.setAttribute('x', '50');
  centerVal.setAttribute('y', '47');
  centerVal.classList.add('usage-donut-center');
  centerVal.textContent = String(totalPitches);
  svg.appendChild(centerVal);

  const centerLabel = document.createElementNS(SVG_NS, 'text');
  centerLabel.setAttribute('x', '50');
  centerLabel.setAttribute('y', '58');
  centerLabel.classList.add('usage-donut-center-label');
  centerLabel.textContent = 'pitches';
  svg.appendChild(centerLabel);

  chartEl.appendChild(svg);

  // Legend
  segments.forEach(seg => {
    if (seg.pitches <= 0) return;
    const item = document.createElement('span');
    item.classList.add('usage-legend-item');

    const swatch = document.createElement('span');
    swatch.classList.add('usage-legend-swatch');
    swatch.style.background = PITCH_COLORS[seg.pt] || '#888';

    item.appendChild(swatch);
    item.appendChild(document.createTextNode(
      `${PITCH_LABELS[seg.pt] || seg.pt.toUpperCase()} ${seg.pct.toFixed(0)}%`
    ));
    legendEl.appendChild(item);
  });
}

function showComboPitchTypeSelection() {
  document.getElementById('comboPitchTypeSelection').style.display = 'block';
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('pitchLocationSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
}

function displayComboNotification() {
  let notification = document.createElement('div');
  notification.innerText = 'COMBO HIT!';
  notification.style.position = 'fixed';
  notification.style.top = '50%';
  notification.style.left = '50%';
  notification.style.transform = 'translate(-50%, -50%)';
  notification.style.backgroundColor = 'yellow';
  notification.style.padding = '20px';
  notification.style.border = '2px solid black';
  notification.style.zIndex = '1000';
  notification.style.fontSize = '32px';
  notification.style.fontWeight = 'bold';
  notification.style.borderRadius = '10px';
  notification.style.animation = 'fadeOut 2s forwards';

  document.body.appendChild(notification);

  // Remove the notification after animation
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function displayPointsDeduction(pointsLost) {
  let deductionNotification = document.createElement('div');
  deductionNotification.innerText = `-${pointsLost} 💀`;
  deductionNotification.style.position = 'fixed';
  deductionNotification.style.top = '10%';
  deductionNotification.style.right = '10%';
  deductionNotification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  deductionNotification.style.color = 'red';
  deductionNotification.style.padding = '15px';
  deductionNotification.style.borderRadius = '10px';
  deductionNotification.style.fontSize = '24px';
  deductionNotification.style.fontWeight = 'bold';
  deductionNotification.style.zIndex = '1000';
  deductionNotification.style.animation = 'slideOut 2s forwards';

  document.body.appendChild(deductionNotification);

  // Remove the notification after animation
  setTimeout(() => {
    deductionNotification.remove();
  }, 2000);
}


function showPutawayOptions() {
  document.getElementById('r2kButtons').style.display = 'none'; // Hide regular strike/ball buttons
  document.getElementById('putawayButtons').style.display = 'block';
  document.getElementById('kBtn').style.display = 'inline-block';
  document.getElementById('noKBtn').style.display = 'inline-block';
}

function showInPlaySelection() {
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'block';
}

document.querySelectorAll("#inPlaySelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pendingInPlayType = this.id;  // store for out/hit step
    document.getElementById('inPlaySelection').style.display = 'none';
    document.getElementById('inPlayOutSelection').style.display = 'block';
  });
});

/* ---------- OUT / HIT / SKIP ---------- */
document.querySelectorAll("#inPlayOutSelection .in-play-out-btn").forEach(button => {
  button.addEventListener('click', function() {
    const choice = this.id;  // 'inPlayOut', 'inPlayHit', or 'inPlaySkip'
    let outSuffix = '';
    let inPlayOut = null;
    if (choice === 'inPlayOut')  { outSuffix = ' - out'; inPlayOut = true;  }
    else if (choice === 'inPlayHit') { outSuffix = ' - hit'; inPlayOut = false; }
    // Skip: no suffix, inPlayOut stays null

    const resultString = `In Play - ${pendingInPlayType}${outSuffix}`;
    const prev = { balls: ballCount, strikes: strikeCount };

    pitchCount++;
    if (mode === 'liveBP' || mode === 'points') totalPitches++;
    else totalPitchesBullpen++;

    logPitchResult(pitchType, resultString, pitchLocation, '', prev, 'inPlay', inPlayOut);
    logAtBatResult(resultString);

    isNewAtBat = true;
    pendingInPlayType = null;
    resetForNextPitch();
    updateLiveStats();
    updateUI();
  });
});

// ======== NEW RENDER HELPERS ========
/**
 * Render the pitch log based on pitchData and the current batter filter.
 * If currentBatterId is null, show all pitches; otherwise only the selected batter.
 */
/* ---------- RE-TAG PITCH ---------- */
function renderRetagPitchList() {
  const list = document.getElementById('retagPitchList');
  if (!list) return;
  list.innerHTML = '';
  if (pitchData.length === 0) {
    list.innerHTML = '<p style="padding:12px;color:#888;font-size:12px;">No pitches logged yet.</p>';
    return;
  }
  [...pitchData].reverse().forEach(p => {
    const batter = batters.find(b => b.id === p.batterId);
    const div = document.createElement('div');
    div.className = 'retagPitchItem';
    div.innerHTML =
      `<span class="retagNum">#${p.pitchNumber}</span>` +
      `<span class="retagType">${(PITCH_LABELS[p.pitchType] || p.pitchType).toUpperCase()}</span>` +
      `<span class="retagResult">${p.result}</span>` +
      `<span class="retagZone">Zn ${p.location}</span>` +
      (batter ? `<span class="retagBatter">${batter.name}</span>` : '');
    div.addEventListener('click', () => {
      retagSelectedPitchId = p.pitchId;
      list.querySelectorAll('.retagPitchItem').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      document.getElementById('retagTypeSelection').style.display = 'block';
    });
    list.appendChild(div);
  });
}

function retagPitch(newType) {
  const p = pitchData.find(x => x.pitchId === retagSelectedPitchId);
  if (!p) return;
  p.pitchType = newType;
  addPitchTypeToFilter(newType);
  updateLiveStats();
  updateHeatMap();
  renderPitchLog();
  renderAtBatLog();
  document.getElementById('retagPitchPanel').style.display = 'none';
  retagSelectedPitchId = null;
}

/* ---------- GRID POV TOGGLE ---------- */
function applyGridPOV() {
  const isPitcher = gridPOV === 'pitcher';
  ['pitchLocationGrid', 'heatmap', 'intendedZoneGrid', 'actualZoneGrid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('pitcher-pov', isPitcher);
  });
  document.querySelectorAll('.homePlateIndicator').forEach(el => {
    el.classList.toggle('pitcher-pov', isPitcher);
  });
  document.querySelectorAll('.povToggleBtn').forEach(btn => {
    btn.textContent = isPitcher ? '⇄ Pitcher POV' : '⇄ Catcher POV';
  });
}

function toggleGridPOV() {
  gridPOV = gridPOV === 'catcher' ? 'pitcher' : 'catcher';
  localStorage.setItem('gridPOV', gridPOV);
  applyGridPOV();
}

/* ---------- SEQUENCE SPARKLINE ---------- */
function renderSequenceSparkline() {
  const container = document.getElementById('sequenceSparkline');
  if (!container) return;
  container.innerHTML = '';

  const recent = pitchData.slice(-20);
  if (recent.length < 2) return;

  const svgW = 220, svgH = 52;
  const padX = 18, padXR = 5, dotR = 3.5;
  const plotW = svgW - padX - padXR;
  const asLineY = 16, gsLineY = 36;

  const SPARKLINE_COLORS = { fastball: '#d94f4f', breaking: '#4a90d9', offspeed: '#8a8d93' };

  function zoneToY(p) {
    const [row, col] = getZoneRowCol(p.location);
    const hand = getPitcherHand(p.pitcherId);
    if (row === -1) return (asLineY + gsLineY) / 2;
    if (row >= 1 && row <= 5) {
      const outerArm   = hand === 'RH' ? col <= 1 : col >= 5;
      const outerGlove = hand === 'RH' ? col >= 5 : col <= 1;
      if (outerArm)   return asLineY;
      if (outerGlove) return gsLineY;
    }
    return [5, 11, 22, 26, 30, 41, 47][row] ?? 26;
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  for (const [lineY, label] of [[asLineY, 'AS'], [gsLineY, 'GS']]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', padX); line.setAttribute('x2', svgW - padXR);
    line.setAttribute('y1', lineY); line.setAttribute('y2', lineY);
    line.setAttribute('stroke', '#555'); line.setAttribute('stroke-width', '0.75');
    svg.appendChild(line);

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', '2'); text.setAttribute('y', lineY + 3.5);
    text.setAttribute('font-size', '7'); text.setAttribute('fill', '#888');
    text.setAttribute('font-family', 'sans-serif');
    text.textContent = label;
    svg.appendChild(text);
  }

  recent.forEach((p, i) => {
    const x = padX + (i / (recent.length - 1)) * plotW;
    const y = zoneToY(p);
    const color = SPARKLINE_COLORS[PITCH_FAMILY[p.pitchType]] || '#8a8d93';
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y);
    circle.setAttribute('r', dotR); circle.setAttribute('fill', color);
    circle.setAttribute('opacity', '0.9');
    svg.appendChild(circle);
  });

  container.appendChild(svg);
}

function renderPitchLog() {
  const ul = document.getElementById('pitchLog');
  if (!ul) return;
  ul.innerHTML = '';
  renderSequenceSparkline();

  // null â†' â€œAll battersâ€
  const wantBatterId  = currentBatterId;
  const wantPitcherId = currentPitcherId;
  let lastAtBatNumber = null;

  pitchData.forEach(p => {
    if (wantBatterId  && p.batterId  !== wantBatterId)  return;
    if (wantPitcherId && p.pitcherId !== wantPitcherId) return;

    if (p.atBatNumber !== lastAtBatNumber) {
      const divider = document.createElement('li');
      divider.classList.add('atbat-divider');
      const abBatter = batters.find(b => b.id === p.batterId);
      const abHand = getBatterHand(p);
      const nameLabel = abBatter ? ` — ${abBatter.name}` : '';
      divider.innerHTML =
        `At-Bat #${p.atBatNumber}${nameLabel}` +
        (abBatter ? ` <button class="ab-hand-toggle" data-abnum="${p.atBatNumber}">${abHand || '?'}</button>` : '');
      ul.appendChild(divider);
      lastAtBatNumber = p.atBatNumber;
    }

    const li = document.createElement('li');
    const pt = (p.pitchType || 'UNKNOWN').toUpperCase();
    const loc = (p.location ?? 'UNKNOWN');
    const res = p.result || 'UNKNOWN';

    // Prefer the *post* count we stored with the pitch
    const postBalls   = (p.postPitchCount && typeof p.postPitchCount.balls === 'number')   ? p.postPitchCount.balls   : 0;
    const postStrikes = (p.postPitchCount && typeof p.postPitchCount.strikes === 'number') ? p.postPitchCount.strikes : 0;

    li.textContent = `AB ${p.atBatNumber} - ${pt}, Location: ${loc}, Result: ${res}, Count: ${postBalls}-${postStrikes}`;
    li.setAttribute('data-pitch-id', p.pitchId);

    // If pitch was tagged, re-apply the emoji
    const tag = pitchTags[p.pitchId];
    if (tag) {
      const flagSpan = document.createElement('span');
      flagSpan.classList.add('flagEmoji');
      flagSpan.innerText = tag.emoji;
      flagSpan.title = tag.description + (tag.note ? ': ' + tag.note : '');
      li.appendChild(flagSpan);
    }

    ul.appendChild(li);
  });

  // If weâ€™re currently in tagging mode, keep items selectable
  if (isTaggingMode) {
    document.querySelectorAll('#pitchLog li:not(.atbat-divider)').forEach(item => {
      item.classList.add('selectable');
      item.addEventListener('click', togglePitchSelection);
    });
  }
}

/**
 * Render the at-bat summary log based on atBats and the current batter filter.
 * If currentBatterId is null, show all at-bats; otherwise only those for the selected batter.
 */
function renderAtBatLog() {
  const list = document.getElementById('atBatLog');
  if (!list) return;
  list.innerHTML = '';

  const wantBatterId  = currentBatterId;
  const pitcherAbNums = currentPitcherId
    ? new Set(pitchData.filter(p => p.pitcherId === currentPitcherId).map(p => p.atBatNumber))
    : null;
  atBats.forEach(ab => {
    if (wantBatterId  && ab.batterId !== wantBatterId)  return;
    if (pitcherAbNums && !pitcherAbNums.has(ab.atBatNumber)) return;

    const li = document.createElement('li');
    const batter = batters.find(b => b.id === ab.batterId);
    const name  = batter ? batter.name : 'Unknown';
    const hand  = ab.handOverride ?? (batter ? batter.hand : '');
    li.innerText = `#${ab.atBatNumber} - ${name}${hand ? ' (' + hand + ')' : ''} - ${ab.result} (${ab.pitchCount} pitches)`;
    list.appendChild(li);
  });
}

function logPitchResult(pitchType, result, location, scenarioEmojis = '', previousCount = null, outcome = '', inPlayOut = null) {
  // only push data; rendering is handled elsewhere
  if (previousCount === null) {
    // If previousCount is not provided, set it to current counts before the pitch
    previousCount = { balls: ballCount, strikes: strikeCount };
  }

  let pitchEntry = {
    pitchId: pitchId,
    batterId: currentBatterId,
    pitcherId: currentPitcherId,
    pitchType: pitchType,
    result: result,
    location: location,
    prePitchCount: previousCount,
    postPitchCount: { balls: ballCount, strikes: strikeCount },
    pitchNumber: pitchCount,
    atBatNumber: atBatNumber,
    outcome: outcome,
    inPlayOut: inPlayOut       // true = out, false = hit, null = unknown/skip
  };

  pitchData.push(pitchEntry);
  pitchId++;
  addPitchTypeToFilter(pitchType);
  // re-render after adding pitch
  renderPitchLog();
}

function showTaggingOptions() {
  document.getElementById('taggingOptions').style.display = 'block';
}

function hideTaggingOptions() {
  document.getElementById('taggingOptions').style.display = 'none';
}

function enterTaggingMode() {
  isTaggingMode = true;
  document.getElementById('tagPitchBtn').innerText = 'Cancel Tagging';
  // Make pitch log entries selectable
  let pitchLogItems = document.querySelectorAll('#pitchLog li:not(.atbat-divider)');
  pitchLogItems.forEach(item => {
    item.classList.add('selectable');
    item.addEventListener('click', togglePitchSelection);
  });
  // Show tagging options
  showTaggingOptions();
}

function addPitchTypeToFilter(pt) {
  const container = document.getElementById('pitchFilterBtns');
  if (!container || container.querySelector(`[data-value="${pt}"]`)) return;
  const btn = document.createElement('button');
  btn.className = 'filterToggleBtn';
  btn.dataset.value = pt;
  btn.textContent = (PITCH_LABELS[pt] || pt).toUpperCase();
  btn.addEventListener('click', () => handleFilterToggle(btn, 'pitchFilterBtns'));
  container.appendChild(btn);
}

function handleFilterToggle(btn, groupId) {
  const container = document.getElementById(groupId);
  const allBtn = container.querySelector('[data-value="all"]');
  if (btn.dataset.value === 'all') {
    container.querySelectorAll('.filterToggleBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    btn.classList.toggle('active');
    const anySpecificActive = [...container.querySelectorAll('.filterToggleBtn')]
      .filter(b => b.dataset.value !== 'all')
      .some(b => b.classList.contains('active'));
    if (allBtn) allBtn.classList.toggle('active', !anySpecificActive);
  }
  updateHeatMap();
}

function exitTaggingMode() {
  isTaggingMode = false;
  document.getElementById('tagPitchBtn').innerText = 'Tag Pitch';
  // Remove selection from pitch log entries
  let pitchLogItems = document.querySelectorAll('#pitchLog li:not(.atbat-divider)');
  pitchLogItems.forEach(item => {
    item.classList.remove('selectable');
    item.classList.remove('selected');
    item.removeEventListener('click', togglePitchSelection);
  });
  // Hide tagging options
  hideTaggingOptions();
}

function togglePitchSelection() {
  this.classList.toggle('selected');
}

function normalizeTagEmoji(emoji) {
  const map = {
    '\u{1F7E1}': '\u{1F7E1}', // yellow circle
    '\u{1F7E2}': '\u{1F7E2}', // green circle
    '\u{1F534}': '\u{1F534}'  // red circle
  };
  return map[emoji] || emoji;
}

function applyTagToSelectedPitches() {
  let selectedFlagBtn = document.querySelector('#flagSelection .flagBtn.selected');
  if (!selectedFlagBtn) {
    alert('Please select a flag.');
    return;
  }
  let flagId = selectedFlagBtn.id; // e.g., 'flag-check-video'

  let flagInfo = {
    'flag-check-video': { emoji: '\u{1F7E1}', description: 'Check Video' },
    'flag-breakthrough': { emoji: '\u{1F7E2}', description: 'Breakthrough' },
    'flag-learning-moment': { emoji: '\u{1F534}', description: 'Learning Moment' },
  };

  let flagData = flagInfo[flagId];

  let note = document.getElementById('tagNote').value;

  // Get selected pitches
  let selectedPitches = document.querySelectorAll('#pitchLog li.selected');

  selectedPitches.forEach(pitchEntry => {
    let pitchId = pitchEntry.getAttribute('data-pitch-id');

    // Store tag and note
    pitchTags[pitchId] = {
      emoji: flagData.emoji,
      description: flagData.description,
      note: note,
    };

    // Update pitch log entry
    if (!pitchEntry.querySelector('.flagEmoji')) {
      let flagSpan = document.createElement('span');
      flagSpan.classList.add('flagEmoji');
      flagSpan.innerText = normalizeTagEmoji(flagData.emoji);
      flagSpan.title = flagData.description + (note ? ': ' + note : '');
      pitchEntry.appendChild(flagSpan);
    } else {
      let flagSpan = pitchEntry.querySelector('.flagEmoji');
      flagSpan.innerText = normalizeTagEmoji(flagData.emoji);
      flagSpan.title = flagData.description + (note ? ': ' + note : '');
    }
  });

  document.getElementById('tagNote').value = '';
  exitTaggingMode();
}

function updatePitchLogTags() {
  let pitchLogItems = document.querySelectorAll('#pitchLog li');
  pitchLogItems.forEach(pitchEntry => {
    let pitchId = pitchEntry.getAttribute('data-pitch-id');
    if (pitchTags[pitchId]) {
      let tagData = pitchTags[pitchId];
      // Update or add flag emoji
      if (!pitchEntry.querySelector('.flagEmoji')) {
        let flagSpan = document.createElement('span');
        flagSpan.classList.add('flagEmoji');
        flagSpan.innerText = normalizeTagEmoji(tagData.emoji);
        flagSpan.title = tagData.description + (tagData.note ? ': ' + tagData.note : '');
        pitchEntry.appendChild(flagSpan);
      } else {
        let flagSpan = pitchEntry.querySelector('.flagEmoji');
        flagSpan.innerText = normalizeTagEmoji(tagData.emoji);
        flagSpan.title = tagData.description + (tagData.note ? ': ' + tagData.note : '');
      }
    } else {
      // Remove flag emoji if present
      let flagSpan = pitchEntry.querySelector('.flagEmoji');
      if (flagSpan) {
        flagSpan.remove();
      }
    }
  });
}



function resetForNextPitch(resetCounts = true) {
  // close every sub-panel that might be open
  ['pitchLocationSelection','outcomeSelection','inPlaySelection','inPlayOutSelection']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  showPitchTypeSelection();        // always land on the palette
  if (resetCounts) resetCount();   // zero the count if caller asked
}


function updatePointsDisplay() {
  const ratio = maxPotentialPoints > 0 ? points / maxPotentialPoints : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const pctText = `${Math.round(clampedRatio * 100)}%`;
  document.getElementById('pointsDisplay').innerHTML =
    `<span class="points-label">Points:</span> <span class="points-value">${points}</span> <span class="points-percent">(${pctText})</span>`;
  const pointsValueEl = document.querySelector('#pointsDisplay .points-value');
  if (pointsValueEl) pointsValueEl.style.color = getTigersPercentColor(clampedRatio * 100);
  const pitchTypeLabels = {
    fourSeam: '4S',
    twoSeam: '2S',
    cutter: 'CT',
    curveBall: 'CB',
    slider: 'SL',
    sweeper: 'SW',
    changeup: 'CH',
    splitter: 'SP'
  };
  const comboPitchTypesText = comboPitchTypes.length > 0
    ? comboPitchTypes.map(type => pitchTypeLabels[type] || type.toUpperCase()).join(', ')
    : 'None';
  document.getElementById('comboPitchTypesDisplay').innerText = `Combo Pitch Types: ${comboPitchTypesText}`;
}

function showPitchTypeSelection() {
  document.getElementById('comboPitchTypeSelection').style.display = 'none';
  document.getElementById('pitchTypeSelection').style.display = 'block';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
  document.getElementById('inPlayOutSelection').style.display = 'none';
  document.getElementById('kBtn').style.display = 'none';
  document.getElementById('noKBtn').style.display = 'none';
  document.getElementById('strikeBtn').style.display = 'inline-block';
  document.getElementById('ballBtn').style.display = 'inline-block';
}

function removeLastPitchLogEntry() {
  const pitchLog = document.getElementById('pitchLog');
  if (pitchLog && pitchLog.lastChild) {
    pitchLog.removeChild(pitchLog.lastChild);
  }
}

function removeLastCompletedCount() {
  const countLog = document.getElementById('countLog');
  if (countLog && countLog.lastChild) {
    countLog.removeChild(countLog.lastChild);
  }
}

function getQualifiedAtBatCount(minPitches = 3) {
  return atBats.filter(ab => (Number(ab.pitchCount) || 0) >= minPitches).length;
}

function updateUI() {
  let strikePercentageFromLog = calculateStrikePercentageFromLog();
  const fireEmoji = EMOJI_FIRE;
  const skullEmoji = EMOJI_SKULL;

  if (mode === "bullpen" || mode === "putaway") {
    strikePercentageFromLog = totalPitchesBullpen > 0 ? (totalStrikesBullpen / totalPitchesBullpen) * 100 : 0;
    document.getElementById('totalPitches').innerHTML = `Total Pitches: <span class="stat-value">${totalPitchesBullpen}</span>`;
    let strikeDisplay = strikeCount === 2 ? `${strikeCount}${fireEmoji}` : strikeCount;
    document.getElementById('currentCount').innerHTML = `Current Count: <span class="stat-value">${ballCount}-${strikeDisplay}</span>`;

    const completedCounts = document.getElementById('countLog').children.length;
    const winPct = completedCounts > 0 ? (raceWins / completedCounts) * 100 : 0;
    const raceEmoji = mode === "putaway" ? skullEmoji : fireEmoji;
    const raceWinsIcons = raceWins > 0 ? raceEmoji.repeat(raceWins) : '';
    const raceWinsSummary = `${raceWinsIcons}${raceWinsIcons ? ' ' : ''}(${winPct.toFixed(0)}%)`;
    document.getElementById('raceWins').innerHTML = `Wins: <span class="stat-value">${raceWinsSummary}</span>`;

    const strikePercentageElement = document.getElementById('strikePercentage');
    strikePercentageElement.innerHTML = `Strike %: <span class="stat-value">${strikePercentageFromLog.toFixed(2)}</span>`;
    const strikeValue = strikePercentageElement.querySelector('.stat-value');
    if (strikeValue) strikeValue.style.color = getTigersPercentColor(strikePercentageFromLog);
  } else if (mode === "liveBP" || mode === "points" || mode === "intendedZone") {
    // Pitcher-filtered data for KPI row (all batters, selected pitcher only)
    const kpiData = currentPitcherId
      ? pitchData.filter(p => p.pitcherId === currentPitcherId)
      : pitchData;
    const kpiTotal = kpiData.length;
    const kpiStrikes = kpiData.filter(p =>
      ['whiff','calledStrike','foul','strike','inPlay'].includes(p.outcome)
    ).length;
    const kpiStrikePct = kpiTotal > 0 ? (kpiStrikes / kpiTotal) * 100 : 0;
    const kpiRaceWins = kpiData.filter(p =>
      p.prePitchCount?.strikes === 2 && ['whiff','calledStrike'].includes(p.outcome)
    ).length;
    const kpiAbNums = new Set(kpiData.map(p => p.atBatNumber));
    const kpiQualifiedAbs = atBats.filter(ab =>
      kpiAbNums.has(ab.atBatNumber) && (Number(ab.pitchCount) || 0) >= 3
    ).length;
    const winPct = kpiQualifiedAbs > 0 ? (kpiRaceWins / kpiQualifiedAbs) * 100 : 0;
    const raceWinsIcons = kpiRaceWins > 0 ? fireEmoji.repeat(kpiRaceWins) : '';
    const raceWinsSummary = `${raceWinsIcons}${raceWinsIcons ? ' ' : ''}(${winPct.toFixed(0)}%)`;
    const { reached, converted } = compute2KConversion(kpiData);

    document.getElementById('totalPitchesLiveBP').innerHTML =
      `Total Pitches: <span class="stat-value">${kpiTotal}</span>`;
    document.getElementById('currentCountLiveBP').innerHTML =
      `Current Count: <span class="stat-value">${ballCount}-${strikeCount}</span>`;
    document.getElementById('raceWinsLiveBP').innerHTML =
      `Race Wins: <span class="stat-value">${raceWinsSummary}</span>`;
    const twoKEl = document.getElementById('twoKConvLiveBP');
    if (twoKEl) twoKEl.innerHTML = `2K Conv: <span class="stat-value">${EMOJI_SKULL} ${converted}/${reached}</span>`;

    const strikePercentageElementLiveBP = document.getElementById('strikePercentageLiveBP');
    strikePercentageElementLiveBP.innerHTML =
      `Strike %: <span class="stat-value">${kpiStrikePct.toFixed(2)}</span>`;
    const strikeValue = strikePercentageElementLiveBP.querySelector('.stat-value');
    if (strikeValue) strikeValue.style.color = getTigersPercentColor(kpiStrikePct);

    updateStatsDrawerSummary(
      `Count: ${ballCount}-${strikeCount}`,
      `Pitches: ${kpiTotal}`,
      `Strike%: ${kpiStrikePct.toFixed(2)}`
    );
  }

  const shouldDisplayUndo = actionLog.length > 0;
  document.getElementById('undoBtn').style.display = shouldDisplayUndo ? 'inline-block' : 'none';
  saveSession();
}

function getPercentageColor(percentage) {
  const startColor = { r: 173, g: 216, b: 230 }; // Light blue
  const endColor = { r: 255, g: 0, b: 0 }; // Fire engine red
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percentage / 100));
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percentage / 100));
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percentage / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

function getTigersPercentColor(percentage) {
  const startColor = { r: 59, g: 110, b: 165 }; // Muted blue
  const endColor = { r: 210, g: 45, b: 30 };     // Red
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percentage / 100));
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percentage / 100));
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percentage / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

function updateCurrentCount() {
  let currentCountDisplay = mode === "bullpen" || mode === "putaway" ? 'currentCount' : 'currentCountLiveBP';
  if (currentCountDisplay === 'currentCount') {
    document.getElementById(currentCountDisplay).innerHTML = `Current Count: <span class="stat-value">${ballCount}-${strikeCount}</span>`;
  } else if (mode === "points") {
    document.getElementById(currentCountDisplay).innerHTML = `Current Count: <span class="stat-value">${ballCount}-${strikeCount}</span>`;
  } else {
    document.getElementById(currentCountDisplay).innerText = `Current Count: ${ballCount}-${strikeCount}`;
  }
}

function resetCount() {
  if (mode === "putaway") {
    ballCount = 1;
    strikeCount = 1;
  } else {
    ballCount = 0;
    strikeCount = 0;
  }
  foulsAfterTwoStrikes = 0;
  pitchCountInAtBat = 0;
  if (isNewAtBat) {
    atBatNumber++;
    isNewAtBat = false; 
  }
  updateUI();
}


function checkRaceCondition() {
  // LiveBP/Points race wins handled inside processOutcome() when the pitch *reaches* 2 strikes.
  // Bullpen race win on 2 strikes handled in the strikeBtn handler.
  // Putaway awards only on K button.
  // â†' Only auto-complete the bullpen â€œ2 balls, 0 strikesâ€ case here.
  if (mode === "bullpen" && ballCount === 2 && strikeCount === 0) {
    logCount(strikeCount, ballCount, false);
    resetCount();
    if (actionLog.length) actionLog[actionLog.length - 1].completedCount = true;
  }
}

function updateRaceWins() {
  const raceEmoji = mode === "putaway" ? EMOJI_SKULL : EMOJI_FIRE;
  const raceWinsIcons = raceWins > 0 ? raceEmoji.repeat(raceWins) : '';

  if (mode === "bullpen" || mode === "putaway") {
    const completedCounts = document.getElementById('countLog').children.length;
    const winPct = completedCounts > 0 ? (raceWins / completedCounts) * 100 : 0;
    const summary = `${raceWinsIcons}${raceWinsIcons ? ' ' : ''}(${winPct.toFixed(0)}%)`;
    document.getElementById('raceWins').innerHTML = `Wins: <span class="stat-value">${summary}</span>`;
  } else if (mode === "liveBP" || mode === "points" || mode === "intendedZone") {
    const qualifiedAtBats = getQualifiedAtBatCount(3);
    const winPct = qualifiedAtBats > 0 ? (raceWins / qualifiedAtBats) * 100 : 0;
    const summary = `${raceWinsIcons}${raceWinsIcons ? ' ' : ''}(${winPct.toFixed(0)}%)`;
    document.getElementById('raceWinsLiveBP').innerHTML = `Race Wins: <span class="stat-value">${summary}</span>`;
  }
}

function showHeatMap() {
  // Hide other selections
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('pitchLocationSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
  document.getElementById('inPlayOutSelection').style.display = 'none';
  // Show heatmap grid
  document.getElementById('heatmapGrid').style.display = 'block';
  // Compute counts and update colors
  updateHeatMap();
}

function hideHeatMap() {
  // Hide heatmap grid
  document.getElementById('heatmapGrid').style.display = 'none';
  // Show pitch type selection
  document.getElementById('pitchTypeSelection').style.display = 'block';
}

/* ===== Intended Zone "Natural Miss" map ===== */
function toggleIntendedMissMap(btn) {
  isIntendedMissMapMode = !isIntendedMissMapMode;
  if (isIntendedMissMapMode) {
    showIntendedMissMap();
    btn.innerText = 'BACK';
  } else {
    hideIntendedMissMap();
    btn.innerText = 'HEAT MAP';
  }
}

function showIntendedMissMap() {
  // Focus on the miss map view
  document.getElementById('missMapContainer').style.display = 'block';
  document.getElementById('intendedZonePitchTypeSelection').style.display = 'none';
  document.getElementById('intendedZoneSelection').style.display = 'none';
  document.getElementById('actualZoneSelection').style.display = 'none';

  buildMissMapPitchOptions();
  renderMissSummaryCards();
}

function hideIntendedMissMap() {
  document.getElementById('missMapContainer').style.display = 'none';
  // Return to the usual intended-zone flow
  document.getElementById('intendedZonePitchTypeSelection').style.display = 'block';
  document.getElementById('intendedZoneSelection').style.display = 'none';
  document.getElementById('actualZoneSelection').style.display = 'none';
}

function buildMissMapPitchOptions() {
  const select = document.getElementById('missMapPitchType');
  if (!select) return;
  const types = Array.from(new Set(intendedZoneData.map(p => p.pitchType))).sort();
  select.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All pitches';
  select.appendChild(allOpt);

  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });

  if (types.length && !types.includes(missMapSelectedPitchType)) {
    missMapSelectedPitchType = 'all';
  }
  select.value = missMapSelectedPitchType;
}

function getMissArrowColor(count, max) {
  if (max === 0) return '#9e9e9e';
  const start = { r: 106, g: 183, b: 255 }; // light blue
  const end = { r: 211, g: 47, b: 47 };     // deep red
  const ratio = count / max;
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);
  return `rgb(${r},${g},${b})`;
}

function drawMissArrow(svg, from, to, color, width) {
  const ns = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', from.x);
  line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x);
  line.setAttribute('y2', to.y);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', width);
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headLen = 8 + width; // scale arrow head with thickness
  const hx1 = to.x - headLen * Math.cos(angle - Math.PI / 6);
  const hy1 = to.y - headLen * Math.sin(angle - Math.PI / 6);
  const hx2 = to.x - headLen * Math.cos(angle + Math.PI / 6);
  const hy2 = to.y - headLen * Math.sin(angle + Math.PI / 6);

  const head = document.createElementNS(ns, 'polygon');
  head.setAttribute('points', `${to.x},${to.y} ${hx1},${hy1} ${hx2},${hy2}`);
  head.setAttribute('fill', color);
  head.setAttribute('opacity', 0.9);
  svg.appendChild(head);
}

function drawDot(svg, point, color) {
  const ns = 'http://www.w3.org/2000/svg';
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', 4);
  circle.setAttribute('fill', color);
  svg.appendChild(circle);
}

function zoneCssClass(zoneId) {
  if (strikeLocations.includes(zoneId)) return 'strikeZone';
  if (shadowLocations.includes(zoneId)) return 'shadowZone';
  return 'nonCompetitiveZone';
}

function computeMissSummary(pitches) {
  const counts = {};
  const intendedCounts = {};
  const missByIntended = {};

  pitches.forEach(p => {
    counts[p.actualZone] = (counts[p.actualZone] || 0) + 1;
    intendedCounts[p.intendedZone] = (intendedCounts[p.intendedZone] || 0) + 1;

    if (p.actualZone !== p.intendedZone) {
      const [r, c] = getZoneRowCol(p.actualZone);
      if (r === -1 || c === -1) return;
      if (!missByIntended[p.intendedZone]) {
        missByIntended[p.intendedZone] = { missCount: 0, sumRow: 0, sumCol: 0, sumDist: 0 };
      }
      missByIntended[p.intendedZone].missCount++;
      missByIntended[p.intendedZone].sumRow += r;
      missByIntended[p.intendedZone].sumCol += c;
      missByIntended[p.intendedZone].sumDist += p.distance;
    }
  });

  return { counts, intendedCounts, missByIntended, total: pitches.length };
}

function drawMissArrowsForType(gridEl, svg, missByIntended, globalMissMax) {
  Object.entries(missByIntended).forEach(([intendedZone, stats]) => {
    if (!stats || !stats.missCount) return;
    const origin = getMiniCellCenter(gridEl, Number(intendedZone));
    const avgRow = stats.sumRow / stats.missCount;
    const avgCol = stats.sumCol / stats.missCount;
    const centroid = getMiniPointFromRowCol(gridEl, avgRow, avgCol);
    const vector = { x: centroid.x - origin.x, y: centroid.y - origin.y };
    const vecLength = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (!vecLength) {
      drawDot(svg, origin, getMissArrowColor(stats.missCount, globalMissMax));
      return;
    }

    const style = getComputedStyle(gridEl);
    const gap = parseFloat(style.gap) || 0;
    const firstCell = gridEl.querySelector('.mini-cell');
    const cellWidth = firstCell ? firstCell.getBoundingClientRect().width : 0;
    const stepSize = cellWidth + gap;

    const avgDist = stats.sumDist / stats.missCount;
    const desiredPixels = Math.max(avgDist * stepSize, stepSize * 0.5);
    const scale = desiredPixels / vecLength;
    const target = {
      x: origin.x + vector.x * scale,
      y: origin.y + vector.y * scale
    };

    const color = getMissArrowColor(stats.missCount, globalMissMax || stats.missCount);
    const width = 2 + (stats.missCount / (globalMissMax || stats.missCount || 1)) * 4;
    drawMissArrow(svg, origin, target, color, width);
  });
}

// === FIX: Intended-Zone Miss Map (unified, arrow-enabled, pitch-type grouping) ===

// Helper: color scale for arrow intensity
function getMissArrowColor(count, max) {
  if (!max) return '#9e9e9e';
  const start = { r: 106, g: 183, b: 255 };
  const end   = { r: 211, g: 47,  b: 47  };
  const t = count / max;
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r},${g},${b})`;
}

// Helper: simple whiteâ†'red heat for cells
function getHeatMapColor(value, max) {
  if (!max) return 'rgb(245,245,245)';
  const ratio = value / max;
  const g = Math.round(255 - 155 * ratio);
  const b = Math.round(255 - 155 * ratio);
  return `rgb(255,${g},${b})`;
}

// Helper: classify a zone â†' CSS class already used elsewhere
function zoneCssClass(zoneId) {
  if (strikeLocations.includes(zoneId)) return 'strikeZone';
  if (shadowLocations.includes(zoneId)) return 'shadowZone';
  if (nonCompetitiveLocations.includes(zoneId)) return 'nonCompetitiveZone';
  return '';
}

// Geometry helpers
function getMiniCellCenter(gridEl, zoneId) {
  const cell = gridEl.querySelector(`.mini-cell[data-zone="${zoneId}"]`);
  if (!cell) return { x: 0, y: 0 };
  const wrap = gridEl.parentElement || gridEl;
  const cellRect = cell.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  return {
    x: cellRect.left - wrapRect.left + cellRect.width / 2,
    y: cellRect.top  - wrapRect.top  + cellRect.height / 2
  };
}

function getMiniPointFromRowCol(gridEl, row, col) {
  const first = gridEl.querySelector('.mini-cell');
  if (!first) return { x: 0, y: 0 };
  const wrapRect = (gridEl.parentElement || gridEl).getBoundingClientRect();
  const gridRect = gridEl.getBoundingClientRect();
  const style = getComputedStyle(gridEl);
  const gap = parseFloat(style.gap) || 0;
  const cellRect = first.getBoundingClientRect();
  const w = cellRect.width, h = cellRect.height;
  return {
    x: (gridRect.left - wrapRect.left) + col * (w + gap) + w / 2,
    y: (gridRect.top  - wrapRect.top ) + row * (h + gap) + h / 2
  };
}

// Summary for a set of pitches (one pitch type bucket)
function computeMissSummary(pitches) {
  const counts = {};          // actual landings heat
  const intendedCounts = {};  // intended targets outline
  const missByIntended = {};  // vectors per intended zone

  pitches.forEach(p => {
    counts[p.actualZone] = (counts[p.actualZone] || 0) + 1;
    intendedCounts[p.intendedZone] = (intendedCounts[p.intendedZone] || 0) + 1;

    if (p.intendedZone !== p.actualZone) {
      // Use row/col from zone grid order lookups
      const [r, c] = getZoneRowCol(p.actualZone);
      if (!missByIntended[p.intendedZone]) {
        missByIntended[p.intendedZone] = { missCount: 0, sumRow: 0, sumCol: 0, sumDist: 0 };
      }
      const bucket = missByIntended[p.intendedZone];
      bucket.missCount++;
      bucket.sumRow  += r;
      bucket.sumCol  += c;
      bucket.sumDist += p.distance;
    }
  });

  return { counts, intendedCounts, missByIntended, total: pitches.length };
}

function getBestIntendedZoneForType(pitchType) {
  const counts = new Map(); // intendedZone -> strike count
  const sample = intendedZoneData.filter(p => p.pitchType === pitchType);
  for (const p of sample) {
    if (strikeLocations.includes(p.actualZone)) {
      counts.set(p.intendedZone, (counts.get(p.intendedZone) || 0) + 1);
    }
  }
  // choose the zone with the highest count (tie -> lowest zone id)
  let bestZone = null, bestCount = -1;
  for (const [zone, cnt] of counts.entries()) {
    const z = Number(zone);
    if (cnt > bestCount || (cnt === bestCount && (bestZone === null || z < bestZone))) {
      bestZone = z; bestCount = cnt;
    }
  }
  return bestZone;
}

/* ---------- UTIL: make overlay SVG sit exactly on the grid ---------- */
function mountOverlayAndDraw(wrapper, grid, drawFn) {
  wrapper.style.position = 'relative';
  requestAnimationFrame(() => {
    const rect = grid.getBoundingClientRect();
    const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '20';               // <-- ensure arrows are on top
    svg.setAttribute('width',  rect.width);
    svg.setAttribute('height', rect.height);
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    wrapper.appendChild(svg);              // <-- append last so it paints on top
    drawFn(svg);
  });
}

/* ---------- â€œALL PITCHESâ€ CARD BUILDER: one grid per PITCH TYPE ---------- */
function buildAllPitchesCard(type, summary) {
  const card    = document.createElement('div'); card.className = 'miss-summary-card';
  const header  = document.createElement('div'); header.className = 'miss-summary-header';
  const title   = document.createElement('span'); title.textContent = `${type}`;
  const meta    = document.createElement('span'); meta.className = 'miss-summary-meta';
  meta.textContent = `${summary.total} pitch${summary.total === 1 ? '' : 'es'}`;
  header.appendChild(title); header.appendChild(meta); card.appendChild(header);

  const wrapper = document.createElement('div'); wrapper.className = 'miss-mini-wrapper';
  const grid    = document.createElement('div'); grid.className = 'miss-mini-grid';
  if (!getComputedStyle(grid).gridTemplateColumns) {
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    grid.style.gap = '2px';
  }

  // Decide which intended zone to outline (most strikes for this pitch type)
  const bestIntended = getBestIntendedZoneForType(type);

  // Heat scale
  const maxCount = Math.max(...zoneGridOrder.map(z => summary.counts[z] || 0), 0);

  // Paint cells: always heatmap; outline only the best intended zone
  zoneGridOrder.forEach(z => {
    const cell = document.createElement('div');
    cell.className = `mini-cell ${zoneCssClass(z)}`;
    cell.dataset.zone = z;

    const count = summary.counts[z] || 0;
    cell.style.backgroundColor = maxCount ? getHeatMapColor(count, maxCount) : '#f5f5f5';

    if (bestIntended != null && z === bestIntended) {
      // Outline only, no blue fill so heatmap stays visible
      cell.style.outline = '2px solid #29B6F6';      // why: highlight top producing intended zone
      cell.style.boxSizing = 'border-box';
      cell.style.zIndex = '10';
    }

    grid.appendChild(cell);
  });

  // Mount grid first, then overlay for arrows
  wrapper.appendChild(grid);
  card.appendChild(wrapper);

  // Arrows (centroid per intended zone)
  mountOverlayAndDraw(wrapper, grid, (svg) => {
    const globalMissMax = Math.max(
      ...Object.values(summary.missByIntended || {}).map(m => m?.missCount || 0),
      0
    );
    drawMissArrowsForType(grid, svg, summary.missByIntended || {}, globalMissMax);
  });

  return card;
}

// Draw a single arrow (with head)
function drawMissArrow(svg, from, to, color, width) {
  const ns = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x);   line.setAttribute('y2', to.y);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', width);
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = 8 + width;
  const hx1 = to.x - head * Math.cos(angle - Math.PI / 6);
  const hy1 = to.y - head * Math.sin(angle - Math.PI / 6);
  const hx2 = to.x - head * Math.cos(angle + Math.PI / 6);
  const hy2 = to.y - head * Math.sin(angle + Math.PI / 6);
  const poly = document.createElementNS(ns, 'polygon');
  poly.setAttribute('points', `${to.x},${to.y} ${hx1},${hy1} ${hx2},${hy2}`);
  poly.setAttribute('fill', color);
  poly.setAttribute('opacity', 0.9);
  svg.appendChild(poly);
}

// Dot if no vector length (exact hits)
function drawDot(svg, point, color) {
  const ns = 'http://www.w3.org/2000/svg';
  const c = document.createElementNS(ns, 'circle');
  c.setAttribute('cx', point.x); c.setAttribute('cy', point.y);
  c.setAttribute('r', 4); c.setAttribute('fill', color);
  svg.appendChild(c);
}

// Draw all arrows for a pitch-type summary (centroid per intended zone)
function drawMissArrowsForType(gridEl, svg, missByIntended, globalMissMax) {
  Object.entries(missByIntended).forEach(([intendedZone, stats]) => {
    if (!stats || !stats.missCount) return;

    const origin   = getMiniCellCenter(gridEl, Number(intendedZone));
    const avgRow   = stats.sumRow / stats.missCount;
    const avgCol   = stats.sumCol / stats.missCount;
    const centroid = getMiniPointFromRowCol(gridEl, avgRow, avgCol);

    const vec = { x: centroid.x - origin.x, y: centroid.y - origin.y };
    const len = Math.hypot(vec.x, vec.y);
    if (!len) { drawDot(svg, origin, getMissArrowColor(stats.missCount, globalMissMax)); return; }

    // Scale arrow length to avg grid-distance
    const style    = getComputedStyle(gridEl);
    const gap      = parseFloat(style.gap) || 0;
    const first    = gridEl.querySelector('.mini-cell');
    const cw       = first ? first.getBoundingClientRect().width  : 0;
    const stepSize = cw + gap;
    const avgDist  = stats.sumDist / stats.missCount;
    const desired  = Math.max(avgDist * stepSize, stepSize * 0.5);
    const scale    = desired / len;
    const target   = { x: origin.x + vec.x * scale, y: origin.y + vec.y * scale };

    const color = getMissArrowColor(stats.missCount, globalMissMax || stats.missCount);
    const width = 2 + (stats.missCount / (globalMissMax || stats.missCount || 1)) * 4;
    drawMissArrow(svg, origin, target, color, width);
  });
}

/* ---------- MAIN RENDER (keeps your current grouping) ---------- */
function renderMissSummaryCards() {
  const cards  = document.getElementById('missMapCards');
  const status = document.getElementById('missMapStatus');
  if (!cards || !status) return;
  cards.innerHTML = '';

  if (!intendedZoneData.length) { status.innerText = 'No intended zone pitches recorded yet.'; return; }

  const filtered = intendedZoneData.filter(p =>
    missMapSelectedPitchType === 'all' || p.pitchType === missMapSelectedPitchType
  );
  if (!filtered.length) { status.innerText = 'No pitches recorded for that pitch type yet.'; return; }

  // A) All pitches â†' one card per pitch TYPE (unchanged behavior)
  if (missMapSelectedPitchType === 'all') {
    const byType = {};
    filtered.forEach(p => { (byType[p.pitchType] ||= []).push(p); });

    const summaryByType = {};
    Object.keys(byType).forEach(t => { summaryByType[t] = computeMissSummary(byType[t]); });

    Object.keys(byType).sort().forEach(t => {
      const card = buildAllPitchesCard(t, summaryByType[t]);
      cards.appendChild(card);
    });

    status.innerText = 'All Pitches â€“ summarized by pitch type';
    return;
  }

  // B) Single pitch type â†' one card per pitch (make intended/actual obvious + arrow)
  filtered.forEach(pitch => {
    const card   = document.createElement('div'); card.className = 'miss-summary-card';
    const header = document.createElement('div'); header.className = 'miss-summary-header';
    const title  = document.createElement('span'); title.textContent = `Pitch #${pitch.pitchNumber}`;
    const meta   = document.createElement('span'); meta.className = 'miss-summary-meta';
    meta.textContent = `${pitch.pitchType.toUpperCase()} â€“ Intended ${pitch.intendedZone} â†' Actual ${pitch.actualZone}`;
    header.appendChild(title); header.appendChild(meta); card.appendChild(header);

    const wrapper = document.createElement('div'); wrapper.className = 'miss-mini-wrapper';

    const grid = document.createElement('div');
    grid.className = 'miss-mini-grid';
    if (!getComputedStyle(grid).gridTemplateColumns) {
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
      grid.style.gap = '2px';
    }

    zoneGridOrder.forEach(z => {
      const cell = document.createElement('div');
      cell.className = `mini-cell ${zoneCssClass(z)}`;
      cell.dataset.zone = z;
      if (z === pitch.intendedZone) { cell.classList.add('intended-target'); cell.style.outline = '2px solid #fff'; cell.style.boxSizing = 'border-box'; } // visible target
      if (z === pitch.actualZone)   { cell.classList.add('actual-landing'); cell.style.backgroundColor = '#d32f2f'; } // visible landing
      grid.appendChild(cell);
    });

    card.appendChild(wrapper);                  // <-- mount first
    mountOverlayAndDraw(wrapper, grid, (svg) => {
      const origin = getMiniCellCenter(grid, pitch.intendedZone);
      const target = getMiniCellCenter(grid, pitch.actualZone);
      if (pitch.intendedZone === pitch.actualZone) {
        drawDot(svg, target, '#ff5252');
      } else {
        drawMissArrow(svg, origin, target, '#d32f2f', 3);
      }
    });

    cards.appendChild(card);
  });

  status.innerText = `${missMapSelectedPitchType.toUpperCase()} â€“ per pitch`;
}

// === END FIX ===

/* ===== Intended Zone "Natural Miss" map ===== */

// 1. STATE TOGGLE
function toggleIntendedMissMap(btn) {
  isIntendedMissMapMode = !isIntendedMissMapMode;
  if (isIntendedMissMapMode) {
    showIntendedMissMap();
    btn.innerText = 'BACK';
  } else {
    hideIntendedMissMap();
    btn.innerText = 'HEAT MAP';
  }
}

function showIntendedMissMap() {
  document.getElementById('missMapContainer').style.display = 'block';
  document.getElementById('intendedZonePitchTypeSelection').style.display = 'none';
  document.getElementById('intendedZoneSelection').style.display = 'none';
  document.getElementById('actualZoneSelection').style.display = 'none';
  
  buildMissMapPitchOptions();
  renderMissSummaryCards();
}

function hideIntendedMissMap() {
  document.getElementById('missMapContainer').style.display = 'none';
  document.getElementById('intendedZonePitchTypeSelection').style.display = 'block';
  document.getElementById('intendedZoneSelection').style.display = 'none';
  document.getElementById('actualZoneSelection').style.display = 'none';
}

// 2. DATA PREP & SUMMARY

function buildMissMapPitchOptions() {
  const select = document.getElementById('missMapPitchType');
  if (!select) return;
  const types = Array.from(new Set(intendedZoneData.map(p => p.pitchType))).sort();
  select.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All pitches';
  select.appendChild(allOpt);
  
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
  
  if (types.length && !types.includes(missMapSelectedPitchType)) {
    missMapSelectedPitchType = 'all';
  }
  select.value = missMapSelectedPitchType;
}

// Computes the centroid of misses for every intended zone
function computeMissSummary(pitches) {
  const counts = {};          // Actual landing heatmap
  const intendedCounts = {};  // How often we TRIED to hit a zone
  const missByIntended = {};  // The arrow data
  
  pitches.forEach(p => {
    // Heatmap data
    counts[p.actualZone] = (counts[p.actualZone] || 0) + 1;
    // Target frequency
    intendedCounts[p.intendedZone] = (intendedCounts[p.intendedZone] || 0) + 1;

    // Arrow Logic: Only calculate vectors for misses
    if (p.actualZone !== p.intendedZone) {
      const [r, c] = getZoneRowCol(p.actualZone);
      if (r === -1 || c === -1) return;

      if (!missByIntended[p.intendedZone]) {
        missByIntended[p.intendedZone] = {
          missCount: 0,
          sumRow: 0,
          sumCol: 0,
          sumDist: 0,
          strikeLandings: 0, // for coloring RED
          ballLandings: 0,   // for coloring BLUE
          pitches: []        // <--- CRITICAL FIX: Store the pitches!
        };
      }
      
      const bucket = missByIntended[p.intendedZone];
      bucket.pitches.push(p);
      bucket.missCount++;
      bucket.sumRow  += r;
      bucket.sumCol  += c;
      bucket.sumDist += (p.distance || 0);

      // Color Logic: Check where it ACTUALLY landed
      if (strikeLocations.includes(p.actualZone)) {
        bucket.strikeLandings++;
      } else {
        bucket.ballLandings++;
      }
    }
  });

  return { counts, intendedCounts, missByIntended, total: pitches.length };
}


// 3. COLOR UTILS
const _RED  = { r: 211, g: 47,  b: 47  }; // Strike Zone landing
const _BLUE = { r: 33,  g: 150, b: 243 }; // Ball/Shadow landing

function _mixWithWhite(base, t) {
  // t=1 => full color, t=0 => white
  const k = Math.max(0, Math.min(1, t)); 
  const r = Math.round(255 + (base.r - 255) * (1 - k)); // Incorrect math in previous snippet fixed here? 
  // actually, let's use a simpler mix: 
  // if k=1 return base. if k=0 return white.
  // r = 255 + (base.r - 255)*k is fading TO color.
  const r_ = Math.round(255 + (base.r - 255) * k);
  const g_ = Math.round(255 + (base.g - 255) * k);
  const b_ = Math.round(255 + (base.b - 255) * k);
  return `rgb(${r_},${g_},${b_})`;
}

// Background for heat map (Gray to Red)
function getHeatMapColor(value, max) {
  if (!max) return 'rgb(245,245,245)';
  const ratio = value / max;
  const g = Math.round(255 - 155 * ratio);
  const b = Math.round(255 - 155 * ratio);
  return `rgb(255,${g},${b})`;
}

function zoneCssClass(zoneId) {
  if (strikeLocations.includes(zoneId)) return 'strikeZone';
  if (shadowLocations.includes(zoneId)) return 'shadowZone';
  return 'nonCompetitiveZone';
}


// 4. DRAWING & CARDS

function renderMissSummaryCards() {
  const cards  = document.getElementById('missMapCards');
  const status = document.getElementById('missMapStatus');
  if (!cards || !status) return;
  cards.innerHTML = '';
  
  if (!intendedZoneData.length) { 
    status.innerText = 'No intended zone pitches recorded yet.'; 
    return;
  }

  const filtered = intendedZoneData.filter(p =>
    missMapSelectedPitchType === 'all' || p.pitchType === missMapSelectedPitchType
  );
  
  if (!filtered.length) { 
    status.innerText = 'No pitches recorded for that selection.'; 
    return; 
  }

  // --- VIEW A: AGGREGATE SUMMARY (One card per pitch type) ---
  if (missMapSelectedPitchType === 'all') {
    status.innerText = 'All Pitches â€“ Summarized by Pitch Type';
    
    // Group by pitch type
    const byType = {};
    filtered.forEach(p => { (byType[p.pitchType] ||= []).push(p); });

    Object.keys(byType).sort().forEach(type => {
      const summary = computeMissSummary(byType[type]);
      const card = buildSummaryCard(type, summary);
      cards.appendChild(card);
    });
    return;
  }

  // --- VIEW B: INDIVIDUAL PITCHES (One card per pitch) ---
  status.innerText = `${missMapSelectedPitchType.toUpperCase()} â€“ Individual Pitches`;
  
  filtered.forEach(pitch => {
    const card = buildSinglePitchCard(pitch);
    cards.appendChild(card);
  });
}

function buildSummaryCard(type, summary) {
  // Styles for the "Intended" target square
  const TARGET_BG = '#E1F5FE'; // Light Blue
  const TARGET_BORDER = '#29B6F6'; // Blue Outline

  const card = document.createElement('div');
  card.className = 'miss-summary-card';
  
  // Header
  const header = document.createElement('div'); 
  header.className = 'miss-summary-header';
  header.innerHTML = `<span>${type}</span><span class="miss-summary-meta">${summary.total} pitches</span>`;
  card.appendChild(header);

  // Grid Wrapper
  const wrapper = document.createElement('div'); 
  wrapper.className = 'miss-mini-wrapper';

  const grid = document.createElement('div');
  grid.className = 'miss-mini-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '2px';

  // Find max heat for scaling background colors
  const maxCount = Math.max(0, ...Object.values(summary.counts));

  // Build Cells
  zoneGridOrder.forEach(z => {
    const cell = document.createElement('div');
    cell.className = `mini-cell ${zoneCssClass(z)}`;
    cell.dataset.zone = z;

    const count = summary.counts[z] || 0;
    
    // If this was an Intended Target
    if (summary.intendedCounts[z]) {
        cell.style.backgroundColor = TARGET_BG; 
        cell.style.outline = `2px solid ${TARGET_BORDER}`;
        cell.style.zIndex = '10'; // Borders stay crisp, but SVG (z-20) is now higher
    } else {
        // Normal Heatmap Logic
        cell.style.backgroundColor = count ? getHeatMapColor(count, maxCount) : '#f5f5f5';
    }
    
    grid.appendChild(cell);
  });

  wrapper.appendChild(grid);
  card.appendChild(wrapper);

  // Draw Arrows Layer
  mountOverlayAndDraw(wrapper, grid, (svg) => {
    // Determine global max misses for arrow thickness/opacity scaling
    const globalMissMax = Math.max(0, ...Object.values(summary.missByIntended).map(m => m.missCount));
    drawMissArrowsForType(grid, svg, summary.missByIntended, globalMissMax);
  });

  return buildAllPitchesCard(type, summary);
}

function buildSinglePitchCard(pitch) {
  const card = document.createElement('div'); 
  card.className = 'miss-summary-card';
  
  const header = document.createElement('div'); 
  header.className = 'miss-summary-header';
  header.innerHTML = `<span>#${pitch.pitchNumber}</span><span class="miss-summary-meta">${pitch.actualZone === pitch.intendedZone ? 'HIT' : 'MISS'}</span>`;
  card.appendChild(header);

  const wrapper = document.createElement('div'); 
  wrapper.className = 'miss-mini-wrapper';

  const grid = document.createElement('div');
  grid.className = 'miss-mini-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '2px';

  zoneGridOrder.forEach(z => {
    const cell = document.createElement('div');
    cell.className = `mini-cell ${zoneCssClass(z)}`;
    
    // Highlight Intended
    if (z === pitch.intendedZone) {
       cell.style.backgroundColor = '#E1F5FE'; 
       cell.style.outline = '2px solid #29B6F6';
       cell.style.zIndex = '10';
    }
    // Highlight Actual (if different)
    if (z === pitch.actualZone && z !== pitch.intendedZone) {
       cell.style.backgroundColor = '#ef5350'; // red landing
    }
    grid.appendChild(cell);
  });

  wrapper.appendChild(grid);
  card.appendChild(wrapper);

  // Arrow
  mountOverlayAndDraw(wrapper, grid, (svg) => {
    const origin = getMiniCellCenter(grid, pitch.intendedZone);
    const target = getMiniCellCenter(grid, pitch.actualZone);
    
    if (pitch.intendedZone !== pitch.actualZone) {
        // Color based on where it landed
        const isStrike = strikeLocations.includes(pitch.actualZone);
        const color = isStrike ? 'rgb(211,47,47)' : 'rgb(33,150,243)';
        drawMissArrow(svg, origin, target, color, 3, 0.9);
    } else {
        // Dot for exact hit
        drawDot(svg, target, '#4CAF50');
    }
  });

  return card;
}

// 5. SVG DRAWING HELPERS

function mountOverlayAndDraw(wrapper, grid, drawFn) {
  wrapper.style.position = 'relative';
  requestAnimationFrame(() => {
    const rect = grid.getBoundingClientRect();
    const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '20';               // <-- ensure arrows are on top
    svg.setAttribute('width',  rect.width);
    svg.setAttribute('height', rect.height);
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    wrapper.appendChild(svg);              // <-- append last so it paints on top
    drawFn(svg);
  });
}

function drawMissArrowsForType(gridEl, svg, missByIntended, globalMissMax) {
  Object.entries(missByIntended).forEach(([intendedZone, stats]) => {
    if (!stats || !stats.missCount) return;

    const origin = getMiniCellCenter(gridEl, Number(intendedZone));
    
    // Calculate Centroid (Average landing spot)
    const avgRow = stats.sumRow / stats.missCount;
    const avgCol = stats.sumCol / stats.missCount;
    const centroid = getMiniPointFromRowCol(gridEl, avgRow, avgCol);

    const vec = { x: centroid.x - origin.x, y: centroid.y - origin.y };
    const len = Math.hypot(vec.x, vec.y);

    // Intensity = how frequent is this miss compared to the max miss count?
    // Map 0..1 range
    const intensity = stats.missCount / (globalMissMax || 1);

    if (len < 1) {
        drawDot(svg, origin, '#555'); 
        return;
    }

    // SCALING: Make the arrow length relative to grid size so short misses don't disappear
    const firstCell = gridEl.querySelector('.mini-cell');
    const cellSize  = firstCell ? firstCell.getBoundingClientRect().width : 20;
    const avgDist   = stats.sumDist / stats.missCount; // average grid units distance
    
    // We want the arrow to visually represent the distance, 
    // but maybe slightly exaggerated for visibility if it's very short.
    const pxPerUnit = cellSize + 2; // approx cell width + gap
    const targetLen = Math.max(avgDist * pxPerUnit, pxPerUnit * 0.5);
    const scale     = targetLen / len;

    const target = {
        x: origin.x + vec.x * scale,
        y: origin.y + vec.y * scale
    };

    // COLOR LOGIC: Red if majority land in Strike Zone, Blue if majority land Outside
    const isMajorityStrike = stats.strikeLandings >= stats.ballLandings;
    const baseColor = isMajorityStrike ? _RED : _BLUE;
    
    // Color strength based on intensity (fades to white if low frequency, strong color if high)
    // Actually, user requested color intensity determined by frequency.
    // Let's keep the hue solid but adjust opacity or saturation.
    const color = _mixWithWhite(baseColor, Math.max(0.4, intensity)); 
    const width = 2 + (4 * intensity); // Thicker arrows for more frequent misses
    const opacity = 0.6 + (0.4 * intensity);

    drawMissArrow(svg, origin, target, color, width, opacity);
  });
}

function drawMissArrow(svg, from, to, color, width, opacity = 1.0) {
  const ns = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', from.x);
  line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x);
  line.setAttribute('y2', to.y);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', width);
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('opacity', opacity);
  svg.appendChild(line);

  // Arrowhead
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headLen = 8 + (width * 0.5); 
  const hx1 = to.x - headLen * Math.cos(angle - Math.PI / 6);
  const hy1 = to.y - headLen * Math.sin(angle - Math.PI / 6);
  const hx2 = to.x - headLen * Math.cos(angle + Math.PI / 6);
  const hy2 = to.y - headLen * Math.sin(angle + Math.PI / 6);

  const poly = document.createElementNS(ns, 'polygon');
  poly.setAttribute('points', `${to.x},${to.y} ${hx1},${hy1} ${hx2},${hy2}`);
  poly.setAttribute('fill', color);
  poly.setAttribute('opacity', opacity);
  svg.appendChild(poly);
}

function drawDot(svg, point, color) {
  const ns = 'http://www.w3.org/2000/svg';
  const c = document.createElementNS(ns, 'circle');
  c.setAttribute('cx', point.x); 
  c.setAttribute('cy', point.y);
  c.setAttribute('r', 4); 
  c.setAttribute('fill', color);
  svg.appendChild(c);
}

// 6. GEOMETRY HELPERS

function getMiniCellCenter(gridEl, zoneId) {
  const cell = gridEl.querySelector(`.mini-cell[data-zone="${zoneId}"]`);
  if (!cell) return { x: 0, y: 0 };
  
  const wrap = gridEl.parentElement; // the wrapper
  const cellRect = cell.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  
  return {
    x: (cellRect.left - wrapRect.left) + cellRect.width / 2,
    y: (cellRect.top - wrapRect.top) + cellRect.height / 2
  };
}

function getMiniPointFromRowCol(gridEl, row, col) {
  const first = gridEl.querySelector('.mini-cell');
  if (!first) return { x: 0, y: 0 };
  
  const wrap = gridEl.parentElement;
  const gridRect = gridEl.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  
  const cellRect = first.getBoundingClientRect();
  const w = cellRect.width;
  const h = cellRect.height;
  
  // Assuming 2px gap as defined in style
  const gap = 2; 
  
  const offsetX = (gridRect.left - wrapRect.left);
  const offsetY = (gridRect.top - wrapRect.top);
  
  return {
    x: offsetX + col * (w + gap) + w / 2,
    y: offsetY + row * (h + gap) + h / 2
  };
}

/* --- use the same white-to-red heat-scale for table cells -------- */
function shadeCell(el, pct) {
  el.style.backgroundColor = getHeatMapColor(pct, 100);   // 0-100 range
  el.style.color = pct > 60 ? '#fff' : '#000';            // readability
}

function shadeCellByColumn(el, value, colMax) {
  const max = colMax || 0;
  el.style.backgroundColor = getHeatMapColor(value, max);
  const ratio = max ? (value / max) : 0;
  el.style.color = ratio > 0.6 ? '#fff' : '#000';
}

function computeColumnMax(map, columns) {
  const maxes = {};
  columns.forEach(c => maxes[c] = 0);
  map.forEach((stats, key) => {
    if (key === 'ALL') return; // ignore any aggregate bucket if present
    columns.forEach(c => {
      const v = Number(stats[c]) || 0;
      if (v > maxes[c]) maxes[c] = v;
    });
  });
  return maxes;
}


/* --- map %-metric â†' its raw count so we can show â€œ(n)â€ ----------- */
function metricCount(stats, metric) {
  switch (metric) {
    case 'izPct'        : return stats.iz;
    case 'oozPct'       : return stats.ooz;
    case 'cswPct'       : return stats.csw;
    case 'strikePct'    : return stats.strike;
    case 'swingPct'     : return stats.swing;
    case 'flyPct'       : return stats.fly;
    case 'gbPct'        : return stats.gb;
    case 'ldPct'        : return stats.ld;
    case 'puPct'        : return stats.pu;
    case 'earlySwingPct': return stats.earlySwing;
    case 'lateSwingPct' : return stats.lateSwing;
    case 'chasePct'     : return stats.oozSwing;
    case 'usagePct'     : return stats.pitches;
    default             : return stats.pitches;
  }
}

function updateHeatmapBatterFilter () {
  const sel = document.getElementById('filterBatter');
  if (!sel) return;

  const prev = sel.value;           // try to preserve current selection
  sel.innerHTML = '';

  sel.appendChild(new Option('All', 'all'));
  sel.appendChild(new Option('LHH only', 'L'));
  sel.appendChild(new Option('RHH only', 'R'));

  batters.forEach(b => {
    const label = `${b.name} (${b.hand})`;
    sel.appendChild(new Option(label, `id:${b.id}`));
  });

  // restore previous selection if still present
  const hasPrev = [...sel.options].some(o => o.value === prev);
  sel.value = hasPrev ? prev : 'all';
}


/* ========== helpers for the per-pitch / per-batter tables ========== */
function initStats () {
  return {
    pitches:0, swing:0, csw:0, strike:0,
    iz:0, ooz:0,            // all O-O-Z pitches
    oozSwing:0,             // swings at O-O-Z pitches
    fly:0, gb:0, ld:0, pu:0,
    inPlayOuts:0, inPlayHits:0,
    gbOut:0, fbOut:0, ldOut:0, puOut:0,
    gbHit:0, fbHit:0, ldHit:0, puHit:0,
    earlySwing:0, lateSwing:0,
    earlyPitches:0, latePitches:0
  };
}

function accumulate(stats, p) {
  stats.pitches++;

  const swung = ['whiff','foul'].includes(p.outcome) ||
                (p.result?.startsWith('In Play'));
  const isStrike = ['whiff','calledStrike','foul','strike','inPlay']
                   .includes(p.outcome);
  const isCSW = ['whiff','calledStrike'].includes(p.outcome);

  // Robust preâ€'pitch strikes:
  // Prefer prePitchCount.strikes. If missing, infer from postPitchCount and outcome.
  let preStrikes;
  if (p.prePitchCount && typeof p.prePitchCount.strikes === 'number') {
    preStrikes = p.prePitchCount.strikes;
  } else if (p.postPitchCount && typeof p.postPitchCount.strikes === 'number') {
    // If the pitch produced a strike, post = pre+1 (except 2â€'strike fouls keep post=2).
    const madeStrike = isStrike;
    if (!madeStrike) {
      preStrikes = p.postPitchCount.strikes; // ball/HBP/inPlay-without strike counted
    } else {
      // If post is 3, pre was 2. If post is 2, pre could be 1 (or 2 on foul with two).
      // Heuristic: if outcome is 'foul' and post===2, assume pre===2; else pre=post-1.
      if (p.postPitchCount.strikes === 3) preStrikes = 2;
      else if (p.postPitchCount.strikes === 2 && p.outcome === 'foul') preStrikes = 2;
      else preStrikes = Math.max(0, p.postPitchCount.strikes - 1);
    }
  } else {
    preStrikes = 0; // last resort
  }

  const bucket = preStrikes === 2 ? 'late' : 'early';
  if (bucket === 'early') stats.earlyPitches++; else stats.latePitches++;

  const inIZ  = strikeLocations.includes(p.location);
  const inOOZ = shadowLocations.includes(p.location) ||
                nonCompetitiveLocations.includes(p.location);

  if (swung) {
    stats.swing++;
    if (bucket === 'early') stats.earlySwing++; else stats.lateSwing++;
  }

  if (isStrike) stats.strike++;
  if (isCSW)    stats.csw++;
  if (inIZ)     stats.iz++;

  if (inOOZ) {
    stats.ooz++;
    if (swung) stats.oozSwing++;      // chase swing
  }

 if (p.result && p.result.startsWith('In Play')) {
   const isFly = p.result.includes('flyball');
   const isGB  = p.result.includes('groundball');
   const isLD  = p.result.includes('linedrive');
   const isPU  = p.result.includes('popup');

   if (isFly)      stats.fly++;
   else if (isGB)   stats.gb++;
   else if (isLD)   stats.ld++;
   else if (isPU)   stats.pu++;

   if (p.inPlayOut === true) {
     stats.inPlayOuts++;
     if (isGB)       stats.gbOut++;
     else if (isFly) stats.fbOut++;
     else if (isLD)  stats.ldOut++;
     else if (isPU)  stats.puOut++;
   } else if (p.inPlayOut === false) {
     stats.inPlayHits++;
     if (isGB)       stats.gbHit++;
     else if (isFly) stats.fbHit++;
     else if (isLD)  stats.ldHit++;
     else if (isPU)  stats.puHit++;
   }
 }
}
  
function pct (num, den) { return den ? (num/den*100) : 0; }

function buildAggregators (dataArr) {
  const byPitch  = new Map();   // pitchType â†' stats object
  const byBatter = new Map();   // batterId  â†' stats object
  const byHand   = new Map();   // 'L' | 'R' â†' stats object
  const overall  = initStats();

  dataArr.forEach(p => {
    const pKey = p.pitchType || 'UNK';
    const bKey = p.batterId  ?? 'ALL';
    const hKey = getBatterHand(p) || 'unknown';

    // overall
    accumulate(overall, p);

    // by pitch-type
    let sPitch = byPitch.get(pKey) ?? initStats();
    accumulate(sPitch, p);
    byPitch.set(pKey, sPitch);

    // by batter
    let sBat = byBatter.get(bKey) ?? initStats();
    accumulate(sBat, p);
    byBatter.set(bKey, sBat);

    // by batter handedness
    let sHand = byHand.get(hKey) ?? initStats();
    accumulate(sHand, p);
    byHand.set(hKey, sHand);
  });

  // â†³ add ready-made percentages so the table renderer stays dumb
  const addPcts = s => Object.assign(s, {
    izPct         : pct(s.iz        , s.pitches),
    oozPct        : pct(s.ooz       , s.pitches),
    cswPct        : pct(s.csw       , s.pitches),
    strikePct     : pct(s.strike    , s.pitches),
    swingPct      : pct(s.swing     , s.pitches),
    flyPct        : pct(s.fly       , s.pitches),
    gbPct         : pct(s.gb        , s.pitches),
    ldPct         : pct(s.ld        , s.pitches),
    puPct         : pct(s.pu        , s.pitches),
    inPlayOutPct  : pct(s.inPlayOuts, s.inPlayOuts + s.inPlayHits),
    earlySwingPct : pct(s.earlySwing, s.earlyPitches),
    lateSwingPct  : pct(s.lateSwing , s.latePitches),
    chasePct      : pct(s.oozSwing , s.swing)   // correct â€“ swings / swings
  });

  addPcts(overall);
  [...byPitch.values()].forEach(addPcts);
  [...byBatter.values()].forEach(addPcts);
  [...byHand.values()].forEach(addPcts);

  // usage% = pitch-type pitches / total pitches
  const totalP = overall.pitches;
  byPitch.forEach(s => { s.usagePct = pct(s.pitches, totalP); });
  byHand.forEach(s => { s.usagePct = pct(s.pitches, totalP); });
  overall.usagePct = totalP ? 100 : 0;

  return { overall, byPitch, byBatter, byHand };
}

function logCount(strikes, balls, isK, isWalk = false) {
  let countLog = document.getElementById('countLog');
  let newEntry = document.createElement('li');
  newEntry.innerText = `Final Count: ${balls}-${strikes}`;
  if (isK) {
    newEntry.innerText += ' \u{1F480}';
  } else if (isWalk) {
    newEntry.innerText += ' \u{1F6B6}'; // Emoji representing a walk
  }
  countLog.appendChild(newEntry);
}

document.getElementById('exportBtn').addEventListener('click', function() {
  exportLiveBPStats();
});


document.getElementById('heatMapBtn').addEventListener('click', function() {
  if (mode === 'intendedZone') {
    toggleIntendedMissMap(this);
    return;
  }

  isHeatMapMode = !isHeatMapMode; // Toggle heatmap mode
  if (isHeatMapMode) {
    showHeatMap();
    this.innerText = 'BACK';
  } else {
    hideHeatMap();
    this.innerText = 'HEAT MAP';
  }
});

['filterCount','filterBatter']
  .forEach(id => document.getElementById(id)?.addEventListener('change', updateHeatMap));

document.querySelectorAll('#resultFilterBtns .filterToggleBtn').forEach(btn => {
  btn.addEventListener('click', () => handleFilterToggle(btn, 'resultFilterBtns'));
});

/**
 * Append a summary of the current atâ€'bat to the atBatLog and record it
 * in the atBats array.  The pitch count is computed by counting
 * pitchData entries with the same atBatNumber.
 * @param {string} result â€“ The final result of the atâ€'bat
 *   (e.g. "Strikeout", "Walk", "HBP", "In Play â€“ groundball")
 */
function logAtBatResult(result) {
  const summary = {
    atBatNumber: atBatNumber,
    batterId: currentBatterId,
    result: result,
    pitchCount: pitchData.filter(p => p.atBatNumber === atBatNumber).length
  };
  atBats.push(summary);
  advanceToNextBatter();

  // Repaint list based on current batter filter
  renderAtBatLog();
}

function exportLiveBPStats() {
  // Apply pitcher + batter filter for export
  const exportData = pitchData.filter(p => {
    if (currentPitcherId && p.pitcherId !== currentPitcherId) return false;
    if (currentBatterId  && p.batterId  !== currentBatterId)  return false;
    return true;
  });

  let totalPitches = exportData.length;
  const exportAbNums = new Set(exportData.map(p => p.atBatNumber));
  let totalBattersFaced = exportAbNums.size;
  let totalRaceWins = exportData.filter(p =>
    p.prePitchCount?.strikes === 2 && ['whiff','calledStrike'].includes(p.outcome)
  ).length;
  let totalStrikes = 0;
  let totalStrikeouts = 0;
  let totalWalks = 0;
  let nonCompetitiveCount = 0;
  let shadowCount = 0;
  let strikeZoneCount = 0;
  let totalSwings = 0;
  let totalWhiffs = 0;

  let pitchTypeStats = {};

  exportData.forEach(pitch => {
    let pitchType = pitch.pitchType || 'unknown';
    let outcome = pitch.outcome;
    let location = pitch.location;
    let result = pitch.result;

    // Initialize pitchTypeStats for this pitchType if not already
    if (!pitchTypeStats[pitchType]) {
      pitchTypeStats[pitchType] = {
        total: 0,
        strikes: 0,
        swings: 0,
        whiffs: 0,
        nonCompetitive: 0,
        shadow: 0,
        strikeZone: 0,
      };
    }

    // Increment total pitches for this pitchType
    pitchTypeStats[pitchType].total++;

    // Check if pitch is a strike
    if (['whiff','calledStrike','foul','strike','inPlay'].includes(outcome)) {
      totalStrikes++;
      pitchTypeStats[pitchType].strikes++;
    }

    // Check if pitch resulted in a swing
    if (['whiff', 'foul'].includes(outcome) || result.startsWith('In Play')) {
      totalSwings++;
      pitchTypeStats[pitchType].swings++;
    }

    if (outcome === 'whiff') {
      totalWhiffs++;
      pitchTypeStats[pitchType].whiffs++;
    }

    // Check location
    if (nonCompetitiveLocations.includes(location)) {
      nonCompetitiveCount++;
      pitchTypeStats[pitchType].nonCompetitive++;
    } else if (shadowLocations.includes(location)) {
      shadowCount++;
      pitchTypeStats[pitchType].shadow++;
    } else if (strikeLocations.includes(location)) {
      strikeZoneCount++;
      pitchTypeStats[pitchType].strikeZone++;
    }

    // Check for strikeouts
    if (pitch.prePitchCount.strikes === 2 && ['whiff', 'calledStrike'].includes(outcome)) {
      totalStrikeouts++;
    }

    // Check for walks
    if (pitch.prePitchCount.balls === 3 && outcome === 'ball') {
      totalWalks++;
    }
  });

  let statsText = '';

  statsText += `Total Pitch Count: ${totalPitches}\n`;
  statsText += `Total Batters Faced: ${totalBattersFaced}\n`;
  statsText += `Total Race Wins: ${totalRaceWins}\n`;
  let totalStrikePercentage = (totalStrikes / totalPitches) * 100;
  statsText += `Total Strike %: ${totalStrikePercentage.toFixed(2)}%\n`;
  statsText += `Total Strikeouts: ${totalStrikeouts}\n`;
  statsText += `Total Walks: ${totalWalks}\n`;

  statsText += `Total % Non-Competitive Pitches: ${(nonCompetitiveCount / totalPitches * 100).toFixed(2)}%\n`;
  statsText += `Total % Shadow Pitches: ${(shadowCount / totalPitches * 100).toFixed(2)}%\n`;
  statsText += `Total % Strike Zone Pitches: ${(strikeZoneCount / totalPitches * 100).toFixed(2)}%\n`;

  statsText += `Total % Swings: ${(totalSwings / totalPitches * 100).toFixed(2)}%\n`;
  statsText += `Total Whiff %: ${(totalWhiffs / totalPitches * 100).toFixed(2)}% (${totalWhiffs})\n`;

  Object.entries(pitchTypeStats).forEach(([pitchType, stats]) => {
    let usagePercentage = (stats.total / totalPitches) * 100;
    let strikePercentage = (stats.strikes / stats.total) * 100;
    let swingsPercentage = (stats.swings / stats.total) * 100;
    let whiffPercentage = (stats.whiffs / stats.total) * 100;
    let nonCompetitivePercentage = (stats.nonCompetitive / stats.total) * 100;
    let shadowPercentage = (stats.shadow / stats.total) * 100;
    let strikeZonePercentage = (stats.strikeZone / stats.total) * 100;

    statsText += `\nPitch Type: ${pitchType}\n`;
    statsText += `Usage %: ${usagePercentage.toFixed(2)}%\n`;
    statsText += `Strike %: ${strikePercentage.toFixed(2)}%\n`;
    statsText += `Swings %: ${swingsPercentage.toFixed(2)}%\n`;
    statsText += `Whiff %: ${whiffPercentage.toFixed(2)}% (${stats.whiffs})\n`;
    statsText += `% Non-Competitive Pitches: ${nonCompetitivePercentage.toFixed(2)}%\n`;
    statsText += `% Shadow Pitches: ${shadowPercentage.toFixed(2)}%\n`;
    statsText += `% Strike Zone Pitches: ${strikeZonePercentage.toFixed(2)}%\n`;
  });

  // In-Play Out Stats
  let totalBIP = 0, totalIPOuts = 0, totalIPHits = 0;
  let goCount = 0, foCount = 0, loCount = 0, poCount = 0;
  exportData.forEach(p => {
    if (p.result && p.result.startsWith('In Play')) {
      totalBIP++;
      if (p.inPlayOut === true) {
        totalIPOuts++;
        if (p.result.includes('groundball')) goCount++;
        else if (p.result.includes('flyball')) foCount++;
        else if (p.result.includes('linedrive')) loCount++;
        else if (p.result.includes('popup')) poCount++;
      } else if (p.inPlayOut === false) {
        totalIPHits++;
      }
    }
  });
  statsText += `\nBalls In Play: ${totalBIP}\n`;
  if (totalIPOuts + totalIPHits > 0) {
    statsText += `BIP Out%: ${((totalIPOuts / (totalIPOuts + totalIPHits)) * 100).toFixed(1)}%\n`;
    statsText += `In-Play Outs: ${totalIPOuts} (GO: ${goCount}, FO: ${foCount}, LO: ${loCount}, PO: ${poCount})\n`;
    statsText += `In-Play Hits: ${totalIPHits}\n`;
  }

  // Active Coaching Insights
  const exportInsights = computeInsights(exportData);
  if (exportInsights.length > 0) {
    statsText += `\nCoaching Insights:\n`;
    exportInsights.forEach(ins => {
      const icon = ins.type === 'warning' ? '!' : ins.type === 'positive' ? '+' : '-';
      statsText += `  [${icon}] ${ins.message}\n`;
    });
  }

  statsText += `\nPitch Log By At-Bat:\n`;
  const atBatResultsByNumber = new Map(atBats.map(ab => [ab.atBatNumber, ab]));
  const groupedPitches = new Map();
  exportData.forEach(pitch => {
    const abNum = pitch.atBatNumber ?? 0;
    if (!groupedPitches.has(abNum)) groupedPitches.set(abNum, []);
    groupedPitches.get(abNum).push(pitch);
  });

  [...groupedPitches.keys()].sort((a, b) => a - b).forEach(abNum => {
    const pitches = groupedPitches.get(abNum) || [];
    const firstPitch = pitches[0];
    const batter = batters.find(b => b.id === firstPitch?.batterId);
    const pitcher = pitchers.find(p => p.id === firstPitch?.pitcherId);
    const abSummary = atBatResultsByNumber.get(abNum);
    const batterLabel = batter ? `${batter.name}${firstPitch ? ` (${getBatterHand(firstPitch)})` : batter.hand ? ` (${batter.hand})` : ''}` : 'Unknown';
    const pitcherLabel = pitcher ? `${pitcher.name}${pitcher.hand ? ` (${pitcher.hand})` : ''}` : 'Unknown';
    const resultLabel = abSummary ? abSummary.result : 'In Progress';

    statsText += `\nAt-Bat #${abNum} | Batter: ${batterLabel} | Pitcher: ${pitcherLabel} | Result: ${resultLabel}\n`;
    pitches.forEach((pitch, idx) => {
      const pt = (pitch.pitchType || 'UNKNOWN').toUpperCase();
      const loc = pitch.location ?? 'UNKNOWN';
      const res = pitch.result || 'UNKNOWN';
      const postBalls = (pitch.postPitchCount && typeof pitch.postPitchCount.balls === 'number') ? pitch.postPitchCount.balls : 0;
      const postStrikes = (pitch.postPitchCount && typeof pitch.postPitchCount.strikes === 'number') ? pitch.postPitchCount.strikes : 0;
      statsText += `  ${idx + 1}. ${pt}, Location: ${loc}, Result: ${res}, Count: ${postBalls}-${postStrikes}\n`;
    });
  });

  // Add tagged pitches information
  statsText += `\nTagged Pitches:\n`;

  exportData.forEach(pitch => {
    let pitchId = pitch.pitchId.toString();
    if (pitchTags[pitchId]) {
      let tagData = pitchTags[pitchId];
      let locationType = '';

      if (strikeLocations.includes(pitch.location)) {
        locationType = 'Strike Zone';
      } else if (shadowLocations.includes(pitch.location)) {
        locationType = 'Shadow Zone';
      } else if (nonCompetitiveLocations.includes(pitch.location)) {
        locationType = 'Non-Competitive';
      } else {
        locationType = 'Unknown';
      }

      statsText += `Pitch #${pitch.pitchNumber}, Pitch Type: ${pitch.pitchType.toUpperCase()}, Location: ${locationType}, Tag: ${tagData.description}`;
      if (tagData.note) {
        let noteText = tagData.note.replace(/\r?\n|\r/g, ' ');
        statsText += `, Note: ${tagData.note}\n`;
      } else {
        statsText += `\n`;
      }
    }
  });

  navigator.clipboard.writeText(statsText).then(() => {
    console.log('Live BP stats copied to clipboard.');
  }).catch(err => {
    console.error('Failed to copy stats to clipboard:', err);
  });
}

// Prevent pull-to-refresh on mobile Safari (overscroll-behavior in CSS handles modern browsers)
document.addEventListener('touchmove', function(e) {
  if ((document.scrollingElement || document.documentElement).scrollTop === 0 &&
      e.touches[0].clientY > 0) {
    e.preventDefault();
  }
}, { passive: false });

document.getElementById('newSessionBtn').addEventListener('click', clearSession);

document.addEventListener('DOMContentLoaded', function() {
  // Restore previous session before initialising UI
  loadSession();

  // Ensure the correct UI is visible as soon as the DOM is ready
  toggleMode();
  document.getElementById('pitchLocationSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlayOutSelection').style.display = 'none';
  document.getElementById('pitchTypeSelection').style.display = 'block';
  document.getElementById('heatmapGrid').style.display = 'none';
  document.getElementById('taggingOptions').style.display = 'none';
  updateHeatmapBatterFilter();
  updateBatterDropdown();
  updatePitcherDropdown();
  // Re-populate the pitch-type filter buttons from restored pitch data
  pitchData.forEach(p => p.pitchType && addPitchTypeToFilter(p.pitchType));
  // NEW: render logs on page load based on current data (initially empty)
  renderPitchLog();
  renderAtBatLog();
  updateLiveStats();
  updateUI();
  applyGridPOV();

  // AB hand toggle — delegated so it works after every renderPitchLog rebuild
  document.getElementById('pitchLog').addEventListener('click', e => {
    const btn = e.target.closest('.ab-hand-toggle');
    if (!btn) return;
    e.stopPropagation();
    const abNum = Number(btn.dataset.abnum);
    const curHand = btn.textContent.trim();
    setAbHand(abNum, curHand === 'L' ? 'R' : 'L');
  });

  // Re-tag pitch
  document.getElementById('retagPitchBtn').addEventListener('click', () => {
    retagSelectedPitchId = null;
    document.getElementById('retagTypeSelection').style.display = 'none';
    renderRetagPitchList();
    document.getElementById('retagPitchPanel').style.display = 'block';
  });
  document.getElementById('retagCloseBtn').addEventListener('click', () => {
    document.getElementById('retagPitchPanel').style.display = 'none';
    retagSelectedPitchId = null;
  });
  document.querySelectorAll('.retagTypeBtn').forEach(btn => {
    btn.addEventListener('click', () => retagPitch(btn.dataset.type));
  });
});







