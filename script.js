let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;
let totalPitchesBullpen = 0; // Tracks total pitches in Bullpen Mode
let totalPitches = 0; // Tracks total pitches in Live BP Mode
let mode = "bullpen";
let pitchType = "";
let lastAction = null;
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
    pitchCount = lastAction.prePitchCount.strikes + lastAction.prePitchCount.balls;

    if (mode === "bullpen") {
      totalPitchesBullpen--;
    } else {
      totalPitches--;
    }

    if (lastAction.wasRaceWin) {
      raceWins = Math.max(0, raceWins - 1);
    }

    if (lastAction.completedCount) {
      removeLastCompletedCount();
    }

    updateUI();
    updateCurrentCount();
  }
});

// Live BP mode: Pitch Type Selection
document.querySelectorAll("#pitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pitchType = this.id; // Store the selected pitch type
    showOutcomeSelection(); // Proceed to outcome selection
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
    if (mode === "liveBP") { // Ensure we're in LIVE BP MODE
      totalPitches++; // Increment total pitches for Live BP Mode
      console.log("Total Pitches (Live BP Mode):", totalPitches); // Debugging: Log total pitches count
      updateUI(); // Update the UI immediately
    }
    processOutcome(outcome); // Process the outcome
  });
});


// Process the selected outcome
function processOutcome(outcome) {
  if (outcome === "ball") {
    pitchCount++;
    if (pitchCount - strikeCount >= 4) { // Check if there are 4 balls
      resetCount();
    }
  } else if (["whiff", "calledStrike"].includes(outcome)) {
    strikeCount++;
    pitchCount++;
    if (strikeCount >= 3) { // Check if there are 3 strikes
      resetCount();
    }
  } else if (outcome === "foul") {
    if (strikeCount < 2) { // Only increase strike count if less than 2
      strikeCount++;
      pitchCount++; // Increment pitch count only if strike count is increased
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

    // Check for 2-strike counts and append a fire emoji
    let strikeDisplay = strikeCount === 2 ? `${strikeCount}🔥` : strikeCount;
    document.getElementById('currentCount').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeDisplay}`;

    // Display race wins as fire emojis
    let raceWinsDisplay = '🔥'.repeat(raceWins); // Repeat the fire emoji based on the number of race wins
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`; // Make sure you have an element with the id 'raceWins'
  } else if (mode === "liveBP") {
    document.getElementById('totalPitchesLiveBP').innerText = `Total Pitches: ${totalPitches}`;
    document.getElementById('currentCountLiveBP').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
  }
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
  // Display race wins as fire emojis
  let raceWinsDisplay = '🔥'.repeat(raceWins); // Repeat the fire emoji based on the number of race wins
  document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;
}


function logCount(strikes, balls) {
  let countLog = document.getElementById('countLog');
  let newEntry = document.createElement('li');
  newEntry.innerText = `Final Count: ${balls}-${strikes}`;
  countLog.appendChild(newEntry);
}


document.addEventListener('DOMContentLoaded', function() {
  toggleMode(); // Initialize the UI based on the default mode
});
