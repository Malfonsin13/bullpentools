let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;
let totalPitchesBullpen = 0;
let totalStrikesBullpen = 0;
let totalPitches = 0;
let mode = "bullpen";
let pitchType = "";
let lastAction = null;
let totalStrikesLiveBP = 0;
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
  resetCount();
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
  lastAction = 'strike';
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
  lastAction = 'ball';
});

document.getElementById('undoBtn').addEventListener('click', function() {
  if (actionLog.length > 0) {
    const lastAction = actionLog.pop();
    console.log('Popped Action:', lastAction);
    
    if (lastAction.wasRaceWin) {
      raceWins = Math.max(0, raceWins - 1);
    }

    if (actionLog.length > 0) {
      const prevAction = actionLog[actionLog.length - 1];
      strikeCount = prevAction.prePitchCount.strikes;
      pitchCount = prevAction.prePitchCount.strikes + prevAction.prePitchCount.balls;
    } else {
      strikeCount = 0;
      pitchCount = 0;
    }

    if (mode === "bullpen") {
      totalPitchesBullpen--;
      strikeCount = lastAction.prePitchCount.strikes;
      pitchCount = lastAction.prePitchCount.balls + lastAction.prePitchCount.strikes;

      if (lastAction.type === 'strike') {
        totalStrikesBullpen--;
      }
      if (lastAction.completedCount) {
        removeLastCompletedCount();
      }
    } else {
      totalPitches--;

      if (lastAction.type === 'strike' || (lastAction.type === 'outcomeSelection' && ["whiff", "calledStrike", "foul"].includes(lastAction.outcome))) {
          totalStrikesLiveBP--;
      }
    }

    if (lastAction.completedCount) {
      removeLastCompletedCount();
    }

    if ((mode === "bullpen" && totalPitchesBullpen === 0) || (mode === "liveBP" && totalPitches === 0)) {
      strikeCount = 0;
      pitchCount = 0;
    }

    removeLastPitchLogEntry();
    updateUI();

    console.log('After undo:', { totalPitches, totalStrikesLiveBP, strikeCount, pitchCount });
  }
});




document.querySelectorAll("#pitchTypeSelection .btn").forEach(button => {
  button.addEventListener('click', function() {
    pitchType = this.id;
    actionLog.push({
      type: 'pitchTypeSelection',
      pitchType: pitchType,
      prePitchCount: { strikes: strikeCount, balls: pitchCount - strikeCount },
      totalPitchesBefore: totalPitches
    });
    showOutcomeSelection();
  });
});

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

    actionLog.push({
      type: 'outcomeSelection',
      outcome: outcome,
      prePitchCount: { strikes: strikeCount, balls: pitchCount - strikeCount },
      totalPitchesBefore: totalPitches
    });
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

    let wasStrike = (outcome === "foul" && strikeCount < 2) || outcome !== "foul";
    if (wasStrike) {
      strikeCount++;
      pitchCount++;
      totalStrikesLiveBP++;

      if (strikeCount === 2 && (pitchCount - strikeCount === 0 || pitchCount - strikeCount === 1)) {
        raceWins++;
        updateRaceWins();
        actionLog[actionLog.length - 1].wasRaceWin = true;
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
  console.log('Before undo:', { totalPitches, totalStrikesLiveBP, strikeCount, pitchCount });

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

    let strikePercentage = totalPitchesBullpen > 0 ? (totalStrikesBullpen / totalPitchesBullpen) * 100 : 0;
    const strikePercentageElement = document.getElementById('strikePercentage');
    strikePercentageElement.innerText = `Strike %: ${strikePercentage.toFixed(2)}`;

    strikePercentageElement.style.color = getPercentageColor(strikePercentage);
  } else if (mode === "liveBP") {
    document.getElementById('totalPitchesLiveBP').innerText = `Total Pitches: ${totalPitches}`;
    document.getElementById('currentCountLiveBP').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;

    let raceWinsDisplayLiveBP = '🔥'.repeat(raceWins);
    document.getElementById('raceWinsLiveBP').innerText = `Race Wins: ${raceWinsDisplayLiveBP}`;

    const adjustedStrikeCount = Math.max(0, strikeCount - actionLog.filter(action => action.type === 'strike').length);
    let strikePercentageLiveBP = totalPitches > 0 ? (totalStrikesLiveBP / totalPitches) * 100 : 0;
    document.getElementById('strikePercentageLiveBP').innerText = `Strike %: ${strikePercentageLiveBP.toFixed(2)}`;
    document.getElementById('strikePercentageLiveBP').style.color = getPercentageColor(strikePercentageLiveBP);
  }

  const shouldDisplayUndo = (mode === "bullpen" && totalPitchesBullpen > 0) || (mode === "liveBP" && totalPitches > 0);
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

    if (actionLog.length > 0 && actionLog[actionLog.length - 1].type === 'strike') {
      actionLog[actionLog.length - 1].wasRaceWin = true;
    }
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

  if (completedCount && actionLog.length > 0) {
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

function removeLastPitchLogEntry() {

  const pitchLog = document.getElementById('pitchLog');
  if (pitchLog && pitchLog.lastChild) {
    pitchLog.removeChild(pitchLog.lastChild);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  toggleMode();
});
