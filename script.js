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

let isHeatMapMode = false;
let isTaggingMode = false;

let pitchTags = {}; 

// --------- NEW – AT‑BAT SUMMARY ---------
// This array stores summary information for each completed at‑bat when running
// in Live BP or Points mode.  Each entry looks like:
// { atBatNumber, batterId, result, pitchCount }
let atBats = [];

/* ---------- NEW – BATTER STATE ---------- */
let batters = [];              // [{id,name,hand}]
let currentBatterId = null;    // id of batter selected in dropdown
let batterAutoId = 1;          // simple incremental id

/* ---------- NEW – PITCHER STATE ---------- */
let pitchers          = [];        // [{id,name,hand}]
let currentPitcherId  = null;      // id of pitcher currently on the mound
let pitcherAutoId     = 1;         // simple incremental id

/* ---------- PER-PITCH STORAGE  ---------- */
/* All pitches for every batter live here.  */
let pitchData = [];
/* Each entry:
{
  pitchId, pitchType, location, result, outcome,
  prePitchCount:{balls,strikes},
  postPitchCount:{balls,strikes},
  pitchNumber, atBatNumber,
  batterId,              //  <— NEW
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

/* === BATTER UI handlers === */
document.getElementById('addBatterBtn').addEventListener('click', () => {
  const name = document.getElementById('newBatterName').value.trim();
  const hand = document.getElementById('newBatterHand').value;
  if (!name) { alert('Enter a name'); return; }
  addBatter(name, hand);
  document.getElementById('newBatterName').value = '';
});

document.getElementById('batterSelect').addEventListener('change', e => {
  const v = e.target.value;
  currentBatterId = v === '' ? null : Number(v);   // null = show all
  updateLiveStats();
  updateHeatMap();
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
  currentPitcherId = v === '' ? null : Number(v);   // null = no filter
});

function toggleMode() {
  if (mode === "bullpen") {
    document.getElementById('bullpenMode').style.display = 'block';
    document.getElementById('liveBPMode').style.display = 'none';
    document.getElementById('putawayButtons').style.display = 'none';
    document.getElementById('pointsContainer').style.display = 'none';
    document.getElementById('intendedZoneMode').style.display = 'none';
  } else if (mode === "liveBP") {
    document.getElementById('bullpenMode').style.display = 'none';
    document.getElementById('liveBPMode').style.display = 'block';
    document.getElementById('modeTitle').innerText = 'Live BP Mode';
    document.getElementById('pointsContainer').style.display = 'none';
    document.getElementById('intendedZoneMode').style.display = 'none';
    showPitchTypeSelection();   // make the 4S / 2S / CT… buttons appear
    updateLiveStats();          // draw the new tables immediately
  } else if (mode === "putaway") {
    document.getElementById('bullpenMode').style.display = 'block';
    document.getElementById('liveBPMode').style.display = 'none';
    document.getElementById('putawayButtons').style.display = 'none';
    document.getElementById('pointsContainer').style.display = 'none';
    document.getElementById('intendedZoneMode').style.display = 'none';
  } else if (mode === "points") {
    document.getElementById('bullpenMode').style.display = 'none';
    document.getElementById('liveBPMode').style.display = 'block';
    document.getElementById('modeTitle').innerText = 'Points Mode';
    document.getElementById('pointsContainer').style.display = 'block';
    document.getElementById('intendedZoneMode').style.display = 'none';
    showComboPitchTypeSelection();
  } else if (mode === "intendedZone") {
    // Hide the other modes
    document.getElementById('bullpenMode').style.display = 'none';
    document.getElementById('liveBPMode').style.display = 'none';

    // Show the intendedZoneMode container
    document.getElementById('intendedZoneMode').style.display = 'block';

    document.querySelectorAll("#intendedZoneSelection .intendedZoneBtn")
  .forEach(btn => {
    let zone = parseInt(btn.id.replace("intendedZone-", ""));
    if (strikeLocations.includes(zone)) {
      btn.classList.add("strikeZone");
    } else if (shadowLocations.includes(zone)) {
      btn.classList.add("shadowZone");
    } else if (nonCompetitiveLocations.includes(zone)) {
      btn.classList.add("nonCompetitiveZone");
    }
  });

    // **Important**: show the pitch type selection right away
    document.getElementById('intendedZonePitchTypeSelection').style.display = 'block';
    // And hide the other steps
    document.getElementById('intendedZoneSelection').style.display = 'none';
    document.getElementById('actualZoneSelection').style.display = 'none';

    // If you have a #modeTitle outside of #intendedZoneMode, either remove or ignore it here
    document.getElementById('intendedZoneTitle').innerText = 'Intended Zone';
  }
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

  if (mode === "putaway" && ballCount === 2) {
    logCount(strikeCount, ballCount, false); // Use ballCount here
    resetCount();
  }

  if (mode === "bullpen" && ballCount === 2) {
    logCount(strikeCount, ballCount, false); // Use ballCount here
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


document.getElementById('comboSelectionDoneBtn').addEventListener('click', function() {
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
  // We can use simple Euclidean or Manhattan distance. Let’s pick Euclidean:
  let rowDiff = rA - rB;
  let colDiff = cA - cB;
  let dist = Math.sqrt(rowDiff*rowDiff + colDiff*colDiff);
  return dist;
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
  li.textContent = `#${pitchEntry.pitchNumber} – ${pitchEntry.pitchType.toUpperCase()}
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
  const fCount   = document.getElementById('filterCount').value;   // all | early | late
  const fPitch   = document.getElementById('filterPitch').value;   // all | pitchType
  const fBatter  = document.getElementById('filterBatter').value;  // all | LH | RH | id:<n>
  const fResult  = document.getElementById('filterResult').value;  // all | strike | …

  const locationCounts = Array(50).fill(0);

  pitchData.forEach(p => {
    if (fPitch !== 'all' && p.pitchType !== fPitch) return;

    // Batter filter
    if (fBatter !== 'all') {
      if (fBatter === 'LH' || fBatter === 'RH') {
        const hand = batters.find(b => b.id === p.batterId)?.hand;
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
    if (fResult !== 'all') {
      const m = {
        strike: ['whiff','calledStrike','foul','strike'],
        ball  : ['ball'],
        swing : ['whiff','foul','inPlay'],   // treat inPlay as swing
        inPlay: ['inPlay'],
        hbp   : ['hbp']
      };
      if (!m[fResult].includes(p.outcome)) return;
    }

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
    pitchTags: JSON.parse(JSON.stringify(pitchTags)),
    pitchData: pitchData.slice(),
    pitchId,
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
  pitchTags = state.pitchTags || {};
  pitchData = state.pitchData.slice();
  pitchId = state.pitchId;
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
}                             

/* --- updateBatterDropdown() --- */
function updateBatterDropdown () {
  const sel = document.getElementById('batterSelect');
  sel.innerHTML = '';

  /* ⇢ NEW: empty option shows every batter */
  const allOpt = document.createElement('option');
  allOpt.value = '';                   // empty string → “all”
  allOpt.textContent = '— All Batters —';
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
}

function updatePitcherDropdown () {
  const sel = document.getElementById('pitcherSelect');
  sel.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = ''; optAll.textContent = '— Select Pitcher —';
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

// —— unified Outcome Selection handler ——
document.querySelectorAll("#outcomeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    const outcome = this.id;
    actionLog.push(saveCurrentState());
    processOutcome(outcome);

    // if it wasn’t an In‑Play sub‑flow, go right back to pitch‑type
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
      if (strikeLocations.includes(pitchLocation)) { pointsToAdd += 10; scenarioEmojis += '🎯'; }

      if (previousCount.balls === 0 && previousCount.strikes === 0 && strikeCount === 1) {
        pointsToAdd += 10; scenarioEmojis += '🚀';
      }
      if (strikeCount === 2 && previousCount.strikes === 1 && pitchCount <= 3) {
        pointsToAdd += 10; scenarioEmojis += '🏁';
      }
      if (strikeCount >= 3 && previousCount.strikes === 2 &&
          (pitchCount - previousCount.pitchCount) === 1) {
        pointsToAdd += 10; scenarioEmojis += '⚡';
      }

      if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
        pointsToAdd *= 2; scenarioEmojis += '🔥'; displayComboNotification();
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
      if (strikeLocations.includes(pitchLocation)) { pointsToAdd += 10; scenarioEmojis += '🎯'; }
      if (previousCount.balls === 0 && previousCount.strikes === 0 && strikeCount === 1) {
        pointsToAdd += 10; scenarioEmojis += '🚀';
      }
      if (strikeCount === 2 && previousCount.strikes === 1 && pitchCount <= 3) {
        pointsToAdd += 10; scenarioEmojis += '🏁';
      }
      if (strikeCount >= 3 && previousCount.strikes === 2 &&
          (pitchCount - previousCount.pitchCount) === 1) {
        pointsToAdd += 10; scenarioEmojis += '⚡';
      }
      if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
        pointsToAdd *= 2; scenarioEmojis += '🔥'; displayComboNotification();
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
}

/* ---------- LIVE STATS ---------- */
/*  helper – returns an empty counter object for swing, csw, …  */
function makeCounters () {
  const base = {}; ['swing','csw','ipo','iz','ooz','strike'].forEach(k=>base[k]=0);
  return { all:{...base}, early:{...base}, late:{...base} };
}

/* early = strikes < 2 | late = strikes == 2
   ─ The six “headline” numbers (and the early/late rows underneath)
     are ALWAYS calculated from *every* pitch in pitchData.
   ─ The two tables underneath still respect the dropdown filter. */

function updateLiveStats () {

  /* ----- choose the two datasets ----- */
  const filtered = pitchData.filter(p=>{
    if (currentBatterId && p.batterId !== currentBatterId) return false;
    return true;                                  // honours the dropdown
  });
  const allData = pitchData;                      // full log, no filter

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
    if (ipo)    { totals.all.ipo++;    totals[bucket].ipo++;   }
    if (inIZ)   { totals.all.iz++;     totals[bucket].iz++;    }
    if (inOOZ)  { totals.all.ooz++;    totals[bucket].ooz++;   }
    if (strike) { totals.all.strike++; totals[bucket].strike++;}
  });

  const pct = (n,d)=> d ? (n/d*100).toFixed(1) : '0.0';

  /* ----- write the headline numbers (ALWAYS global) ----- */
  document.getElementById('stat-swing' ).textContent = `Swing%:  ${pct(totals.all.swing , denoms.all)}`;
  document.getElementById('stat-csw'   ).textContent = `CSW%:    ${pct(totals.all.csw   , denoms.all)}`;
  document.getElementById('stat-ipo'   ).textContent = `IPO%:    ${pct(totals.all.ipo   , denoms.all)}`;
  document.getElementById('stat-iz'    ).textContent = `IZ%:     ${pct(totals.all.iz    , denoms.all)}`;
  document.getElementById('stat-ooz'   ).textContent = `OOZ%:    ${pct(totals.all.ooz   , denoms.all)}`;
  document.getElementById('stat-strike').textContent = `Strike%: ${pct(totals.all.strike, denoms.all)}`;

  document.getElementById('stat-early-csw'  ).textContent =
    `CSW% ${pct(totals.early.csw , denoms.early)}`;
  document.getElementById('stat-early-strike').textContent =
    `Strike% ${pct(totals.early.strike , denoms.early)}`;

  document.getElementById('stat-late-csw'   ).textContent =
    `CSW% ${pct(totals.late.csw  , denoms.late)}`;
  document.getElementById('stat-late-strike').textContent =
    `Strike% ${pct(totals.late.strike, denoms.late)}`;

  /* ----- tables: still respond to the dropdown filter ----- */
  const aggFiltered = buildAggregators(filtered); // filtered set
  const aggAll      = buildAggregators(allData);  // reference row

  renderLiveTables(aggFiltered, aggAll);
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

/* ▬▬▬ paint the two new live-stats tables ▬▬▬ */
function renderLiveTables(aggFiltered, aggAll){
  /* ---------- per-pitch-type ---------- */
  const tpBody = document.querySelector('#tbl-pitchType tbody');
  tpBody.innerHTML = '';
  [...aggFiltered.byPitch.entries()].forEach(([pt, s])=>{
    const row = tpBody.insertRow();
  [ pt.toUpperCase(),
    s.izPct, s.oozPct, s.cswPct, s.strikePct, s.swingPct,
    s.flyPct, s.gbPct, s.ldPct ].forEach(v=>{
      const cell = row.insertCell();
      cell.textContent = v.toFixed ? v.toFixed(1)+'%' : v;
      if (typeof v==='number'){
        cell.style.setProperty('--w', v/100);
        cell.dataset.pct = v;
      }
    });
  });

  /* ---------- per-batter (respect current filter) ---------- */
  const btBody = document.querySelector('#tbl-batter tbody');
  btBody.innerHTML = '';
  [...aggFiltered.byBatter.entries()].forEach(([id, s])=>{
    const name = id==='ALL' ? '— All —'
               : (batters.find(b=>b.id===id)?.name || 'B'+id);
    const row = btBody.insertRow();
    [
      name,
      s.earlySwingPct, s.lateSwingPct, s.chasePct,
      s.cswPct, s.strikePct
    ].forEach(v=>{
      const cell = row.insertCell();
      cell.textContent = v.toFixed ? v.toFixed(1)+'%' : v;
      if (typeof v==='number'){
        cell.style.setProperty('--w', v/100);
        cell.dataset.pct = v;
      }
    });
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
    const inPlayResult = this.id; 
    // capture previous count
    const prev = { balls: ballCount, strikes: strikeCount };
  
    // record the pitch
    pitchCount++;
    if (mode==="liveBP"||mode==="points") totalPitches++; 
    else totalPitchesBullpen++;
  
    // log it as an at-bat finisher:
    logPitchResult(pitchType, "In Play – " + inPlayResult, pitchLocation, '', prev, 'inPlay');
  
    // *** NEW: record the at-bat summary ***
    logAtBatResult("In Play – " + inPlayResult);
  
    // *** NEW: advance to next batter right away ***
    advanceToNextBatter();
  
    // and reset for the next pitch sequence
    isNewAtBat = true;
    resetForNextPitch();
    updateLiveStats();
    updateUI();
  });

function logPitchResult(pitchType, result, location, scenarioEmojis = '', previousCount = null, outcome = '') {
  let pitchLog = document.getElementById('pitchLog');
  let newEntry = document.createElement('li');
  let currentCountText = `${ballCount}-${strikeCount}`;

  let pitchTypeText = pitchType ? pitchType.toUpperCase() : 'UNKNOWN';
  let locationText = (location !== undefined && location !== null) ? location : 'UNKNOWN';

  newEntry.innerText = `${pitchTypeText}, Location: ${locationText}, Result: ${result}, Count: ${currentCountText} ${scenarioEmojis}`;
  newEntry.setAttribute('data-pitch-id', pitchId);
  pitchLog.appendChild(newEntry);


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
    outcome: outcome
  };

  pitchData.push(pitchEntry);
  pitchId++;
  addPitchTypeToFilter(pitchType);
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
  let pitchLogItems = document.querySelectorAll('#pitchLog li');
  pitchLogItems.forEach(item => {
    item.classList.add('selectable');
    item.addEventListener('click', togglePitchSelection);
  });
  // Show tagging options
  showTaggingOptions();
}

function addPitchTypeToFilter(pt) {
  const fpSel = document.getElementById('filterPitch');
  if (!fpSel) return;
  if ([...fpSel.options].some(o => o.value === pt)) return;

  const opt = document.createElement('option');
  opt.value = pt;
  opt.textContent = pt.toUpperCase();
  fpSel.appendChild(opt);
}

function exitTaggingMode() {
  isTaggingMode = false;
  document.getElementById('tagPitchBtn').innerText = 'Tag Pitch';
  // Remove selection from pitch log entries
  let pitchLogItems = document.querySelectorAll('#pitchLog li');
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

function applyTagToSelectedPitches() {
  let selectedFlagBtn = document.querySelector('#flagSelection .flagBtn.selected');
  if (!selectedFlagBtn) {
    alert('Please select a flag.');
    return;
  }
  let flagId = selectedFlagBtn.id; // e.g., 'flag-check-video'

  let flagInfo = {
    'flag-check-video': { emoji: '🟡', description: 'Check Video' },
    'flag-breakthrough': { emoji: '🟢', description: 'Breakthrough' },
    'flag-learning-moment': { emoji: '🔴', description: 'Learning Moment' },
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
      flagSpan.innerText = flagData.emoji;
      flagSpan.title = flagData.description + (note ? ': ' + note : '');
      pitchEntry.appendChild(flagSpan);
    } else {
      let flagSpan = pitchEntry.querySelector('.flagEmoji');
      flagSpan.innerText = flagData.emoji;
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
        flagSpan.innerText = tagData.emoji;
        flagSpan.title = tagData.description + (tagData.note ? ': ' + tagData.note : '');
        pitchEntry.appendChild(flagSpan);
      } else {
        let flagSpan = pitchEntry.querySelector('.flagEmoji');
        flagSpan.innerText = tagData.emoji;
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
  ['pitchLocationSelection','outcomeSelection','inPlaySelection']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  showPitchTypeSelection();        // always land on the palette
  if (resetCounts) resetCount();   // zero the count if caller asked
}


function updatePointsDisplay() {
  document.getElementById('pointsDisplay').innerText = `Points: ${points}`;
  const comboPitchTypesText = comboPitchTypes.length > 0 ? comboPitchTypes.join(', ') : 'None';
  document.getElementById('comboPitchTypesDisplay').innerText = `Combo Pitch Types: ${comboPitchTypesText}`;
}

function showPitchTypeSelection() {
  document.getElementById('comboPitchTypeSelection').style.display = 'none';
  document.getElementById('pitchTypeSelection').style.display = 'block';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
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

function updateUI() {
  let strikePercentageFromLog = calculateStrikePercentageFromLog();
  if (mode === "bullpen" || mode === "putaway") {
    strikePercentageFromLog = totalPitchesBullpen > 0 ? (totalStrikesBullpen / totalPitchesBullpen) * 100 : 0;
    document.getElementById('totalPitches').innerText = `Total Pitches: ${totalPitchesBullpen}`;
    let strikeDisplay = strikeCount === 2 ? `${strikeCount}🔥` : strikeCount;
    document.getElementById('currentCount').innerText = `Current Count: ${ballCount}-${strikeDisplay}`; // Use ballCount
    let raceWinsDisplay = mode === "putaway" ? '⚰️'.repeat(raceWins) : '🔥'.repeat(raceWins);
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;
    const strikePercentageElement = document.getElementById('strikePercentage');
    strikePercentageElement.innerText = `Strike %: ${strikePercentageFromLog.toFixed(2)}`;
    strikePercentageElement.style.color = getPercentageColor(strikePercentageFromLog);
  } else if (mode === "liveBP" || mode === "points") {
    document.getElementById('totalPitchesLiveBP').innerText = `Total Pitches: ${totalPitches}`;
    document.getElementById('currentCountLiveBP').innerText = `Current Count: ${ballCount}-${strikeCount}`; // Use ballCount
    let raceWinsDisplayLiveBP = '🔥'.repeat(raceWins);
    document.getElementById('raceWinsLiveBP').innerText = `Race Wins: ${raceWinsDisplayLiveBP}`;
    const strikePercentageElementLiveBP = document.getElementById('strikePercentageLiveBP');
    strikePercentageElementLiveBP.innerText = `Strike %: ${strikePercentageFromLog.toFixed(2)}`;
    strikePercentageElementLiveBP.style.color = getPercentageColor(strikePercentageFromLog);
  }

  const shouldDisplayUndo = actionLog.length > 0;
  document.getElementById('undoBtn').style.display = shouldDisplayUndo ? 'inline-block' : 'none';
}

function getPercentageColor(percentage) {
  const startColor = { r: 173, g: 216, b: 230 }; // Light blue
  const endColor = { r: 255, g: 0, b: 0 }; // Fire engine red
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percentage / 100));
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percentage / 100));
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percentage / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

function updateCurrentCount() {
  let currentCountDisplay = mode === "bullpen" || mode === "putaway" ? 'currentCount' : 'currentCountLiveBP';
  document.getElementById(currentCountDisplay).innerText = `Current Count: ${ballCount}-${strikeCount}`;
}

function resetCount() {
  ballCount = 0;
  strikeCount = 0;
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
  // → Only auto-complete the bullpen “2 balls, 0 strikes” case here.
  if (mode === "bullpen" && ballCount === 2 && strikeCount === 0) {
    logCount(strikeCount, ballCount, false);
    resetCount();
    if (actionLog.length) actionLog[actionLog.length - 1].completedCount = true;
  }
}

function updateRaceWins() {
  let raceWinsDisplay = raceWins > 0 ? (mode === "putaway" ? '⚰️' : '🔥').repeat(raceWins) : '';
  if (mode === "bullpen" || mode === "putaway") {
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;
  } else if (mode === "liveBP") {
    document.getElementById('raceWinsLiveBP').innerText = `Race Wins: ${raceWinsDisplay}`;
  }
}

function showHeatMap() {
  // Hide other selections
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('pitchLocationSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
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

function getHeatMapColor(count, maxCount) {
  if (maxCount === 0) {
    return '#FFFFFF'; // Return white if maxCount is zero
  }
  // Map count to a value between 0 and 1
  let ratio = count / maxCount;
  // Compute green and blue components (from white to red)
  let greenBlue = Math.round(255 - (246 * ratio)); // From 255 to 9
  let color = `rgb(255, ${greenBlue}, ${greenBlue})`; // From white to red
  return color;
}

function updateHeatmapBatterFilter () {
  const sel = document.getElementById('filterBatter');
  if (!sel) return;

  const prev = sel.value;           // try to preserve current selection
  sel.innerHTML = '';

  sel.appendChild(new Option('All', 'all'));
  sel.appendChild(new Option('LH only', 'LH'));
  sel.appendChild(new Option('RH only', 'RH'));

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
    fly:0, gb:0, ld:0,
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

  // Robust pre‑pitch strikes:
  // Prefer prePitchCount.strikes. If missing, infer from postPitchCount and outcome.
  let preStrikes;
  if (p.prePitchCount && typeof p.prePitchCount.strikes === 'number') {
    preStrikes = p.prePitchCount.strikes;
  } else if (p.postPitchCount && typeof p.postPitchCount.strikes === 'number') {
    // If the pitch produced a strike, post = pre+1 (except 2‑strike fouls keep post=2).
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

  if (p.result === 'In Play - flyball')    stats.fly++;
  if (p.result === 'In Play - groundball') stats.gb++;
  if (p.result === 'In Play - linedrive')  stats.ld++;
}

function pct (num, den) { return den ? (num/den*100) : 0; }

function buildAggregators (dataArr) {
  const byPitch  = new Map();   // pitchType → stats object
  const byBatter = new Map();   // batterId  → stats object
  const overall  = initStats();

  dataArr.forEach(p => {
    const pKey = p.pitchType || 'UNK';
    const bKey = p.batterId  ?? 'ALL';

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
  });

  // ↳ add ready-made percentages so the table renderer stays dumb
  const addPcts = s => Object.assign(s, {
    izPct         : pct(s.iz        , s.pitches),
    oozPct        : pct(s.ooz       , s.pitches),
    cswPct        : pct(s.csw       , s.pitches),
    strikePct     : pct(s.strike    , s.pitches),
    swingPct      : pct(s.swing     , s.pitches),
    flyPct        : pct(s.fly       , s.pitches),
    gbPct         : pct(s.gb        , s.pitches),
    ldPct         : pct(s.ld        , s.pitches),
    earlySwingPct : pct(s.earlySwing, s.earlyPitches),
    lateSwingPct  : pct(s.lateSwing , s.latePitches),
    chasePct      : pct(s.oozSwing , s.swing)   // correct – swings / swings
  });

  addPcts(overall);
  [...byPitch.values()].forEach(addPcts);
  [...byBatter.values()].forEach(addPcts);

  return { overall, byPitch, byBatter };
}

function logCount(strikes, balls, isK, isWalk = false) {
  let countLog = document.getElementById('countLog');
  let newEntry = document.createElement('li');
  newEntry.innerText = `Final Count: ${balls}-${strikes}`;
  if (isK) {
    newEntry.innerText += ' ⚰️';
  } else if (isWalk) {
    newEntry.innerText += ' 🏃‍♂️'; // Emoji representing a walk
  }
  countLog.appendChild(newEntry);
}

document.getElementById('exportBtn').addEventListener('click', function() {
  exportLiveBPStats();
});

// NEW: export at‑bat summaries
document.getElementById('exportAtBatBtn').addEventListener('click', function() {
  exportAtBatSummary();
});

document.getElementById('heatMapBtn').addEventListener('click', function() {
  isHeatMapMode = !isHeatMapMode; // Toggle heatmap mode
  if (isHeatMapMode) {
    showHeatMap();
    this.innerText = 'BACK';
  } else {
    hideHeatMap();
    this.innerText = 'HEAT MAP';
  }
});

['filterCount','filterPitch','filterBatter','filterResult']
  .forEach(id => document.getElementById(id)?.addEventListener('change', updateHeatMap));

/**
 * Append a summary of the current at‑bat to the atBatLog and record it
 * in the atBats array.  The pitch count is computed by counting
 * pitchData entries with the same atBatNumber.
 * @param {string} result – The final result of the at‑bat
 *   (e.g. "Strikeout", "Walk", "HBP", "In Play – groundball")
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

  const atBatLogEl = document.getElementById('atBatLog');
  if (atBatLogEl) {
    const li = document.createElement('li');
    const batter = batters.find(b => b.id === summary.batterId);
    const name  = batter ? batter.name : 'Unknown';
    const hand  = batter ? batter.hand : '';
    li.innerText =
      `#${summary.atBatNumber} – ${name}${hand ? ' (' + hand + ')' : ''} – ` +
      `${summary.result} (${summary.pitchCount} pitches)`;
    atBatLogEl.appendChild(li);
  }
}

/**
 * Export at‑bat summaries to the clipboard as comma‑separated values.
 * The first line contains a header row for easy pasting into spreadsheets.
 */
function exportAtBatSummary() {
  if (atBats.length === 0) {
    alert('No at‑bat data to export!');
    return;
  }
  const lines = [];
  lines.push('AtBatNumber,BatterName,BatterHand,Result,Pitches');
  atBats.forEach(ab => {
    const batter = batters.find(b => b.id === ab.batterId);
    const name   = batter ? batter.name : '';
    const hand   = batter ? batter.hand : '';
    lines.push(`${ab.atBatNumber},${name},${hand},${ab.result},${ab.pitchCount}`);
  });
  const exportText = lines.join('\n');
  navigator.clipboard.writeText(exportText)
    .then(() => {
      alert('At‑bat summary copied to clipboard!');
    })
    .catch(() => {
      alert('Failed to copy summary to clipboard.');
    });
}

function exportLiveBPStats() {
  let totalPitches = pitchData.length;
  let totalBattersFaced = atBatNumber - 1; // Since atBatNumber increments after each completed at-bat
  let totalRaceWins = raceWins;
  let totalStrikes = 0;
  let totalStrikeouts = 0;
  let totalWalks = 0;
  let nonCompetitiveCount = 0;
  let shadowCount = 0;
  let strikeZoneCount = 0;
  let totalSwings = 0;

  let pitchTypeStats = {};

  pitchData.forEach(pitch => {
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

  Object.entries(pitchTypeStats).forEach(([pitchType, stats]) => {
    let usagePercentage = (stats.total / totalPitches) * 100;
    let strikePercentage = (stats.strikes / stats.total) * 100;
    let swingsPercentage = (stats.swings / stats.total) * 100;
    let nonCompetitivePercentage = (stats.nonCompetitive / stats.total) * 100;
    let shadowPercentage = (stats.shadow / stats.total) * 100;
    let strikeZonePercentage = (stats.strikeZone / stats.total) * 100;

    statsText += `\nPitch Type: ${pitchType}\n`;
    statsText += `Usage %: ${usagePercentage.toFixed(2)}%\n`;
    statsText += `Strike %: ${strikePercentage.toFixed(2)}%\n`;
    statsText += `Swings %: ${swingsPercentage.toFixed(2)}%\n`;
    statsText += `% Non-Competitive Pitches: ${nonCompetitivePercentage.toFixed(2)}%\n`;
    statsText += `% Shadow Pitches: ${shadowPercentage.toFixed(2)}%\n`;
    statsText += `% Strike Zone Pitches: ${strikeZonePercentage.toFixed(2)}%\n`;
  });

  // Add tagged pitches information
  statsText += `\nTagged Pitches:\n`;

  pitchData.forEach(pitch => {
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

document.addEventListener('DOMContentLoaded', function() {
  toggleMode();
  document.getElementById('pitchLocationSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('pitchTypeSelection').style.display = 'block';
  document.getElementById('heatmapGrid').style.display = 'none';
  document.getElementById('taggingOptions').style.display = 'none';
  updateHeatmapBatterFilter();
});


