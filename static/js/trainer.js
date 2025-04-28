const targetLetterElement = document.getElementById('target-letter');
const detectedLetterElement = document.getElementById('detected-letter');
const detectedBoxElement = document.getElementById('detected-box');
const nextLetterButton = document.getElementById('next-letter-btn');
const statusMessageElement = document.getElementById('status-message');
const videoFeedElement = document.getElementById('video-feed');
const aslReferenceImg = document.getElementById('asl-reference-img');

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
const practiceLetters = alphabet.filter(letter => letter !== 'J' && letter !== 'Z');
let currentLetterIndex = 0;
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

function setTargetLetter(letter) {
    targetLetterElement.textContent = letter;
    
    // Update the ASL reference image
    if (aslImageUrls[letter]) {
        aslReferenceImg.src = aslImageUrls[letter];
        aslReferenceImg.alt = `ASL sign for letter ${letter}`;
    } else {
        aslReferenceImg.src = '';
        aslReferenceImg.alt = 'No reference available';
    }
    
    // Reset detected state visually immediately when target changes
    updateDetectedLetter("?", false, false, true); // isWaiting = true
    statusMessageElement.textContent = "Show the sign for " + letter;
}

function updateDetectedLetter(letter, isMatch, isUncertain = false, isWaiting = false, isNoHand = false) {
    let displayLetter = "?"; // Default placeholder
    if (letter && letter !== "None" && letter !== "Error") {
        displayLetter = letter;
    } else if (letter === "Error") {
        displayLetter = "!"; // Use exclamation for error
    }
    detectedLetterElement.textContent = displayLetter;

    // Manage classes - remove all state classes first
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
    // Default red-ish background is applied if no other class matches
}

function nextLetter() {
    currentLetterIndex = (currentLetterIndex + 1) % practiceLetters.length;
    setTargetLetter(practiceLetters[currentLetterIndex]);
}

// --- Server-Sent Events (SSE) ---
function connectSSE() {
    // Close existing connection if any
    if (eventSource) {
        console.log("Closing previous SSE connection.");
        eventSource.close();
    }

    statusMessageElement.textContent = "Connecting to detection stream...";
    console.log("Attempting to connect to SSE stream at /detect");
    eventSource = new EventSource('/detect'); // Connect to the Flask stream

    eventSource.onopen = function() {
        console.log("SSE Connection opened.");
        statusMessageElement.textContent = "Detection active. Show the sign for " + targetLetterElement.textContent;
    };

    eventSource.onmessage = function(event) {
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

                const isMatch = detected.toUpperCase() === target.toUpperCase();
                const isUncertain = detected === "Uncertain";
                const isWaiting = detected === "Waiting..." || detected === "Processing...";
                const isNoHand = detected === "No Hand";

                updateDetectedLetter(detected, isMatch, isUncertain, isWaiting, isNoHand);

                // Update status message based on state
                if (isMatch) {
                    statusMessageElement.textContent = "Correct!";
                } else if (isNoHand) {
                    statusMessageElement.textContent = "Show your hand clearly.";
                } else if (isUncertain) {
                    statusMessageElement.textContent = "Hold the sign steady...";
                } else if (!isWaiting) {
                    statusMessageElement.textContent = "Try again...";
                } else {
                    if (!statusMessageElement.textContent.startsWith("Detection active")) {
                        statusMessageElement.textContent = "Detection active. Show the sign for " + target;
                    }
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
        eventSource.close(); // Close the connection before retrying
        // Implement a reconnect mechanism with backoff
        setTimeout(connectSSE, 5000); // Try reconnecting after 5 seconds
    };
}

// --- Initialize ---
setTargetLetter(practiceLetters[currentLetterIndex]);
nextLetterButton.addEventListener('click', nextLetter);

// Optional: Clean up SSE connection when leaving the page
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        console.log("Closing SSE connection on page unload.");
        eventSource.close();
    }
});

// Start SSE connection when the page loads
window.addEventListener('load', connectSSE);