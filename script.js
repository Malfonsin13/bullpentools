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

// Save the pitch log state
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
  resetCount();
}

document.getElementById('strikeBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState());
  strikeCount++;
  pitchCount++;
  if (mode === "bullpen") {
    totalPitchesBullpen++;
    totalStrikesBullpen++;
  } else {
    totalPitches++;
    totalStrikesLiveBP++;
  }
  updateUI();
  updateCurrentCount();
  checkRaceCondition();
});

document.getElementById('ballBtn').addEventListener('click', function() {
  actionLog.push(saveCurrentState());
  pitchCount++;
  if (mode === "bullpen") {
    totalPitchesBullpen++;
  } else {
    totalPitches++;
  }
  updateUI();
  updateCurrentCount();
  checkRaceCondition();
});

document.getElementById('undoBtn').addEventListener('click', function() {
  if (actionLog.length > 0) {
    const previousState = actionLog.pop();
    restoreState(previousState);
    restorePitchLog(previousState.pitchLog);
    if (previousState.completedCount) {
      removeLastCompletedCount();
    }
    updateUI();
  }
});

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
    completedCount: document.getElementById('countLog').innerHTML // Save completed count state
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
  document.getElementById('countLog').innerHTML = state.completedCount; // Restore completed count state
}

function restorePitchLog(pitchLogHTML) {
  document.getElementById('pitchLog').innerHTML = pitchLogHTML;
}

document.querySelectorAll("#pitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pitchType = this.id;
    actionLog.push(saveCurrentState());
    showOutcomeSelection();
  });
});

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

function showOutcomeSelection() {
  document.getElementById('pitchTypeSelection').style.display = 'none';
  document.getElementById('outcomeSelection').style.display = 'block';
}

document.querySelectorAll("#outcomeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    let outcome = this.id;
    actionLog.push(saveCurrentState());
    if (mode === "liveBP") {
      totalPitches++;
      updateUI();
    }
    processOutcome(outcome);
  });
});

function processOutcome(outcome) {
  if (outcome === "ball") {
    pitchCount++;
    if (pitchCount - strikeCount >= 4) {
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
      if (mode === "liveBP") totalStrikesLiveBP++;
      if (strikeCount === 2 && (pitchCount - strikeCount === 0 || pitchCount - strikeCount === 1)) {
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
    logPitchResult(pitchType, "HBP");
    resetCount();
    resetForNextPitch();
  }
  if (!["inPlay", "hbp"].includes(outcome)) {
    logPitchResult(pitchType, outcome);
    resetForNextPitch(false);
  }
  updateUI();
}

function showInPlaySelection() {
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'block';
}

document.querySelectorAll("#inPlaySelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    let inPlayResult = this.id;
    logPitchResult(pitchType, "In Play - " + inPlayResult);
    resetForNextPitch();
  });
});

function logPitchResult(pitchType, result) {
  let pitchLog = document.getElementById('pitchLog');
  let newEntry = document.createElement('li');
  let currentCountText = `${pitchCount - strikeCount}-${strikeCount}`;
  newEntry.innerText = `${pitchType.toUpperCase()}, Result: ${result}, Count: ${currentCountText}`;
  pitchLog.appendChild(newEntry);
  updateCurrentCount();
  updateUI();
}

function resetForNextPitch(resetCounts = true) {
  pitchType = "";
  showPitchTypeSelection();
  if (resetCounts) {
    resetCount();
  }
}

function showPitchTypeSelection() {
  document.getElementById('pitchTypeSelection').style.display = 'block';
  document.getElementById('outcomeSelection').style.display = 'none';
  document.getElementById('inPlaySelection').style.display = 'none';
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
  if (mode === "bullpen") {
    strikePercentageFromLog = totalPitchesBullpen > 0 ? (totalStrikesBullpen / totalPitchesBullpen) * 100 : 0;
    document.getElementById('totalPitches').innerText = `Total Pitches: ${totalPitchesBullpen}`;
    let strikeDisplay = strikeCount === 2 ? `${strikeCount}🔥` : strikeCount;
    document.getElementById('currentCount').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeDisplay}`;
    let raceWinsDisplay = '🔥'.repeat(raceWins);
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
    logCount(strikeCount, pitchCount - strikeCount);
    resetCount();
    updateRaceWins();
  } else if (pitchCount - strikeCount == 2 && strikeCount == 0) {
    completedCount = true;
    logCount(strikeCount, pitchCount - strikeCount);
    resetCount();
  } else if (pitchCount >= 3) {
    completedCount = true;
    logCount(strikeCount, pitchCount - strikeCount);
    resetCount();
  }
  if (completedCount) {
    actionLog[actionLog.length - 1].completedCount = true;
  }
}

function updateRaceWins() {
  let raceWinsDisplay = raceWins > 0 ? '🔥'.repeat(raceWins) : '';
  if (mode === "bullpen") {
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWinsDisplay}`;
  } else if (mode === "liveBP") {
    document.getElementById('raceWinsLiveBP').innerText = `Race Wins: ${raceWinsDisplay}`;
  }
}

function logCount(strikes, balls) {
  let countLog = document.getElementById('countLog');
  let newEntry = document.createElement('li');
  newEntry.innerText = `Final Count: ${balls}-${strikes}`;
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
});
