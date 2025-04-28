const practiceInputElement = document.getElementById('practice-input');
const startPracticeButton = document.getElementById('start-practice-btn');
const practiceProgressDisplay = document.getElementById('practice-progress-display');
const targetLetterElement = document.getElementById('target-letter');
const detectedLetterElement = document.getElementById('detected-letter');
const detectedBoxElement = document.getElementById('detected-box');
const nextPracticeLetterButton = document.getElementById('next-practice-letter-btn'); // Optional manual advance
const statusMessageElement = document.getElementById('status-message');
const videoFeedElement = document.getElementById('video-feed');
const aslReferenceImg = document.getElementById('asl-reference-img');

let practiceString = "";
let practiceLetters = [];
let currentPracticeIndex = 0;
let isPracticeActive = false;
let successTimeout = null; // To manage the delay after correct sign
let eventSource = null;

// ASL reference image URLs (using the links you provided)
const aslImageUrls = {
    'A': 'https://www.wikihow.com/images/thumb/f/fc/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-1-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-1-Version-3.jpg.webp',
    'B': 'https://www.wikihow.com/images/thumb/f/f6/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-2-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-2-Version-3.jpg.webp',
    'C': 'https://www.wikihow.com/images/thumb/8/8d/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-3-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-3-Version-3.jpg.webp',
    'D': 'https://www.wikihow.com/images/thumb/1/10/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-4-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-4-Version-3.jpg.webp',
    'E': 'https://www.wikihow.com/images/thumb/1/17/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-5-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-5-Version-3.jpg.webp',
    'F': 'https://www.wikihow.com/images/thumb/c/c9/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-6-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-6-Version-3.jpg.webp',
    'G': 'https://www.wikihow.com/images/thumb/5/52/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-7-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-7-Version-3.jpg.webp',
    'H': 'https://www.wikihow.com/images/thumb/d/d0/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-8-Version-4.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-8-Version-4.jpg.webp',
    'I': 'https://www.wikihow.com/images/thumb/c/c9/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-9-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-9-Version-3.jpg.webp',
    'J': 'https://www.wikihow.com/images/thumb/6/69/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-10-Version-4.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-10-Version-4.jpg.webp',
    'K': 'https://www.wikihow.com/images/thumb/f/f1/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-11-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-11-Version-3.jpg.webp',
    'L': 'https://www.wikihow.com/images/thumb/5/56/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-12-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-12-Version-3.jpg.webp',
    'M': 'https://www.wikihow.com/images/thumb/2/22/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-13-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-13-Version-3.jpg.webp',
    'N': 'https://www.wikihow.com/images/thumb/3/32/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-14-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-14-Version-3.jpg.webp',
    'O': 'https://www.wikihow.com/images/thumb/f/f0/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-15-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-15-Version-3.jpg.webp',
    'P': 'https://www.wikihow.com/images/thumb/1/1b/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-16-Version-4.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-16-Version-4.jpg.webp',
    'Q': 'https://www.wikihow.com/images/thumb/8/87/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-17-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-17-Version-3.jpg.webp',
    'R': 'https://www.wikihow.com/images/thumb/f/f7/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-18-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-18-Version-3.jpg.webp',
    'S': 'https://www.wikihow.com/images/thumb/7/74/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-19-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-19-Version-3.jpg.webp',
    'T': 'https://www.wikihow.com/images/thumb/1/12/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-20-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-20-Version-3.jpg.webp',
    'U': 'https://www.wikihow.com/images/thumb/f/fd/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-21-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-21-Version-3.jpg.webp',
    'V': 'https://www.wikihow.com/images/thumb/4/43/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-22-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-22-Version-3.jpg.webp',
    'W': 'https://www.wikihow.com/images/thumb/7/7f/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-23-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-23-Version-3.jpg.webp',
    'X': 'https://www.wikihow.com/images/thumb/2/2c/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-24-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-24-Version-3.jpg.webp',
    'Y': 'https://www.wikihow.com/images/thumb/c/c0/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-25-Version-3.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-25-Version-3.jpg.webp',
    'Z': 'https://www.wikihow.com/images/thumb/9/9f/Fingerspell-the-Alphabet-in-American-Sign-Language-Step-26-Version-4.jpg/aid388831-v4-728px-Fingerspell-the-Alphabet-in-American-Sign-Language-Step-26-Version-4.jpg.webp'
};

// --- Core Logic Functions ---

function startPractice() {
    practiceString = practiceInputElement.value.toUpperCase().trim();
    if (!practiceString) {
        practiceProgressDisplay.textContent = "Please enter some text to practice.";
        return;
    }

    // Filter for valid letters (A-Z, excluding J and Z if needed) and remove spaces/other chars
    // Assuming J and Z are excluded based on trainer.js logic
    practiceLetters = practiceString.split('').filter(char => /^[A-Z]$/.test(char) && char !== 'J' && char !== 'Z');

    if (practiceLetters.length === 0) {
        practiceProgressDisplay.textContent = "No valid letters (A-I, K-Y) found in the input.";
        return;
    }

    currentPracticeIndex = 0;
    isPracticeActive = true;
    practiceInputElement.disabled = true;
    startPracticeButton.disabled = true;
    nextPracticeLetterButton.style.display = 'inline-block'; // Show manual button

    setTargetLetter(practiceLetters[currentPracticeIndex]);
    updateProgressDisplay();
    connectSSE(); // Start or ensure SSE connection is active
}

function setTargetLetter(letter) {
    targetLetterElement.textContent = letter;
    
    // Update the reference image
    if (aslImageUrls[letter]) {
        aslReferenceImg.src = aslImageUrls[letter];
        aslReferenceImg.alt = `ASL sign for letter ${letter}`;
    } else {
        aslReferenceImg.src = '';
        aslReferenceImg.alt = 'No reference available';
    }
    
    updateDetectedLetter("?", false, false, true); // Reset detected state to waiting
    statusMessageElement.textContent = "Show the sign for " + letter;
}

function updateProgressDisplay() {
    if (!isPracticeActive) {
        practiceProgressDisplay.textContent = "Enter text and click Start";
        return;
    }
    const progressText = practiceLetters.map((letter, index) => {
        if (index < currentPracticeIndex) {
            return `<span style="color: var(--success-color); font-weight: bold;">${letter}</span>`; // Completed
        } else if (index === currentPracticeIndex) {
            return `<span style="text-decoration: underline; font-weight: bold;">${letter}</span>`; // Current
        } else {
            return `<span>${letter}</span>`; // Upcoming
        }
    }).join(' ');
    practiceProgressDisplay.innerHTML = `Practicing: ${progressText}`;
}

function advanceLetter() {
    clearTimeout(successTimeout); // Clear any pending advance timer
    currentPracticeIndex++;
    if (currentPracticeIndex < practiceLetters.length) {
        setTargetLetter(practiceLetters[currentPracticeIndex]);
        updateProgressDisplay();
    } else {
        // Practice complete
        isPracticeActive = false;
        practiceProgressDisplay.textContent = `Finished practicing "${practiceString}"!`;
        statusMessageElement.textContent = "Practice Complete!";
        targetLetterElement.textContent = "✓"; // Checkmark for completion
        updateDetectedLetter("✓", true); // Show success on detected box too
        practiceInputElement.disabled = false;
        startPracticeButton.disabled = false;
        nextPracticeLetterButton.style.display = 'none'; // Hide manual button
        // Optionally close SSE connection if not needed elsewhere
        // if (eventSource) eventSource.close();
    }
}

// --- UI Update Function (Similar to trainer.js) ---
function updateDetectedLetter(letter, isMatch, isUncertain = false, isWaiting = false, isNoHand = false) {
    let displayLetter = "?";
    if (letter && letter !== "None" && letter !== "Error" && letter !== "Waiting..." && letter !== "Processing...") {
        displayLetter = letter;
    } else if (letter === "Error") {
        displayLetter = "!";
    } else if (letter === "✓") { // Handle completion checkmark
        displayLetter = "✓";
    }
    detectedLetterElement.textContent = displayLetter;

    detectedBoxElement.classList.remove('match', 'uncertain', 'no-hand', 'waiting');

    if (isMatch) {
        detectedBoxElement.classList.add('match');
    } else if (isUncertain) {
        detectedBoxElement.classList.add('uncertain');
    } else if (isNoHand) {
        detectedBoxElement.classList.add('no-hand');
    } else if (isWaiting || letter === "Waiting..." || letter === "Processing..." || letter === "?") {
        detectedBoxElement.classList.add('waiting');
    }
}


// --- Server-Sent Events (SSE) ---
function connectSSE() {
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
        console.log("SSE connection already open.");
        // Ensure status reflects practice mode if connection was already open
        if (isPracticeActive) {
             statusMessageElement.textContent = "Detection active. Show the sign for " + targetLetterElement.textContent;
        }
        return;
    }

    if (eventSource) {
        console.log("Closing previous SSE connection.");
        eventSource.close();
    }

    statusMessageElement.textContent = "Connecting to detection stream...";
    console.log("Attempting to connect to SSE stream at /detect");
    eventSource = new EventSource('/detect');

    eventSource.onopen = function() {
        console.log("SSE Connection opened.");
        if (isPracticeActive) {
            statusMessageElement.textContent = "Detection active. Show the sign for " + targetLetterElement.textContent;
        } else {
             statusMessageElement.textContent = "Detection active. Start practice when ready.";
        }
    };

    eventSource.onmessage = function(event) {
        if (!isPracticeActive) return; // Only process if practice is ongoing

        try {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error("Error from server:", data.error);
                statusMessageElement.textContent = `Server Error: ${data.error}`;
                updateDetectedLetter("Error", false);
                return;
            }

            if (data.prediction !== undefined) {
                const detected = data.prediction;
                const target = targetLetterElement.textContent;

                // Don't process if target isn't set yet (e.g., before practice starts or after completion)
                if (target === '-' || target === '✓') return;

                const isMatch = detected.toUpperCase() === target.toUpperCase();
                const isUncertain = detected === "Uncertain";
                const isWaiting = detected === "Waiting..." || detected === "Processing...";
                const isNoHand = detected === "No Hand";

                updateDetectedLetter(detected, isMatch, isUncertain, isWaiting, isNoHand);

                // Handle state updates and auto-advance
                clearTimeout(successTimeout); // Clear previous timer if a new message arrives

                if (isMatch) {
                    statusMessageElement.textContent = "Correct! Next...";
                    // Wait briefly before advancing
                    successTimeout = setTimeout(advanceLetter, 1500); // 1.5 second delay
                } else if (isNoHand) {
                    statusMessageElement.textContent = "Show your hand clearly.";
                } else if (isUncertain) {
                    statusMessageElement.textContent = "Hold the sign steady...";
                } else if (!isWaiting) {
                    statusMessageElement.textContent = "Try again...";
                } else {
                     // Keep showing the target instruction if waiting/processing
                     statusMessageElement.textContent = "Show the sign for " + target;
                }
            }
        } catch (e) {
            console.error("Failed to parse SSE data or JS error:", event.data, e);
            statusMessageElement.textContent = "Error processing detection data.";
            updateDetectedLetter("Error", false);
        }
    };

    eventSource.onerror = function(err) {
        console.error("SSE Error occurred:", err);
        statusMessageElement.textContent = "Stream disconnected. Trying to reconnect...";
        updateDetectedLetter("?", false, false, true); // Reset to waiting state visually
        if (eventSource) eventSource.close();
        // Implement a reconnect mechanism with backoff
        setTimeout(connectSSE, 5000); // Try reconnecting after 5 seconds
    };
}

// --- Initialize ---
startPracticeButton.addEventListener('click', startPractice);
nextPracticeLetterButton.addEventListener('click', advanceLetter); // Enable the button's click listener

// Optional: Clean up SSE connection when leaving the page
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        console.log("Closing SSE connection on page unload.");
        eventSource.close();
    }
    clearTimeout(successTimeout); // Prevent advance after leaving page
});

// Start SSE connection when the page loads (it will wait for practice to start)
window.addEventListener('load', connectSSE);

// Initial state message
statusMessageElement.textContent = "Enter text and click Start Practice";
