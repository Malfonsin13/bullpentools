let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;
let totalPitches = 0;
let mode = "";

document.getElementById('bullpenModeBtn').addEventListener('click', function() {
    mode = "bullpen";
    toggleMode();
});

document.getElementById('liveBPModeBtn').addEventListener('click', function() {
    mode = "liveBP";
    toggleMode();
});

document.getElementById('strikeBtn').addEventListener('click', function() {
    strikeCount++;
    pitchCount++;
    totalPitches++;
    updateUI();
    updateCurrentCount();
    checkRaceCondition();
});

document.getElementById('ballBtn').addEventListener('click', function() {
    pitchCount++;
    totalPitches++;
    updateUI();
    updateCurrentCount();
    checkRaceCondition();
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

function checkRaceCondition() {
    // Check for a win (0 balls and 2 strikes)
    if (strikeCount == 2 && pitchCount == 2) {
        raceWins++; // Increment the win counter
        logCount(strikeCount, pitchCount - strikeCount); // Log the win
        updateRaceWins(); // Update the display of race wins
        resetCount(); // Reset the count for the next batter
    }
    // Check for a loss (2 balls and 0 strikes)
    else if (pitchCount - strikeCount == 2 && pitchCount == 2) {
        logCount(strikeCount, pitchCount - strikeCount); // Log the loss
        resetCount(); // Reset the count for the next batter
    }
    // If 3 pitches have been thrown without reaching 2 strikes or 2 balls, reset the count
    else if (pitchCount >= 3) {
        logCount(strikeCount, pitchCount - strikeCount);
        resetCount();
    }
}


function updateUI() {
    updateCurrentCount();
    document.getElementById('totalPitches').innerText = `Total Pitches: ${totalPitches}`; // Update total pitch count
}

function updateCurrentCount() {
    document.getElementById('currentCount').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
}

function resetCount() {
    pitchCount = 0;
    strikeCount = 0;
    updateCurrentCount();
    updateUI();
}

function updateRaceWins() {
    document.getElementById('raceWins').innerText = `Race Wins: ${raceWins}`;
}

function logCount(strikes, balls) {
    let countLog = document.getElementById('countLog');
    let newCount = document.createElement('li');
    newCount.innerText = `Final Count: ${balls}-${strikes}`;
    countLog.appendChild(newCount);
}
