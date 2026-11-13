import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Paper, CircularProgress, Alert, LinearProgress } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import { useMutation } from "@tanstack/react-query";
import { speakingApi, SpeakingPrompt } from "../../api/speaking.api";

type Phase = "ready" | "requesting-permission" | "prep" | "recording" | "uploading" | "done" | "error";

export function SpeakingTestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // The prompt is passed in via router state from whichever screen lists
  // available Speaking questions -- e.g.
  // navigate("/speaking/test", { state: { prompt } }) -- avoiding the need
  // for a separate get-by-id endpoint in this first framework pass.
  const prompt = (location.state as { prompt?: SpeakingPrompt } | null)?.prompt;

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordSecondsRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speakingResult, setSpeakingResult] = useState<import("../../api/speaking.api").SpeakingSubmission | null>(null);

  const submitMutation = useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration: number }) =>
      speakingApi.submitRecording(prompt!.id, blob, "video", duration),
  });

  useEffect(() => {
    return () => {
      // Cleanup: stop camera/mic on unmount so the light stays off when leaving the page.
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = (stream: MediaStream, totalSeconds: number) => {
    chunksRef.current = [];
    recordSecondsRef.current = totalSeconds;
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setPhase("uploading");
      try {
        const submitted = await submitMutation.mutateAsync({ blob, duration: recordSecondsRef.current });
        setSpeakingResult(submitted);
        setPhase("done");
      } catch {
        setErrorMsg("Could not submit your recording. Please try again.");
        setPhase("error");
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    recorderRef.current = recorder;
    recorder.start();
    setPhase("recording");
    setSecondsLeft(totalSeconds);

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          recorder.stop();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleStart = async () => {
    if (!prompt) return;
    setPhase("requesting-permission");
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Camera+mic granted -- recording and the timer start together, the
      // moment the stream is ready, with no separate manual step.
      if (prompt.prepTimeSeconds && prompt.prepTimeSeconds > 0) {
        setPhase("prep");
        setSecondsLeft(prompt.prepTimeSeconds);
        timerRef.current = setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              startRecording(stream, prompt.speakTimeSeconds);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      } else {
        startRecording(stream, prompt.speakTimeSeconds);
      }
    } catch {
      setErrorMsg("Camera/microphone access was denied or unavailable. Please allow access and try again.");
      setPhase("error");
    }
  };

  const handleEndEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  if (!prompt) {
    return (
      <Box sx={{ maxWidth: 700, mx: "auto", textAlign: "center", py: 8 }}>
        <Alert severity="warning">No prompt selected. Please go back and choose a Speaking question first.</Alert>
      </Box>
    );
  }

  const totalForBar = phase === "prep" ? prompt.prepTimeSeconds || 1 : prompt.speakTimeSeconds;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Speaking — Part {prompt.part}
      </Typography>
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {prompt.title}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {prompt.promptText}
        </Typography>
      </Paper>

      {phase === "ready" && (
        <Button variant="contained" size="large" fullWidth startIcon={<MicIcon />} onClick={handleStart}>
          Start Speaking Test
        </Button>
      )}

      {phase === "requesting-permission" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Waiting for camera and microphone permission...</Typography>
        </Box>
      )}

      {(phase === "prep" || phase === "recording") && (
        <Box>
          <video ref={videoRef} autoPlay muted style={{ width: "100%", borderRadius: 12, background: "#000" }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {phase === "prep" ? "Preparation time" : "Recording"} — {secondsLeft}s left
            </Typography>
            <LinearProgress
              variant="determinate"
              value={((totalForBar - secondsLeft) / totalForBar) * 100}
              color={phase === "recording" ? "error" : "primary"}
            />
          </Box>
          {phase === "recording" && (
            <Button variant="outlined" color="error" fullWidth sx={{ mt: 2 }} onClick={handleEndEarly}>
              End Recording Now
            </Button>
          )}
        </Box>
      )}

      {phase === "uploading" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Saving your recording...</Typography>
        </Box>
      )}

      {phase === "done" && (
        <Alert severity="success">
          {speakingResult?.status === "GRADED" && speakingResult.overallBand != null ? (
            <>Your Speaking band score: <strong>{speakingResult.overallBand}</strong></>
          ) : (
            "Recording submitted successfully. It's currently pending grading."
          )}
          <Button sx={{ ml: 2 }} size="small" onClick={() => navigate(-1)}>
            Back
          </Button>
        </Alert>
      )}

      {phase === "error" && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
          <Button sx={{ ml: 2 }} size="small" onClick={() => setPhase("ready")}>
            Try Again
          </Button>
        </Alert>
      )}
    </Box>
  );
}
