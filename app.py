import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp
import json
import time
from collections import deque, Counter
from flask import Flask, render_template, Response, stream_with_context
import os
import logging
import threading

# --- Configuration & Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Paths (adjust if your structure is different)
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # Get directory of the script
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'asl_landmark_model_final.keras')
LABELS_PATH = os.path.join(BASE_DIR, 'models', 'asl_landmark_labels.json')

# --- Global Variables ---
camera_lock = threading.Lock()
cap = None # Initialize to None
model = None
class_names = None
mp_hands = None
hands = None
mp_drawing = None
mp_drawing_styles = None

# --- Constants ---
NUM_LANDMARKS = 21 * 3 # 21 landmarks, 3 coordinates (x, y, z)
PREDICTION_BUFFER_SIZE = 10 # Number of frames for smoothing
MIN_PREDICTION_CONFIDENCE = 0.6 # Minimum confidence for a prediction to be considered valid
MIN_DETECTION_CONFIDENCE = 0.6
MIN_TRACKING_CONFIDENCE = 0.6


# --- Initialization Function (Loads Model, Labels, MediaPipe) ---
def initialize_resources():
    global model, class_names, mp_hands, hands, mp_drawing, mp_drawing_styles
    logger.info("Initializing resources...")

    # Load MediaPipe
    try:
        mp_hands = mp.solutions.hands
        hands = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MIN_TRACKING_CONFIDENCE
        )
        mp_drawing = mp.solutions.drawing_utils
        mp_drawing_styles = mp.solutions.drawing_styles
        logger.info("MediaPipe Hands initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing MediaPipe: {e}", exc_info=True)
        return False

    # Load Keras Model
    try:
        logger.info(f"Attempting to load model from: {MODEL_PATH}")
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
            # Optional: Warm up the model
            dummy_input = np.zeros((1, NUM_LANDMARKS), dtype=np.float32)
            model.predict(dummy_input, verbose=0)
            logger.info("Model loaded and warmed up successfully.")
        else:
            logger.error(f"Model file not found at {MODEL_PATH}")
            return False
    except Exception as e:
        logger.error(f"Error loading Keras model: {e}", exc_info=True)
        return False

    # Load Labels
    try:
        logger.info(f"Attempting to load labels from: {LABELS_PATH}")
        if os.path.exists(LABELS_PATH):
            with open(LABELS_PATH, 'r') as f:
                label_dict = json.load(f)
            # Convert keys (predicted indices) back to integers
            class_names = {int(v): k for k, v in label_dict.items()}
            logger.info(f"Loaded {len(class_names)} class labels: {list(class_names.values())}")
            # Verify model output matches labels
            if model.output_shape[-1] != len(class_names):
                 logger.warning(f"Model output size ({model.output_shape[-1]}) doesn't match number of labels ({len(class_names)})!")
            # Ensure all expected indices are present
            expected_indices = set(range(len(class_names)))
            loaded_indices = set(class_names.keys())
            if expected_indices != loaded_indices:
                logger.warning(f"Label indices mismatch. Expected: {expected_indices}, Loaded: {loaded_indices}")


        else:
            logger.error(f"Label file not found at {LABELS_PATH}")
            return False
    except Exception as e:
        logger.error(f"Error loading labels: {e}", exc_info=True)
        return False

    logger.info("All resources initialized successfully.")
    return True


# --- Camera Initialization (Thread-safe) ---
def initialize_camera():
    global cap
    with camera_lock:
        if cap is None:
            logger.info("Attempting to open webcam...")
            cap = cv2.VideoCapture(0) # Try default camera
            if not cap.isOpened():
                logger.warning("Could not open camera 0, trying camera 1...")
                cap = cv2.VideoCapture(1) # Try alternative camera index
                if not cap.isOpened():
                    logger.error("Error: Could not open any webcam.")
                    cap = None # Ensure cap is None if failed
                    return False

            # Set desired properties (optional, might not be supported by all cameras)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480) # Adjusted height
            logger.info(f"Webcam opened successfully (Resolution: {cap.get(cv2.CAP_PROP_FRAME_WIDTH)}x{cap.get(cv2.CAP_PROP_FRAME_HEIGHT)}).")
            return True
        else:
            # logger.info("Camera already initialized.")
            return True # Already initialized

# --- Release Camera ---
def release_camera():
    global cap
    with camera_lock:
        if cap is not None:
            logger.info("Releasing webcam.")
            cap.release()
            cap = None
            logger.info("Webcam released.")


# --- Landmark Processing Function ---
def process_landmarks(hand_landmarks):
    if not hand_landmarks:
        return None

    landmarks = []
    for lm in hand_landmarks.landmark:
        landmarks.extend([lm.x, lm.y, lm.z])

    if len(landmarks) != NUM_LANDMARKS:
         logger.warning(f"Expected {NUM_LANDMARKS} landmark coordinates, got {len(landmarks)}")
         return None

    # Normalize landmarks (center around wrist and scale)
    wrist_x, wrist_y, wrist_z = landmarks[0], landmarks[1], landmarks[2]
    normalized = []
    max_dist = 1e-6 # Avoid division by zero

    temp_coords = []
    for i in range(0, NUM_LANDMARKS, 3):
        norm_x = landmarks[i] - wrist_x
        norm_y = landmarks[i+1] - wrist_y
        norm_z = landmarks[i+2] - wrist_z
        temp_coords.extend([norm_x, norm_y, norm_z])
        dist = np.sqrt(norm_x**2 + norm_y**2 + norm_z**2)
        max_dist = max(max_dist, dist)

    # Now scale by max_dist
    for i in range(0, NUM_LANDMARKS, 3):
         normalized.extend([
             temp_coords[i] / max_dist,
             temp_coords[i+1] / max_dist,
             temp_coords[i+2] / max_dist
         ])

    if len(normalized) != NUM_LANDMARKS:
        logger.warning(f"Unexpected number of normalized landmarks after scaling: {len(normalized)}")
        return None

    return normalized


# --- Detection Generator (This is the core logic now) ---
def generate_detections():
    """Generates ASL detection results using webcam feed, MediaPipe, and Keras model."""
    global cap, model, class_names, hands # Need access to these globals

    if not model or not class_names or not hands:
        logger.error("Model, labels, or MediaPipe not initialized. Cannot run detection.")
        yield f"data: {json.dumps({'error': 'Server resources not initialized'})}\n\n"
        return

    if not initialize_camera():
        logger.error("Camera could not be initialized for detection.")
        yield f"data: {json.dumps({'error': 'Could not access webcam'})}\n\n"
        return

    logger.info("Starting detection stream...")
    predictions_deque = deque(maxlen=PREDICTION_BUFFER_SIZE)
    last_yield_time = time.time()

    while True:
        frame_start_time = time.time()
        prediction_result = "Waiting..." # Default state

        try:
            with camera_lock: # Acquire lock to read frame
                if cap is None or not cap.isOpened():
                    logger.warning("Camera became unavailable during detection.")
                    prediction_result = "Error: Camera"
                    # Try to re-initialize? Or just signal error and stop?
                    # For now, signal error and break to avoid busy-looping
                    if not initialize_camera(): # Try re-initializing
                        yield f"data: {json.dumps({'error': 'Camera disconnected'})}\n\n"
                        break # Exit the loop if re-initialization fails
                    else:
                        continue # Skip this iteration if re-initialization worked

                success, frame = cap.read()

            if not success or frame is None:
                # logger.warning("Ignoring empty camera frame for detection.")
                time.sleep(0.05) # Avoid busy-waiting if frames aren't coming
                continue

            # --- Frame Processing ---
            # 1. Flip horizontally
            frame = cv2.flip(frame, 1)

            # 2. Convert BGR to RGB for MediaPipe
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_rgb.flags.writeable = False  # Performance optimization

            # 3. Process frame with MediaPipe Hands
            results = hands.process(frame_rgb)

            # --- Landmark Extraction and Prediction ---
            normalized_landmarks = None
            if results.multi_hand_landmarks:
                # Assuming max_num_hands=1, take the first detected hand
                processed_landmarks = process_landmarks(results.multi_hand_landmarks[0])

                if processed_landmarks:
                    normalized_landmarks = np.array(processed_landmarks, dtype=np.float32)

            if normalized_landmarks is not None:
                # Ensure shape is (1, NUM_LANDMARKS) for the model
                if normalized_landmarks.shape == (NUM_LANDMARKS,):
                    input_data = np.expand_dims(normalized_landmarks, axis=0)

                    # 4. Predict with Keras model
                    model_prediction = model.predict(input_data, verbose=0)[0]
                    pred_index = np.argmax(model_prediction)
                    confidence = np.max(model_prediction)

                    # 5. Get class name and apply confidence threshold
                    if confidence >= MIN_PREDICTION_CONFIDENCE:
                        pred_label = class_names.get(pred_index, "Unknown")
                    else:
                        pred_label = "Uncertain" # Below confidence threshold

                    # 6. Add to smoothing buffer
                    predictions_deque.append(pred_label)

                else:
                     logger.warning(f"Normalized landmarks have unexpected shape: {normalized_landmarks.shape}")
                     predictions_deque.append("Processing...") # Indicate an issue

            else:
                # No hand detected or landmarks couldn't be processed
                predictions_deque.append("No Hand")

            # --- Determine Final Prediction (Smoothing) ---
            if predictions_deque:
                # Find the most common prediction in the buffer
                most_common = Counter(predictions_deque).most_common(1)
                if most_common:
                    prediction_result = most_common[0][0]
                else:
                    prediction_result = "Waiting..." # Should not happen if deque is not empty
            else:
                prediction_result = "Waiting..." # Initial state

            # --- Yield Result via SSE ---
            current_time = time.time()
            # Optional: Limit yield frequency if processing is very fast
            # if current_time - last_yield_time > 0.05: # Yield approx 20 times/sec max
            sse_data = json.dumps({'prediction': prediction_result})
            yield f"data: {sse_data}\n\n"
            last_yield_time = current_time

            # Frame processing time logging (optional)
            # frame_end_time = time.time()
            # logger.debug(f"Frame processing time: {frame_end_time - frame_start_time:.4f}s")

            # Control loop speed slightly, prevent 100% CPU if camera is fast
            time.sleep(0.01)


        except Exception as e:
            logger.error(f"Error in detection loop: {e}", exc_info=True)
            # Yield an error message to the client
            yield f"data: {json.dumps({'error': 'Internal server error during detection'})}\n\n"
            # Optional: break the loop or add a longer sleep after an error
            time.sleep(1) # Pause briefly after an error

    logger.info("Detection stream ended.")
    # Release camera when the generator naturally finishes (though SSE usually runs indefinitely)
    # release_camera() # Might be better to handle release elsewhere if app restarts


# --- Video Streaming Generator ---
def generate_video_frames():
    """Generates video frames with landmarks drawn."""
    global cap, hands, mp_drawing, mp_hands, mp_drawing_styles # Need access to these globals

    if not hands or not mp_drawing or not mp_hands or not mp_drawing_styles:
         logger.error("MediaPipe not initialized. Cannot run video feed.")
         # Yield a placeholder or error image?
         # For now, just return an empty generator
         return

    if not initialize_camera():
        logger.error("Camera could not be initialized for video feed.")
        # Yield a placeholder/error image?
        return

    logger.info("Starting video stream...")

    while True:
        try:
            with camera_lock: # Acquire lock to read frame
                if cap is None or not cap.isOpened():
                    logger.warning("Camera became unavailable during video feed.")
                    # Attempt to reconnect or break?
                    time.sleep(0.5)
                    continue # Skip this frame

                success, frame = cap.read()

            if not success or frame is None:
                # logger.warning("Ignoring empty camera frame for video.")
                time.sleep(0.05)
                continue

            # --- Frame Processing for Display ---
            # 1. Flip horizontally (consistent with detection)
            frame = cv2.flip(frame, 1)

            # 2. Create a copy for MediaPipe processing (RGB)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_rgb.flags.writeable = False # Performance optimization

            # 3. Process with MediaPipe Hands
            results = hands.process(frame_rgb)

            # 4. Draw landmarks on the *original* BGR frame
            frame.flags.writeable = True # Make original frame writeable
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(
                        frame, # Draw on the BGR frame
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS,
                        mp_drawing_styles.get_default_hand_landmarks_style(),
                        mp_drawing_styles.get_default_hand_connections_style())

            # 5. Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80]) # Quality=80
            if not ret:
                logger.warning("Could not encode frame to JPEG.")
                continue

            frame_bytes = buffer.tobytes()

            # 6. Yield the frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

            # Control frame rate slightly if needed
            time.sleep(0.01) # Small delay

        except Exception as e:
            logger.error(f"Error in video streaming loop: {e}", exc_info=True)
            time.sleep(1) # Pause after an error

    logger.info("Video stream ended.")
    # Camera release is handled by the main app exit or if explicitly stopped


# --- Flask Routes ---
@app.route('/')
def index():
    """Serves the main HTML page (trainer page)."""
    logger.info("Serving trainer.html as index")
    return render_template('trainer.html') # Changed from index.html

@app.route('/practice')
def practice_page():
    """Serves the new practice page."""
    logger.info("Serving practice.html")
    return render_template('practice.html')

@app.route('/detect')
def detect():
    """Streams ASL detection results via SSE."""
    logger.info("Client connected to /detect stream.")
    # Use stream_with_context for proper handling in Flask
    return Response(stream_with_context(generate_detections()), mimetype='text/event-stream')

@app.route('/video_feed')
def video_feed():
    """Streams video frames with landmarks."""
    logger.info("Client connected to /video_feed stream.")
    return Response(generate_video_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

# --- Cleanup Function ---
@app.route('/shutdown', methods=['POST']) # Optional: A way to trigger cleanup
def shutdown():
    logger.info("Shutdown request received. Releasing resources.")
    release_camera()
    # In a real deployment, you'd use a proper server shutdown mechanism (like gunicorn signals)
    # This is a simple example.
    # You might need to signal the running generators to stop too.
    return "Shutting down..."


# --- Main Execution ---
if __name__ == '__main__':
    # Initialize shared resources ONCE before starting the Flask app
    if not initialize_resources():
         logger.critical("Failed to initialize critical resources (Model/Labels/MediaPipe). Exiting.")
         exit(1)

    # Camera is initialized on demand by the generators

    # Use host='0.0.0.0' to make it accessible on the network
    # Use debug=False for production/stability. Use debug=True for development ONLY.
    # Use threaded=True to handle concurrent requests (video + detection)
    # Consider using a production-ready WSGI server like gunicorn or waitress instead of Flask's dev server.
    logger.info("Starting Flask application...")
    app.run(host='0.0.0.0', port=5002, debug=False, threaded=True)

    # Cleanup when the app stops (this might not always run cleanly on Ctrl+C)
    logger.info("Flask application stopped. Releasing resources...")
    release_camera() # Attempt final cleanup
    if hands:
        hands.close()
    logger.info("Cleanup complete.")