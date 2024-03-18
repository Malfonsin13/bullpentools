let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;
let totalPitchesBullpen = 0; // Tracks total pitches in Bullpen Mode
let totalPitches = 0; // Tracks total pitches in Live BP Mode
let mode = "bullpen";
let pitchType = "";
let lastAction = null;
let totalStrikesBullpen = 0;
let totalStrikesLiveBP = 0;
let lastRaceWin = false; // true if the last action credited a race win
let actionLog = [];

document.getElementById('bullpenModeBtn').addEventListener('click', function() {
  mode = "bullpen";
  toggleMode();
});

document.getElementById('liveBPModeBtn').addEventListener('click', function() {
  mode = "liveBP";
  toggleMode();
});

function toggleMode() {
  if (mode === "bullpen") {
    document.getElementById('bullpenMode').style.display = 'block';
    document.getElementById('liveBPMode').style.display = 'none';
  } else if (mode === "liveBP") {
    document.getElementById('bullpenMode').style.display = 'none';
    document.getElementById('liveBPMode').style.display = 'block';
  }
  resetCount(); // Reset counts when switching modes
}

document.getElementById('strikeBtn').addEventListener('click', function() {

  actionLog.push({
    type: 'strike',
    completedCount: false,
    wasRaceWin: false,
    prePitchCount: { strikes: strikeCount, balls: pitchCount - strikeCount }
  });
  strikeCount++;
  pitchCount++;
  totalStrikesBullpen++;
  if (mode === "bullpen") {
    totalPitchesBullpen++;
  } else {
    totalPitches++;
  }
  updateUI();
  updateCurrentCount();
  checkRaceCondition();
  lastAction = 'strike'; // Set lastAction to 'strike'
});

document.getElementById('ballBtn').addEventListener('click', function() {
  actionLog.push({
    type: 'ball',
    completedCount: false,
    wasRaceWin: false,
    prePitchCount: { strikes: strikeCount, balls: pitchCount - strikeCount }
  });

  pitchCount++;
  if (mode === "bullpen") {
    totalPitchesBullpen++;
  } else {
    totalPitches++;
  }
  updateUI();
  updateCurrentCount();
  checkRaceCondition();
  lastAction = 'ball'; // Set lastAction to 'ball'
});

document.getElementById('undoBtn').addEventListener('click', function() {
  if (actionLog.length > 0) {
    const lastAction = actionLog.pop();

    strikeCount = lastAction.prePitchCount.strikes;
    pitchCount = lastAction.prePitchCount.balls + lastAction.prePitchCount.strikes;

    if (mode === "bullpen") {
      totalPitchesBullpen--;
      if (lastAction.wasRaceWin) {
        raceWins = Math.max(0, raceWins - 1);
      }
      if (lastAction.type === 'strike') {
        totalStrikesBullpen--;
      }
      if (lastAction.completedCount) {
        removeLastCompletedCount();
      }
    } else if (mode === "liveBP") {
      totalPitches--;
      if (lastAction.wasRaceWin) {
        raceWins = Math.max(0, raceWins - 1);
        updateRaceWins();
      }
      if (["whiff", "calledStrike"].includes(lastAction.outcome) || (lastAction.outcome === "foul" && lastAction.prePitchCount.strikes < 2)) {
        totalStrikesLiveBP--;
      }
      if (totalPitches === 0) { // Reset everything if all actions have been undone
        strikeCount = 0;
        pitchCount = 0;
        totalStrikesLiveBP = 0; // Ensure totalStrikesLiveBP is also reset
      }
      removeLastPitchLogEntry();
    }

    updateUI();
    updateCurrentCount();
  }
});


// Live BP mode: Pitch Type Selection
document.querySelectorAll("#pitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pitchType = this.id;
    actionLog.push({
      type: 'pitchTypeSelection',
      pitchType: pitchType,
      prePitchCount: { strikes: strikeCount, balls: pitchCount - strikeCount },
      totalPitchesBefore: totalPitches // Store the total pitches count before this action
    });
    showOutcomeSelection();
  });
});

// Show the Outcome Selection module
function showOutcomeSelection() {
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'block';
}

// Live BP mode: Outcome Selection
document.querySelectorAll("#outcomeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    let outcome = this.id; // Store the selected outcome
    actionLog.push({
      type: 'outcomeSelection',
      outcome: outcome,
      prePitchCount: { strikes: strikeCount, balls: pitchCount - strikeCount },
      totalPitchesBefore: totalPitches // Store the total pitches count before this action
    });
    if (mode === "liveBP") { // Ensure we're in LIVE BP MODE
      totalPitches++; // Increment total pitches for Live BP Mode
      updateUI(); // Update the UI immediately
    }
    processOutcome(outcome); // Process the outcome
  });
});


function processOutcome(outcome) {
  if (outcome === "ball") {
    pitchCount++;
    if (pitchCount - strikeCount >= 4) {
      resetCount();
    }
  } else if (["whiff", "calledStrike", "foul"].includes(outcome)) { // Include "foul" in the conditions
    let wasStrike = (outcome === "foul" && strikeCount < 2) || outcome !== "foul";
    if (wasStrike) {
      strikeCount++;
      pitchCount++;
      totalStrikesLiveBP++;
      // Check for race win condition when strikeCount reaches 2
      if (strikeCount === 2 && (pitchCount - strikeCount === 0 || pitchCount - strikeCount === 1)) {
        raceWins++;
        updateRaceWins();
        actionLog[actionLog.length - 1].wasRaceWin = true;
      }
      if (strikeCount >= 3) { // Reset count if it's a strikeout
        resetCount();
      }
    }
  } else if (outcome === "inPlay") {
    resetCount(); // Reset for "In Play" outcome
    showInPlaySelection();
  } else if (outcome === "hbp") {
    // Log the HBP outcome before resetting for the next pitch
    logPitchResult(pitchType, "HBP"); // Log the pitch with "HBP" outcome
    resetCount(); // Reset count for "HBP" outcome
    resetForNextPitch(); // Reset for the next pitch and show the pitch type selection screen
  }

  if (!["inPlay", "hbp"].includes(outcome)) { // If not "In Play" or "HBP", log the pitch and prepare for the next one
    logPitchResult(pitchType, outcome);
    resetForNextPitch(false);
  }

  updateUI(); // Ensure the UI is updated with the latest counts and information
}


// Show the In Play Outcome Selection module
function showInPlaySelection() {
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'block';
}

// In Play Outcome Selection
document.querySelectorAll("#inPlaySelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    let inPlayResult = this.id; // Store the in-play result
    logPitchResult(pitchType, "In Play - " + inPlayResult); // Log the in-play result
    resetForNextPitch(); // Reset for the next pitch
  });
});

// Log the pitch result
function logPitchResult(pitchType, result) {
  let pitchLog = document.getElementById('pitchLog');
  let newEntry = document.createElement('li');
  // Capture the current count before resetting
  let currentCountText = `${pitchCount - strikeCount}-${strikeCount}`;
  newEntry.innerText = `${pitchType.toUpperCase()}, Result: ${result}, Count: ${currentCountText}`;
  pitchLog.appendChild(newEntry);
  updateCurrentCount();
  updateUI(); // Update the UI with the new total pitch count and current count
}

// Reset UI for the next pitch in Live BP mode
function resetForNextPitch(resetCounts = true) {
  pitchType = "";
  showPitchTypeSelection();
  if (resetCounts) {
    resetCount(); // This will also update the UI
  }
}
// Show the Pitch Type Selection module, hide others
function showPitchTypeSelection() {
  document.getElementById('pitchTypeSelection').style.display = 'block';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
}

function removeLastCompletedCount() {
  const countLog = document.getElementById('countLog');
  if (countLog.lastChild) {
    countLog.removeChild(countLog.lastChild);
  }
}

function updateUI() {
  if (mode === "bullpen") {
    document.getElementById('totalPitches').innerText = `Total Pitches: ${totalPitchesBullpen}`;
    let strikeDisplay = strikeCount === 2 ? `${strikeCount}🔥` : strikeCount;
    document.getElementById('currentCount').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeDisplay}`;
    let raceWinsDisplay = '🔥'.repeat(raceWins);
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;

    // Calculate strike percentage using total strikes and total pitches for the session
    let strikePercentage = totalPitchesBullpen > 0 ? (totalStrikesBullpen / totalPitchesBullpen) * 100 : 0;
    const strikePercentageElement = document.getElementById('strikePercentage');
    strikePercentageElement.innerText = `Strike %: ${strikePercentage.toFixed(2)}`;

    // Change the color based on the strike percentage
    strikePercentageElement.style.color = getPercentageColor(strikePercentage);
  } else if (mode === "liveBP") {
    document.getElementById('totalPitchesLiveBP').innerText = `Total Pitches: ${totalPitches}`;
    document.getElementById('currentCountLiveBP').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;

    let strikePercentageLiveBP = totalPitches > 0 ? Math.min((totalStrikesLiveBP / totalPitches) * 100, 100) : 0;
    document.getElementById('strikePercentageLiveBP').innerText = `Strike %: ${strikePercentageLiveBP.toFixed(2)}`;
    // Apply dynamic coloring based on strike percentage
    document.getElementById('strikePercentageLiveBP').style.color = getPercentageColor(strikePercentageLiveBP);
  }
  // Control the visibility of the Undo button based on the actionLog length and total pitches
  const shouldDisplayUndo = (mode === "bullpen" && totalPitchesBullpen > 0) || (mode === "liveBP" && totalPitches > 0);
  document.getElementById('undoBtn').style.display = shouldDisplayUndo ? 'inline-block' : 'none';
}

function getPercentageColor(percentage) {
  // Define start (light blue) and end (fire engine red) colors in RGB
  const startColor = { r: 173, g: 216, b: 230 }; // Light blue
  const endColor = { r: 255, g: 0, b: 0 }; // Fire engine red

  // Calculate the RGB values for the current percentage
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percentage / 100));
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percentage / 100));
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percentage / 100));

  // Return the color in CSS format
  return `rgb(${r}, ${g}, ${b})`;
}


function updateCurrentCount() {
  let currentCountDisplay = mode === "bullpen" ? 'currentCount' : 'currentCountLiveBP';
  document.getElementById(currentCountDisplay).innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
}

function resetCount() {
  pitchCount = 0;
  strikeCount = 0;
  updateUI();
}

function checkRaceCondition() {
  let completedCount = false;

  if (strikeCount == 2) {
    raceWins++;
    completedCount = true;
    // Ensure this is the action that caused the race win
    if (actionLog.length > 0 && actionLog[actionLog.length - 1].type === 'strike') {
      actionLog[actionLog.length - 1].wasRaceWin = true;
    }
    logCount(strikeCount, pitchCount - strikeCount);
    resetCount();
    updateRaceWins(); // Make sure to call updateRaceWins here to immediately reflect the change
  } else if (pitchCount - strikeCount == 2 && strikeCount == 0) {
    completedCount = true;
    logCount(strikeCount, pitchCount - strikeCount);
    resetCount();
  } else if (pitchCount >= 3) {
    completedCount = true;
    logCount(strikeCount, pitchCount - strikeCount);
    resetCount();
  }

  if (completedCount && actionLog.length > 0) {
    actionLog[actionLog.length - 1].completedCount = true;
  }
}

function updateRaceWins() {
  let raceWinsDisplay = raceWins > 0 ? '🔥'.repeat(raceWins) : ''; // Ensure there's a display even when raceWins is 0
  if (mode === "bullpen") {
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;
  } else if (mode === "liveBP") {
    // This now correctly targets the race wins display for LiveBP mode
    document.getElementById('raceWinsLiveBP').innerText = `Race Wins: ${raceWinsDisplay}`;
  }
}



function getPercentageColor(percentage) {
  // Define start (light blue) and end (fire engine red) colors in RGB
  const startColor = { r: 173, g: 216, b: 230 }; // Light blue
  const endColor = { r: 255, g: 0, b: 0 }; // Fire engine red

  // Calculate the RGB values for the current percentage
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percentage / 100));
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percentage / 100));
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percentage / 100));

  // Return the color in CSS format
  return `rgb(${r}, ${g}, ${b})`;
}

function logCount(strikes, balls) {
  let countLog = document.getElementById('countLog');
  let newEntry = document.createElement('li');
  newEntry.innerText = `Final Count: ${balls}-${strikes}`;
  countLog.appendChild(newEntry);
}

function removeLastPitchLogEntry() {
  // Assuming 'pitchLog' is the ID of your pitch log <ul> element in Live BP Mode
  const pitchLog = document.getElementById('pitchLog');
  if (pitchLog && pitchLog.lastChild) {
    pitchLog.removeChild(pitchLog.lastChild);
  }
}


document.addEventListener('DOMContentLoaded', function() {
  toggleMode(); // Initialize the UI based on the default mode
});
