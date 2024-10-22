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
    logCount(strikeCount, pitchCount - strikeCount, false);
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
  if (mode === "bullpen" || mode === "putaway") {
    totalPitchesBullpen++;
  } else {
    totalPitches++;
  }
  updateUI();
  updateCurrentCount();

  if (mode === "putaway" && (pitchCount - strikeCount) === 2) {
    logCount(strikeCount, pitchCount - strikeCount, false);
    resetCount();
  }
  
  if (mode === "bullpen" && (pitchCount - strikeCount) === 2) {
    logCount(strikeCount, pitchCount - strikeCount, false);
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

  const balls = pitchCount - strikeCount;
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
  logCount(strikeCount, pitchCount - strikeCount, false);
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
    showOutcomeSelection();  // Transition to outcome selection after selecting a pitch location
  });
});

document.querySelectorAll("#pitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pitchType = this.id;
    actionLog.push(saveCurrentState());
    showPitchLocationSelection();
  });
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
  let previousCount = { balls: pitchCount - strikeCount, strikes: strikeCount };
  let scenarioEmojis = '';

  if (outcome === "ball") {
    pitchCount++;
    if (mode === "liveBP" || mode === "points") {
      totalPitches++;
    }
    if (mode === "bullpen" && pitchCount - strikeCount === 2) {
      logCount(strikeCount, pitchCount - strikeCount, false);
      resetCount();
    }
  } else if (["whiff", "calledStrike", "foul"].includes(outcome)) {
    if (outcome === "foul" && strikeCount === 2) {
      foulsAfterTwoStrikes++;
    }
    let wasStrike = (outcome === "foul" && strikeCount < 2) || outcome !== "foul";
    if (wasStrike) {
      strikeCount++;
      pitchCount++;
      if (mode === "liveBP" || mode === "points") {
        totalStrikesLiveBP++;
        totalPitches++;
      }
      if (mode === "putaway" && strikeCount === 2) {
        showPutawayOptions();
      } else if (
        strikeCount === 2 &&
        (pitchCount - strikeCount === 0 || pitchCount - strikeCount === 1)
      ) {
        raceWins++;
        updateRaceWins();
      }
      if (strikeCount >= 3) {
        resetCount();
      }
    }
  } else if (outcome === "inPlay") {
    resetCount();
    showInPlaySelection();
  } else if (outcome === "hbp") {
    logPitchResult(pitchType, "HBP", pitchLocation);
    resetCount();
    resetForNextPitch();
  }

  // Points Mode logic
  if (mode === "points") {
    let pointsToAdd = 0;
    let pointsToDeduct = 0;

    // Define strike and ball locations
    const strikeLocations = [7, 8, 9, 12, 13, 14, 17, 18, 19];
    const ballLocations = [
      1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25,
    ];

    // Scenario 1: Strikes in specific locations
    if (
      ["whiff", "calledStrike", "foul"].includes(outcome) &&
      strikeLocations.includes(pitchLocation)
    ) {
      pointsToAdd += 10
      scenarioEmojis += '🎯';
    }

    // Scenario 2: Balls in specific locations
    if (outcome === "ball" && ballLocations.includes(pitchLocation)) {
      pointsToDeduct += 10
      scenarioEmojis += '💀';
    }

    // Scenario 3: Getting ahead (0-0 to 0-1)
    if (
      previousCount.balls === 0 &&
      previousCount.strikes === 0 &&
      strikeCount === 1
    ) {
      pointsToAdd += 10
      scenarioEmojis += '🚀';
    }

    // Scenario 4: Winning the race (0-2 or 1-2)
    if (
      strikeCount === 2 &&
      (pitchCount - strikeCount === 0 || pitchCount - strikeCount === 1)
    ) {
      pointsToAdd += 10
      scenarioEmojis += '🏁';
    }

    // Scenario 5: Losing the race (2-0 or 2-1)
    if (
      (pitchCount - strikeCount) === 2 &&
      strikeCount <= 1 &&
      previousCount.balls < 2
    ) {
      pointsToDeduct += 20
      scenarioEmojis += '💀';
    }

    // Scenario 6: Putaway (getting a strikeout with a called strike or a whiff)
    if (
      strikeCount >= 3 &&
      ["whiff", "calledStrike"].includes(outcome)
    ) {
      pointsToAdd += 10
      scenarioEmojis += '⚡';
    }

    // Scenario 7: Walk (getting to 4 balls)
    if (pitchCount - strikeCount >= 4) {
      pointsToDeduct += 30
      scenarioEmojis += '💀';
      resetCount();
    }

    // Double points if last pitch type is in comboPitchTypes
    if (comboPitchTypes.includes(pitchType) && pointsToAdd > 0) {
      pointsToAdd *= 2
      scenarioEmojis += '🔥';
      displayComboNotification();
    }

    // Update points
    points += pointsToAdd;
    points -= pointsToDeduct;

    if (pointsToDeduct > 0) {
      displayPointsDeduction(pointsToDeduct);
    }
  
    updatePointsDisplay();
  }

  if (!["inPlay", "hbp"].includes(outcome)) {
    logPitchResult(pitchType, outcome, pitchLocation, scenarioEmojis);
    resetForNextPitch(false);
  }

  updateUI();
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
    logPitchResult(pitchType, "In Play - " + inPlayResult, pitchLocation, '');
    resetForNextPitch();
  });
});

function logPitchResult(pitchType, result, location, scenarioEmojis = '') {
  let pitchLog = document.getElementById('pitchLog');
  let newEntry = document.createElement('li');
  let currentCountText = `${pitchCount - strikeCount}-${strikeCount}`;

  let pitchTypeText = pitchType ? pitchType.toUpperCase() : 'UNKNOWN';
  let locationText = (location !== undefined && location !== null) ? location : 'UNKNOWN';

  newEntry.innerText = `${pitchTypeText}, Location: ${locationText}, Result: ${result}, Count: ${currentCountText} ${scenarioEmojis}`;
  pitchLog.appendChild(newEntry);
  updateCurrentCount();
  updateUI();
}



function resetForNextPitch(resetCounts = true) {
  pitchType = "";  // Clear the pitch type
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
    document.getElementById('currentCount').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeDisplay}`;
    let raceWinsDisplay = mode === "putaway" ? '⚰️'.repeat(raceWins) : '🔥'.repeat(raceWins);
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;
    const strikePercentageElement = document.getElementById('strikePercentage');
    strikePercentageElement.innerText = `Strike %: ${strikePercentageFromLog.toFixed(2)}`;
    strikePercentageElement.style.color = getPercentageColor(strikePercentageFromLog);
  } else if (mode === "liveBP") {
    document.getElementById('totalPitchesLiveBP').innerText = `Total Pitches: ${totalPitches}`;
    document.getElementById('currentCountLiveBP').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
    let raceWinsDisplayLiveBP = '🔥'.repeat(raceWins);
    document.getElementById('raceWinsLiveBP').innerText = `Race Wins: ${raceWinsDisplayLiveBP}`;
    const strikePercentageElementLiveBP = document.getElementById('strikePercentageLiveBP');
    strikePercentageElementLiveBP.innerText = `Strike %: ${strikePercentageFromLog.toFixed(2)}`;
    strikePercentageElementLiveBP.style.color = getPercentageColor(strikePercentageFromLog);
    } else if (mode === "points") {
      document.getElementById('totalPitchesLiveBP').innerText = `Total Pitches: ${totalPitches}`;
      document.getElementById('currentCountLiveBP').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
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
  document.getElementById(currentCountDisplay).innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
}

function resetCount() {
  pitchCount = 0;
  strikeCount = 0;
  updateUI();
}

function checkRaceCondition() {
  let completedCount = false;
  if (strikeCount == 2 && mode !== "putaway") {
    raceWins++;
    completedCount = true;
    logCount(strikeCount, pitchCount - strikeCount, false);
    resetCount();
    updateRaceWins();
  } else if (pitchCount - strikeCount == 2 && strikeCount == 0 && mode === "bullpen") {
    completedCount = true;
    logCount(strikeCount, pitchCount - strikeCount, false);
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

function logCount(strikes, balls, isK) {
  let countLog = document.getElementById('countLog');
  let newEntry = document.createElement('li');
  newEntry.innerText = `Final Count: ${balls}-${strikes}`;
  if (isK) {
    newEntry.innerText += ' ⚰️';
  }
  countLog.appendChild(newEntry);
}

document.getElementById('exportBtn').addEventListener('click', function() {
  exportLiveBPStats();
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
});
