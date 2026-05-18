import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm";
const MIN_MOVE_PX = 1.2;
const GESTURE_DEBOUNCE_MS = 90;

function pinchDistance(hand) {
  const index = hand[8];
  const thumb = hand[4];
  return Math.hypot(index.x - thumb.x, index.y - thumb.y);
}

function palmCenter(hand) {
  const anchors = [0, 5, 9, 13, 17].map((index) => hand[index]);
  return {
    x: anchors.reduce((sum, point) => sum + point.x, 0) / anchors.length,
    y: anchors.reduce((sum, point) => sum + point.y, 0) / anchors.length
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function fistConfidence(hand) {
  const palm = palmCenter(hand);
  const fingers = [
    { tip: 8, pip: 6, mcp: 5 },
    { tip: 12, pip: 10, mcp: 9 },
    { tip: 16, pip: 14, mcp: 13 },
    { tip: 20, pip: 18, mcp: 17 }
  ];
  const folded = fingers.filter(({ tip, pip, mcp }) => {
    const tipToPalm = distance(hand[tip], palm);
    const mcpToPalm = Math.max(0.001, distance(hand[mcp], palm));
    const verticalFold = hand[tip].y > hand[pip].y;
    return tipToPalm < mcpToPalm * 1.55 || verticalFold;
  }).length;
  return folded / fingers.length;
}

export function useHandTracking({ enabled, canvasRef, onBegin, onMove, onEnd, color = "#57f7ff", brushSize = 8 }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const landmarker = useRef(null);
  const raf = useRef(null);
  const streamRef = useRef(null);
  const running = useRef(false);
  const drawing = useRef(false);
  const activeGesture = useRef("idle");
  const candidateGesture = useRef({ gesture: "idle", since: 0 });
  const smoothed = useRef(null);
  const lastPoint = useRef(null);
  const lastVideoTime = useRef(-1);
  const callbacks = useRef({ onBegin, onMove, onEnd });
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const showLandmarksRef = useRef(true);
  const [status, setStatus] = useState("idle");
  const [showLandmarks, setShowLandmarksState] = useState(true);

  useEffect(() => {
    callbacks.current = { onBegin, onMove, onEnd };
  }, [onBegin, onMove, onEnd]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  const setShowLandmarks = useCallback((value) => {
    const next = typeof value === "function" ? value(showLandmarksRef.current) : value;
    showLandmarksRef.current = next;
    setShowLandmarksState(next);
  }, []);

  const stop = useCallback(() => {
    running.current = false;
    cancelAnimationFrame(raf.current);
    raf.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    drawing.current = false;
    activeGesture.current = "idle";
    candidateGesture.current = { gesture: "idle", since: 0 };
    smoothed.current = null;
    lastPoint.current = null;
    lastVideoTime.current = -1;
    callbacks.current.onEnd?.();
    landmarker.current?.close?.();
    landmarker.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return undefined;
    }
    if (running.current) return undefined;

    let cancelled = false;

    async function boot() {
      try {
        running.current = true;
        setStatus("loading model");
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        landmarker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5
        });
        if (cancelled) return;
        setStatus("requesting camera");
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 45, max: 60 }
          },
          audio: false
        });
        if (!videoRef.current || cancelled) return;
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        setStatus("tracking");
        raf.current = requestAnimationFrame(loop);
      } catch (error) {
        running.current = false;
        setStatus(error.message);
      }
    }

    function setHandStatus(next) {
      setStatus((current) => (current === next ? current : next));
    }

    function stableGesture(nextGesture) {
      const now = performance.now();
      if (candidateGesture.current.gesture !== nextGesture) {
        candidateGesture.current = { gesture: nextGesture, since: now };
      }
      if (nextGesture === activeGesture.current) return activeGesture.current;
      if (now - candidateGesture.current.since >= GESTURE_DEBOUNCE_MS) return nextGesture;
      return activeGesture.current;
    }

    function applyGesture(nextGesture, point) {
      const previousGesture = activeGesture.current;
      if (nextGesture !== previousGesture) {
        if (drawing.current) {
          callbacks.current.onEnd?.();
          drawing.current = false;
        }
        activeGesture.current = nextGesture;
        lastPoint.current = null;
      }

      if (nextGesture === "idle") {
        if (previousGesture !== "idle") setHandStatus("tracking");
        return;
      }

      const last = lastPoint.current || point;
      const movedEnough = Math.hypot(point.x - last.x, point.y - last.y) >= MIN_MOVE_PX;
      if (!drawing.current) {
        drawing.current = true;
        lastPoint.current = point;
        if (nextGesture === "erase") {
          setHandStatus("Eraser gesture active");
          callbacks.current.onBegin?.(point, {
            mode: "erase",
            shape: "brush",
            size: Math.max(brushSizeRef.current * 1.8, 18),
            color: colorRef.current
          });
        } else {
          setHandStatus("tracking");
          callbacks.current.onBegin?.(point);
        }
      } else if (movedEnough) {
        lastPoint.current = point;
        callbacks.current.onMove?.(point);
      }
    }

    function drawOverlay(hand, canvas, point) {
      const overlay = overlayRef.current;
      if (!overlay || !canvas) return;
      const width = overlay.clientWidth;
      const height = overlay.clientHeight;
      if (overlay.width !== width) overlay.width = width;
      if (overlay.height !== height) overlay.height = height;
      const ctx = overlay.getContext("2d");
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      const erasing = activeGesture.current === "erase";
      ctx.fillStyle = erasing ? "rgba(255,255,255,.9)" : colorRef.current;
      ctx.strokeStyle = erasing ? "rgba(239,68,68,.95)" : colorRef.current;
      ctx.shadowColor = erasing ? "rgba(239,68,68,.95)" : colorRef.current;
      ctx.shadowBlur = 12;
      if (showLandmarksRef.current && hand) {
        for (let i = 0; i < hand.length; i += 1) {
          const p = hand[i];
          ctx.beginPath();
          ctx.arc((1 - p.x) * overlay.width, p.y * overlay.height, i === 8 ? 5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (point && erasing) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.arc(point.x, point.y, Math.max(brushSizeRef.current * 0.9, 14), 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "700 12px system-ui";
        ctx.fillStyle = "rgba(239,68,68,.95)";
        ctx.fillText("ERASE", point.x + 16, point.y - 12);
      }
      ctx.shadowBlur = 0;
    }

    function loop() {
      if (!running.current || !videoRef.current || !landmarker.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        const result = landmarker.current.detectForVideo(video, performance.now());
        const hand = result.landmarks?.[0];
        if (hand && canvas) {
          const rect = canvas.getBoundingClientRect();
          const raw = { x: (1 - hand[8].x) * rect.width, y: hand[8].y * rect.height };
          const previous = smoothed.current || raw;
          const alpha = drawing.current ? 0.58 : 0.42;
          const point = {
            x: previous.x + (raw.x - previous.x) * alpha,
            y: previous.y + (raw.y - previous.y) * alpha
          };
          smoothed.current = point;

          const pinching = pinchDistance(hand) < 0.062;
          const fist = fistConfidence(hand) >= 0.75;
          const gesture = stableGesture(fist && !pinching ? "erase" : pinching ? "draw" : "idle");
          applyGesture(gesture, point);
          drawOverlay(hand, canvas, point);
        } else if (drawing.current) {
          drawing.current = false;
          activeGesture.current = "idle";
          callbacks.current.onEnd?.();
          drawOverlay(hand, canvas, null);
        } else {
          drawOverlay(hand, canvas, null);
        }
      }
      raf.current = requestAnimationFrame(loop);
    }

    boot();
    return () => {
      cancelled = true;
      stop();
    };
  }, [canvasRef, enabled, stop]);

  return { videoRef, overlayRef, status, showLandmarks, setShowLandmarks, stop };
}
