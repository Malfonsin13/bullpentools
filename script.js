let pitchCount = 0;
let strikeCount = 0;
let raceWins = 0;
let totalPitches = 0; // Tracks total pitches in Live BP Mode
let mode = "bullpen";
let pitchType = ""; // Variable to store the selected pitch type in Live BP Mode

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
    if (mode === "bullpen") {
        strikeCount++;
        pitchCount++;
        totalPitches++;
        updateUI();
        updateCurrentCount();
        checkRaceCondition();
    }
});

document.getElementById('ballBtn').addEventListener('click', function() {
    if (mode === "bullpen") {
        pitchCount++;
        totalPitches++;
        updateUI();
        updateCurrentCount();
        checkRaceCondition();
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
        processOutcome(outcome); // Process the outcome
    });
});

// Process the selected outcome
function processOutcome(outcome) {
    updateCountBasedOnOutcome(outcome);
    totalPitches++; // Increment total pitches with each outcome processed
    if (outcome === "inPlay") {
        showInPlaySelection(); // Show in-play outcome options for further selection
    } else {
        logPitchResult(pitchType, outcome); // Log the pitch result
        resetForNextPitch(); // Reset for the next pitch
    }
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
    updateUI(); // Update the UI with the new total pitch count and current count
}

// Reset UI for the next pitch in Live BP mode
function resetForNextPitch() {
    pitchType = ""; // Clear the selected pitch type
    resetCount(); // Reset the count for the next pitch
    showPitchTypeSelection(); // Show pitch type selection again
}

// Show the Pitch Type Selection module, hide others
function showPitchTypeSelection() {
    document.getElementById('pitchTypeSelection').style.display = 'block';
    document.getElementById('outcomeSelection').style.display = 'none';
    document.getElementById('inPlaySelection').style.display = 'none';
}

// Update the count based on the outcome (e.g., ball, strike)
function updateCountBasedOnOutcome(outcome) {
    if (outcome === "whiff" || outcome === "calledStrike" || outcome === "foul") {
        strikeCount++;
    } else if (outcome === "ball") {
        pitchCount++;
    }
    // Increment pitchCount for every outcome processed, except for "inPlay" and "hbp" where the count resets
    if (!(outcome === "inPlay" || outcome === "hbp")) {
        pitchCount++;
    }
}

function updateUI() {
    document.getElementById('totalPitches').innerText = `Total Pitches: ${totalPitches}`;
    document.getElementById('currentCount').innerText = `Current Count: ${pitchCount - strikeCount}-${strikeCount}`;
}

function resetCount() {
    pitchCount = 0;
    strikeCount = 0;
    updateUI();
}

function checkRaceCondition() {
    // Implementation remains the same, specific to bullpen mode
}

function updateRaceWins() {
    // Implementation remains the same, specific to bullpen mode
}

document.addEventListener('DOMContentLoaded', function() {
    toggleMode(); // Initialize the UI based on the default mode
});
