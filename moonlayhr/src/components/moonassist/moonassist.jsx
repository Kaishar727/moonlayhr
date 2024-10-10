import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Alert } from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./moonassist.css";
import { MediaRecorder, register } from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";

const Moonassist = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  // Register the WAV encoder
  useEffect(() => {
    const initMediaRecorder = async () => {
      await register(await connect());
    };
    initMediaRecorder();
  }, []);

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

      // Create AudioContext and AnalyserNode
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();

      // Create MediaRecorder with WAV encoder
      mediaRecorderRef.current = new MediaRecorder(micStream, {
        mimeType: "audio/wav",
      });
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;

      // Connect micStream to analyser
      const source = audioContextRef.current.createMediaStreamSource(micStream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;

      mediaRecorderRef.current.start();
      setIsRecording(true);
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
      resetVisualizer();
    }
  };

  const resetVisualizer = () => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleDataAvailable = async (event) => {
    if (event.data.size > 0) {
      const newAudioBlob = new Blob([event.data], { type: "audio/wav" });
      setAudioBlob(newAudioBlob);
      setAudioUrl(URL.createObjectURL(newAudioBlob));
      await handleUploadToLocal(newAudioBlob);
    }
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const analyser = analyserRef.current;

    if (!analyser) return;

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
        canvasCtx.fillRect(x, middleY - barHeight, barWidth, barHeight);
        canvasCtx.fillRect(x, middleY, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const handleUploadToDrive = async () => {
    if (!applicantName) {
      setShowWarning(true);
      return;
    }

    if (audioBlob) {
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
        // Reset audio blob and URL after successful upload
        setAudioBlob(null);
        setAudioUrl(null);
      } catch (error) {
        console.error("Error uploading audio:", error);
      }
    }

    setShowModal(false);
    setShowWarning(false);
  };

  const handleUploadToLocal = async (blob) => {
    if (blob) {
      const formData = new FormData();
      formData.append("file", blob, "recording.wav");

      try {
        const response = await axios.post(
          "http://localhost:5000/upload-audio",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        console.log(response.data);
        setShowModal(false);
      } catch (error) {
        console.error("Error uploading audio:", error);
      }
    }
  };

  const handleCancelRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null); // Reset audio URL
    setApplicantName("");
    resetVisualizer();
    setShowModal(false);
    setIsRecording(false);
  };

  const handlemodal = () => {
    setShowModal(true);
  };

  const handleTranscriptGeneration = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/generate-transcript"
      );
      if (response.status === 200) {
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
        {transcript && <p className="transcript-text">{transcript}</p>}
        <button className="transcript-btn" onClick={handleTranscriptGeneration}>
          Generate Transcript
        </button>
      </div>
      <div className="grid-box"></div>
      <div className="grid-right-box">
        {/* Show Save to Drive button only after stopping recording */}
        {!isRecording && audioUrl && (
          <div className="record-btn-container">
            <button className="record-btn" onClick={handlemodal}>
              Save to Drive
            </button>
            <button className="record-btn" onClick={handleCancelRecording}>
              Cancel
            </button>
          </div>
        )}

        {/* Show recording controls while recording */}
        {isRecording && (
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
        )}

        {/* Start recording button */}
        {!isRecording && !audioUrl && (
          <button className="record-btn" onClick={startRecording}>
            <i className="fas fa-microphone"></i>
          </button>
        )}

        <canvas ref={canvasRef} width="500" height="100" className="canvas" />

        {audioUrl && (
          <div>
            <audio controls src={audioUrl}></audio>
          </div>
        )}

        {/* React Bootstrap Modal for uploading audio */}
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Save Recording</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {showWarning && (
              <Alert variant="danger">
                Please enter a name for the applicant.
              </Alert>
            )}
            <input
              type="text"
              placeholder="Applicant Name"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={handleUploadToDrive}>
              Save to Drive
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default Moonassist;
