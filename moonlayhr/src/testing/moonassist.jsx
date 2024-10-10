import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Alert } from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./moonassist.css";

const Moonassist = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null); // Store audio blob here
  const [showModal, setShowModal] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  const [showWarning, setShowWarning] = useState(false); // For showing warning if name is empty
  const [transcript, setTranscript] = useState(""); // Store the transcript
  const [audioUrl, setAudioUrl] = useState(null); // Store the audio URL
  const [controlsVisible, setControlsVisible] = useState(true); // Control visibility of record controls
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const audioBlobRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      drawVisualizer();
    }
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const micSource = audioContext.createMediaStreamSource(micStream);
      const destination = audioContext.createMediaStreamDestination();

      micSource.connect(destination);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      micSource.connect(analyser);
      analyser.connect(destination);

      const combinedStream = destination.stream;

      mediaRecorderRef.current = new MediaRecorder(combinedStream);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.start();

      setIsRecording(true);
      setControlsVisible(true); // Show controls when starting to record
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      drawVisualizer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      resetVisualizer(); // Reset visualizer when stopping recording
      handleUploadToLocal(); // Handle upload to local storage
      setControlsVisible(false); // Hide controls after stopping recording
      setShowModal(true); // Show modal to save the recording
    }
  };

  const resetVisualizer = () => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  };

  const handleDataAvailable = async (event) => {
    if (event.data.size > 0) {
      const newAudioBlob = new Blob([event.data], { type: "audio/webm" });
      setAudioBlob(newAudioBlob); // Save the new blob
      setAudioUrl(URL.createObjectURL(newAudioBlob)); // Create URL for playback
    }
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const analyser = analyserRef.current;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const middleY = HEIGHT / 2;

    const drawInitialLine = () => {
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.fillStyle = "rgb(0, 0, 0)";
      canvasCtx.fillRect(0, middleY - 1, WIDTH, 2);
    };

    drawInitialLine();

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        canvasCtx.fillStyle = `rgb(0, 0, 255)`;

        canvasCtx.fillRect(x, middleY - barHeight, barWidth, barHeight); // Upwards
        canvasCtx.fillRect(x, middleY, barWidth, barHeight); // Downwards

        x += barWidth + 1;
      }
    };

    draw();
  };

  useEffect(() => {
    audioBlobRef.current = audioBlob;
  }, [audioBlob]);

  const handleUploadToDrive = async () => {
    if (!applicantName) {
      setShowWarning(true); // Show warning if name is empty
      return;
    }

    if (audioBlob && applicantName) {
      const formData = new FormData();
      formData.append("file", audioBlob, `${applicantName}.wav`);

      try {
        const response = await axios.post(
          "http://localhost:5000/upload-audio-drive",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        console.log(response.data);
      } catch (error) {
        console.error("Error uploading audio:", error);
      }
    }

    setShowModal(false);
    setShowWarning(false); // Reset warning after successful submission
    setControlsVisible(true); // Show recording controls again after saving
  };

  const handleUploadToLocal = async () => {
    const currentAudioBlob = audioBlobRef.current;
    if (currentAudioBlob) {
      const formData = new FormData();
      formData.append("file", currentAudioBlob, "recording.wav");

      try {
        const response = await axios.post(
          "http://localhost:5000/upload-audio", // Adjust to your upload endpoint
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        console.log(response.data);
        // setShowModal(false); // Close modal after saving
      } catch (error) {
        console.error("Error uploading audio:", error);
      }
    }
  };

  const handleCancelRecording = () => {
    // Clean up the recording and reset everything
    setAudioBlob(null);
    setApplicantName("");
    resetVisualizer();
    setShowModal(false);
    setIsRecording(false);
    setControlsVisible(true); // Show recording controls again after cancellation
  };

  const handleModal = () => {
    setShowModal(true);
  };

  const handleTranscriptGeneration = async () => {
    try {
      // Send a POST request to the backend to trigger the transcription process
      const response = await axios.post("http://localhost:5000/generate-transcript");

      if (response.status === 200) {
        // Set the transcript state with the returned transcription
        setTranscript(response.data.transcription);
      } else {
        console.error("Failed to generate transcript: ", response.data.error);
      }
    } catch (error) {
      console.error("Error generating transcript: ", error);
    }
  };

  return (
    <div className="grid-container">
      <div className="grid-box">
        {/* Display the transcript text if available */}
        {transcript && <p className="transcript-text">{transcript}</p>}
        <button className="transcript-btn" onClick={handleTranscriptGeneration}>
          Generate Transcript
        </button>
      </div>
      <div className="grid-box"></div>
      <div className="grid-right-box">
        {controlsVisible && isRecording ? (
          <div className="record-btn-container">
            {isPaused ? (
              <button className="record-btn" onClick={resumeRecording}>
                <i className="fas fa-play"></i>
              </button>
            ) : (
              <button className="record-btn" onClick={pauseRecording}>
                <i className="fas fa-pause"></i>
              </button>
            )}
            <button className="record-btn" onClick={stopRecording}>
              <i className="fas fa-stop"></i>
            </button>
          </div>
        ) : (
          <button className="record-btn" onClick={startRecording}>
            <i className="fas fa-microphone"></i>
          </button>
        )}
        <canvas ref={canvasRef} width="400" height="100"></canvas>
      </div>

      {/* Modal for saving the recording */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Save Recording</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="modal-content">
            <label>
              Applicant Name:
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
              />
            </label>
            {showWarning && (
              <Alert variant="warning" onClose={() => setShowWarning(false)} dismissible>
                Please provide an applicant name.
              </Alert>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelRecording}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUploadToDrive}>
            Save to Drive
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Moonassist;
