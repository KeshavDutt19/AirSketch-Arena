import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function pinchDistance(hand) {
  const index = hand[8];
  const thumb = hand[4];
  return Math.hypot(index.x - thumb.x, index.y - thumb.y);
}

export function useHandTracking({ enabled, canvasRef, onBegin, onMove, onEnd }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const landmarker = useRef(null);
  const raf = useRef(null);
  const drawing = useRef(false);
  const smoothed = useRef(null);
  const [status, setStatus] = useState("idle");
  const [showLandmarks, setShowLandmarks] = useState(true);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
    drawing.current = false;
    onEnd?.();
    setStatus("idle");
  }, [onEnd]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return undefined;
    }
    let cancelled = false;
    async function boot() {
      try {
        setStatus("loading model");
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm");
        landmarker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (cancelled) return;
        setStatus("requesting camera");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 30 } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("tracking");
        loop();
      } catch (error) {
        setStatus(error.message);
      }
    }

    function loop() {
      if (!videoRef.current || !landmarker.current) return;
      const result = landmarker.current.detectForVideo(videoRef.current, performance.now());
      const hand = result.landmarks?.[0];
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (overlay && canvas) {
        overlay.width = overlay.clientWidth;
        overlay.height = overlay.clientHeight;
        const ctx = overlay.getContext("2d");
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        if (showLandmarks && hand) {
          ctx.fillStyle = "rgba(87,247,255,.9)";
          hand.forEach((p) => {
            ctx.beginPath();
            ctx.arc((1 - p.x) * overlay.width, p.y * overlay.height, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
      if (hand && canvas) {
        const rect = canvas.getBoundingClientRect();
        const raw = { x: (1 - hand[8].x) * rect.width, y: hand[8].y * rect.height };
        const last = smoothed.current || raw;
        const point = { x: last.x * 0.68 + raw.x * 0.32, y: last.y * 0.68 + raw.y * 0.32 };
        smoothed.current = point;
        const pinching = pinchDistance(hand) < 0.06;
        if (pinching && !drawing.current) {
          drawing.current = true;
          onBegin?.(point);
        } else if (pinching && drawing.current) {
          onMove?.(point);
        } else if (!pinching && drawing.current) {
          drawing.current = false;
          onEnd?.();
        }
      }
      raf.current = requestAnimationFrame(loop);
    }

    boot();
    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, canvasRef, onBegin, onEnd, onMove, showLandmarks, stop]);

  return { videoRef, overlayRef, status, showLandmarks, setShowLandmarks, stop };
}
