import { useCallback, useEffect, useRef, useState } from "react";

function drawStroke(ctx, stroke) {
  if (!stroke.points?.length) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.mode === "erase" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i += 1) {
    const prev = stroke.points[i - 1];
    const point = stroke.points[i];
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + point.x) / 2, (prev.y + point.y) / 2);
  }
  ctx.stroke();
  ctx.restore();
}

export function useCanvasEngine(onStroke) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState({ color: "#57f7ff", size: 8, mode: "draw", shape: "brush" });
  const draft = useRef(null);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const image = canvas.toDataURL();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    const ctx = canvas.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = image;
  }, []);

  useEffect(() => {
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [fitCanvas]);

  const renderStroke = useCallback((stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawStroke(canvas.getContext("2d"), stroke);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.getContext("2d").clearRect(0, 0, rect.width, rect.height);
  }, []);

  const hydrate = useCallback(
    (strokes) => {
      clear();
      requestAnimationFrame(() => strokes.forEach(renderStroke));
    },
    [clear, renderStroke]
  );

  const pointFromEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const begin = useCallback(
    (point) => {
      draft.current = { id: crypto.randomUUID(), ...tool, points: [point] };
    },
    [tool]
  );

  const move = useCallback(
    (point) => {
      if (!draft.current) return;
      const last = draft.current.points[draft.current.points.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) < 1.8) return;
      draft.current.points.push(point);
      const delta = { ...draft.current, points: draft.current.points.slice(-3) };
      renderStroke(delta);
      onStroke?.(delta);
    },
    [onStroke, renderStroke]
  );

  const end = useCallback(() => {
    draft.current = null;
  }, []);

  const pointerHandlers = {
    onPointerDown: (event) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      begin(pointFromEvent(event));
    },
    onPointerMove: (event) => move(pointFromEvent(event)),
    onPointerUp: end,
    onPointerLeave: end
  };

  return { canvasRef, tool, setTool, begin, move, end, renderStroke, clear, hydrate, pointerHandlers };
}
