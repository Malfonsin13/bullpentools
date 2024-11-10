let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;
let totalPitchesBullpen = 0;
let totalStrikesBullpen = 0;
let totalPitches = 0;
let mode = "bullpen";
let pitchType = "";
let totalStrikesLiveBP = 0;
let actionLog = [];
let foulsAfterTwoStrikes = 0;
let pitchLocation = 0;
let points = 0;
let comboPitchTypes = [];
let isHeatMapMode = false;
let pitchId = 0; 
let pitchTags = {}; 
let isTaggingMode = false; 
let ballCount = 0;

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

function toggleMode() {
  if (mode === "bullpen") {
    document.getElementById('bullpenMode').style.display = 'block';
    document.getElementById('liveBPMode').style.display = 'none';
    document.getElementById('putawayButtons').style.display = 'none';
    document.getElementById('pointsContainer').style.display = 'none';
  } else if (mode === "liveBP") {
    document.getElementById('bullpenMode').style.display = 'none';
    document.getElementById('liveBPMode').style.display = 'block';
    document.getElementById('modeTitle').innerText = 'Live BP Mode';
    document.getElementById('pointsContainer').style.display = 'none';
  } else if (mode === "putaway") {
    document.getElementById('bullpenMode').style.display = 'block';
    document.getElementById('liveBPMode').style.display = 'none';
    document.getElementById('putawayButtons').style.display = 'none';
    document.getElementById('pointsContainer').style.display = 'none';
  } else if (mode === "points") {
    document.getElementById('bullpenMode').style.display = 'none';
    document.getElementById('liveBPMode').style.display = 'block';
    document.getElementById('modeTitle').innerText = 'Points Mode';
    document.getElementById('pointsContainer').style.display = 'block';
    showComboPitchTypeSelection();
  }
  resetCount();
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
    restorePitchLog(previousState.pitchLog);
    restoreCompletedCountLog(previousState.completedCountLog);
    updateUI();
  }
});

document.getElementById('nextBatterBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState()); // Save the current state for undo functionality
  resetCount(); // Reset the current count to 0-0
  updateCurrentCount(); // Update the UI to reflect the new count
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

function saveCurrentState() {
  return {
    pitchCount,
    strikeCount,
    raceWins,
    totalPitchesBullpen,
    totalStrikesBullpen,
    totalPitches,
    totalStrikesLiveBP,
    foulsAfterTwoStrikes,
    mode,
    pitchTags: JSON.parse(JSON.stringify(pitchTags)),
    pitchLog: document.getElementById('pitchLog').innerHTML, // Save the pitch log state
    completedCountLog: document.getElementById('countLog').innerHTML // Save completed count log state
  };
}

function restoreState(state) {
  pitchCount = state.pitchCount;
  strikeCount = state.strikeCount;
  raceWins = state.raceWins;
  totalPitchesBullpen = state.totalPitchesBullpen;
  totalStrikesBullpen = state.totalStrikesBullpen;
  totalPitches = state.totalPitches;
  totalStrikesLiveBP = state.totalStrikesLiveBP;
  foulsAfterTwoStrikes = state.foulsAfterTwoStrikes;
  mode = state.mode;
  pitchTags = state.pitchTags || {};
  updatePitchLogTags();
}

function restorePitchLog(pitchLogHTML) {
  document.getElementById('pitchLog').innerHTML = pitchLogHTML;
}

function restoreCompletedCountLog(completedCountLogHTML) {
  document.getElementById('countLog').innerHTML = completedCountLogHTML;
}



// Calculate strike percentage based on the log
function calculateStrikePercentageFromLog() {
  const pitchLog = document.querySelectorAll('#pitchLog li');
  let strikes = 0;
  let totalPitches = pitchLog.length;

  pitchLog.forEach(entry => {
    if (/whiff|calledStrike|foul/i.test(entry.innerText)) {
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

document.querySelectorAll("#outcomeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    let outcome = this.id;  // Capture outcome selection
    actionLog.push(saveCurrentState());
    processOutcome(outcome);  // Use the function that updates counts and UI
  });
});


function processOutcome(outcome) {
  // Capture the count before processing the outcome
  let previousCount = {
    balls: ballCount,
    strikes: strikeCount,
    pitchCount: pitchCount // Total pitches thrown before this pitch
  };
  let scenarioEmojis = '';

  // Always increment total pitches
  pitchCount++;

  if (outcome === "ball") {
    ballCount++; // Increment ball count

    if (mode === "liveBP" || mode === "points") {
      totalPitches++;
    } else if (mode === "bullpen" || mode === "putaway") {
      totalPitchesBullpen++;
    }

    // Points Mode logic for 'ball' outcome
    if (mode === "points") {
      let pointsToDeduct = 0;


      // Scenario 2: Balls in specific locations
      if (ballLocations.includes(pitchLocation)) {
        pointsToDeduct += 10;
        scenarioEmojis += '💀';
      }

      // Scenario 5: Losing the race (getting to 2 balls before 2 strikes within first 3 pitches)
      if (
        previousCount.balls === 1 &&
        ballCount === 2 &&
        strikeCount < 2 &&
        pitchCount <= 3
      ) {
        pointsToDeduct += 20;
        scenarioEmojis += '💀';
      }

      // Scenario 7: Walk (getting to 4 balls)
      if (ballCount >= 4) {
        pointsToDeduct += 30;
        scenarioEmojis += '💀';
        // In Points Mode, we reset the count after handling points deduction
      }

      // Update points
      points -= pointsToDeduct;

      if (pointsToDeduct > 0) {
        displayPointsDeduction(pointsToDeduct);
      }

      updatePointsDisplay();

      // Reset count if walk occurs
      if (ballCount >= 4) {
        logCount(strikeCount, ballCount, false, true); // Indicate it's a walk
        resetCount();
      }
    } else {
      // Handle walks in other modes
      if (ballCount >= 4) {
        // Log the count as a walk
        logCount(strikeCount, ballCount, false, true); // Indicate it's a walk
        resetCount();
      }

      // Handle resets for bullpen mode at 2 balls
      if (mode === "bullpen" && ballCount === 2) {
        logCount(strikeCount, ballCount, false);
        resetCount();
      }
    }

  } else if (["whiff", "calledStrike", "foul"].includes(outcome)) {
    // Handle strikes and fouls
    if (outcome === "foul") {
      if (strikeCount < 2) {
        strikeCount++; // Increment strike count if less than 2 strikes
      } else {
        // Foul ball with two strikes: counts towards total pitches but doesn't change counts
        foulsAfterTwoStrikes++;
        // Do not change strikeCount or ballCount
      }
    } else {
      // "whiff" or "calledStrike"
      strikeCount++; // Increment strike count
    }

    if (mode === "liveBP" || mode === "points") {
      totalStrikesLiveBP++;
      totalPitches++;
    } else if (mode === "bullpen" || mode === "putaway") {
      totalStrikesBullpen++;
      totalPitchesBullpen++;
    }

    // Points Mode logic for 'strike' outcome
    if (mode === "points") {
      let pointsToAdd = 0;

      // Scenario 1: Strikes in specific locations
      if (strikeLocations.includes(pitchLocation)) {
        pointsToAdd += 10;
        scenarioEmojis += '🎯';
      }

      // Scenario 3: Getting ahead (0-0 to 0-1)
      if (
        previousCount.balls === 0 &&
        previousCount.strikes === 0 &&
        strikeCount === 1
      ) {
        pointsToAdd += 10;
        scenarioEmojis += '🚀';
      }

      // Scenario 4: Winning the race to two strikes within first 3 pitches
      if (
        strikeCount === 2 &&
        previousCount.strikes === 1 &&
        pitchCount <= 3
      ) {
        pointsToAdd += 10;
        scenarioEmojis += '🏁';
      }

      // Scenario 6: Putaway (getting a strikeout with a strike immediately after getting to 2 strikes)
      if (
        strikeCount >= 3 &&
        previousCount.strikes === 2 &&
        pitchCount - previousCount.pitchCount === 1
      ) {
        pointsToAdd += 10;
        scenarioEmojis += '⚡';
      }

      // Double points if last pitch type is in comboPitchTypes
      if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
        pointsToAdd *= 2;
        scenarioEmojis += '🔥';
        displayComboNotification();
      }

      // Update points
      points += pointsToAdd;

      updatePointsDisplay();
    }

    // Handle race wins and putaway options
    let wasStrike = outcome !== "foul" || (outcome === "foul" && strikeCount < 2);

    if (wasStrike) {
      if (mode === "putaway" && strikeCount === 2) {
        showPutawayOptions();
      } else if (
        mode !== "putaway" &&
        strikeCount === 2 &&
        pitchCount <= 3
      ) {
        raceWins++;
        updateRaceWins();
      }
      if (strikeCount >= 3) {
        // Log strikeout
        logCount(strikeCount, ballCount, true);
        resetCount();
      }
    }

  } else if (outcome === "strike") {
    // For Points Mode where 'strike' is an outcome
    strikeCount++;
    if (mode === "liveBP" || mode === "points") {
      totalStrikesLiveBP++;
      totalPitches++;
    } else if (mode === "bullpen" || mode === "putaway") {
      totalStrikesBullpen++;
      totalPitchesBullpen++;
    }

    // Points Mode logic for 'strike' outcome
    if (mode === "points") {
      let pointsToAdd = 0;

      // Scenario 1: Strikes in specific locations
      if (strikeLocations.includes(pitchLocation)) {
        pointsToAdd += 10;
        scenarioEmojis += '🎯';
      }

      // Scenario 3: Getting ahead (0-0 to 0-1)
      if (
        previousCount.balls === 0 &&
        previousCount.strikes === 0 &&
        strikeCount === 1
      ) {
        pointsToAdd += 10;
        scenarioEmojis += '🚀';
      }

      // Scenario 4: Winning the race to two strikes within first 3 pitches
      if (
        strikeCount === 2 &&
        previousCount.strikes === 1 &&
        pitchCount <= 3
      ) {
        pointsToAdd += 10;
        scenarioEmojis += '🏁';
      }

      // Scenario 6: Putaway
      if (
        strikeCount >= 3 &&
        previousCount.strikes === 2 &&
        pitchCount - previousCount.pitchCount === 1
      ) {
        pointsToAdd += 10;
        scenarioEmojis += '⚡';
      }

      // Double points for combo pitch types
      if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
        pointsToAdd *= 2;
        scenarioEmojis += '🔥';
        displayComboNotification();
      }

      // Update points
      points += pointsToAdd;

      updatePointsDisplay();
    }

    // Handle race wins and putaway options
    if (mode === "putaway" && strikeCount === 2) {
      showPutawayOptions();
    } else if (
      mode !== "putaway" &&
      strikeCount === 2 &&
      pitchCount <= 3
    ) {
      raceWins++;
      updateRaceWins();
    }
    if (strikeCount >= 3) {
      // Log strikeout
      logCount(strikeCount, ballCount, true);
      resetCount();
    }

  } else if (outcome === "inPlay") {
    // Handle 'In Play' outcome
    resetCount();
    showInPlaySelection();

  } else if (outcome === "hbp") {
    // Handle 'Hit By Pitch' outcome
    logPitchResult(pitchType, "HBP", pitchLocation);
    resetCount();
    resetForNextPitch();
  }

  // Log the pitch result and reset for next pitch if necessary
  if (!["inPlay", "hbp"].includes(outcome)) {
    logPitchResult(pitchType, outcome, pitchLocation, scenarioEmojis);
    resetForNextPitch(false);
  }

  // Update the UI
  updateUI();
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
    let inPlayResult = this.id;
    pitchCount++;
    if (mode === "liveBP" || mode === "points") {
      totalPitches++;
    } else if (mode === "bullpen" || mode === "putaway") {
      totalPitchesBullpen++;
    }

    logPitchResult(pitchType, "In Play - " + inPlayResult, pitchLocation, '');
    resetForNextPitch();
    updateUI();
  });
});

function logPitchResult(pitchType, result, location, scenarioEmojis = '') {
  let pitchLog = document.getElementById('pitchLog');
  let newEntry = document.createElement('li');
  let currentCountText = `${ballCount}-${strikeCount}`;

  let pitchTypeText = pitchType ? pitchType.toUpperCase() : 'UNKNOWN';
  let locationText = (location !== undefined && location !== null) ? location : 'UNKNOWN';

  newEntry.innerText = `${pitchTypeText}, Location: ${locationText}, Result: ${result}, Count: ${currentCountText} ${scenarioEmojis}`;
  newEntry.setAttribute('data-pitch-id', pitchId);
  pitchLog.appendChild(newEntry);
  pitchId++;
  updateCurrentCount();
  updateUI();
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

  // Exit tagging mode
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
  pitchType = "";  // Clear the pitch type
  document.getElementById('pitchLocationSelection').style.display = 'none'; // Hide pitch location selection
  document.getElementById('outcomeSelection').style.display = 'none';  // Hide outcome buttons
  document.getElementById('inPlaySelection').style.display = 'none';   // Hide in-play selection if visible
  document.getElementById('pitchTypeSelection').style.display = 'block';  // Show pitch type selection again
  if (resetCounts) {
    resetCount();
  }
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
  updateUI();
}


function checkRaceCondition() {
  let completedCount = false;
  if (strikeCount === 2 && mode !== "putaway") {
    raceWins++;
    completedCount = true;
    logCount(strikeCount, ballCount, false); // Use ballCount
    resetCount();
    updateRaceWins();
  } else if (ballCount === 2 && strikeCount === 0 && mode === "bullpen") {
    completedCount = true;
    logCount(strikeCount, ballCount, false); // Use ballCount
    resetCount();
  }
  if (completedCount) {
    actionLog[actionLog.length - 1].completedCount = true;
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
  // Hide the heatmap grid
  document.getElementById('heatmapGrid').style.display = 'none';

  // Show the appropriate UI elements based on the current mode
  if (mode === 'points') {
    document.getElementById('pitchTypeSelection').style.display = 'block';
    document.getElementById('pointsContainer').style.display = 'block';
    // Show other points mode elements if necessary
  } else {
    // For other modes, show the pitch type selection
    document.getElementById('pitchTypeSelection').style.display = 'block';
  }

  // Restore any other UI elements as needed
  document.getElementById('taggingOptions').style.display = 'none';
  document.getElementById('putawayButtons').style.display = 'none';
  document.getElementById('r2kButtons').style.display = 'block'; // Adjust as per your app logic
}

function updateHeatMap() {
  // Initialize counts for all 49 locations
  let locationCounts = {};
  for (let i = 1; i <= 49; i++) {
    locationCounts[i] = 0;
  }

  // Get pitch log entries
  let pitchLogItems = document.querySelectorAll('#pitchLog li');
  pitchLogItems.forEach(item => {
    // Extract location from item.innerText
    // Format: 'PITCHTYPE, Location: LOCATION, Result: RESULT, Count: COUNT'
    let text = item.innerText;
    let match = text.match(/Location:\s*(\d+)/);
    if (match) {
      let loc = parseInt(match[1]);
      if (locationCounts.hasOwnProperty(loc)) {
        locationCounts[loc]++;
      }
    }
  });

  // Get max count
  let counts = Object.values(locationCounts);
  let maxCount = Math.max(...counts);

  // Update button colors for all 49 locations
  for (let i = 1; i <= 49; i++) {
    let count = locationCounts[i];
    let button = document.getElementById('heatmap-' + i);
    if (button) {
      let color = getHeatMapColor(count, maxCount);
      button.style.backgroundColor = color;
      button.innerText = count;
      button.style.pointerEvents = 'none'; 
    }
  }
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


function exportLiveBPStats() {
  let exportedTotalPitches = totalPitches; // Use totalPitches for Live BP mode
  let exportedStrikePercentage = (totalStrikesLiveBP + foulsAfterTwoStrikes) / exportedTotalPitches * 100;

  let totalKs = 0; // Initialize totalKs
  let totalWalks = 0; // Initialize totalWalks

  let pitchTypeStats = {}; // Start with an empty object

  actionLog.forEach(action => {
    if (action.type === 'outcomeSelection') {
      const pitchType = action.pitchType || 'unknown';

      // Dynamically initialize pitchType if not present
      if (!pitchTypeStats[pitchType]) {
        pitchTypeStats[pitchType] = { total: 0, strikes: 0, whiffs: 0, calledStrikes: 0 };
      }

      pitchTypeStats[pitchType].total++;

      if (['whiff', 'calledStrike', 'foul'].includes(action.outcome)) {
        pitchTypeStats[pitchType].strikes++;
        if (action.outcome === 'whiff') {
          pitchTypeStats[pitchType].whiffs++;
        } else if (action.outcome === 'calledStrike') {
          pitchTypeStats[pitchType].calledStrikes++;
        }
      }

      if (action.prePitchCount.strikes === 2 && ['whiff', 'calledStrike'].includes(action.outcome)) {
        totalKs++;
      }

      if (action.type === 'ball' && action.prePitchCount.balls === 3) {
        totalWalks++;
      }
    }
  });

  let statsText = `Total Pitches: ${exportedTotalPitches}\n`;
  statsText += `Total Race Wins: ${raceWins}\n`;
  statsText += `Strike %: ${exportedStrikePercentage.toFixed(2)}%\n`;

  Object.entries(pitchTypeStats).forEach(([pitchType, stats]) => {
    if (stats.total > 0) { // Only include pitch types that were thrown
      const pitchTypeStrikePercentage = stats.strikes / stats.total * 100;
      statsText += `${pitchType} Strike %: ${pitchTypeStrikePercentage.toFixed(2)}%, Whiffs: ${stats.whiffs}, Called Strikes: ${stats.calledStrikes}\n`;
    }
  });

  statsText += `Total Ks: ${totalKs}\n`;
  statsText += `Total Walks: ${totalWalks}\n`;

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
});
