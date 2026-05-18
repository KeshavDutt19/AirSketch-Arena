import { useCallback, useEffect, useRef, useState } from "react";

const shapeTools = new Set(["line", "rectangle", "circle", "triangle", "arrow", "star", "diamond", "oval", "pentagon", "hexagon"]);

function withPaint(ctx, item, paint) {
  ctx.save();
  ctx.globalCompositeOperation = item.mode === "erase" ? "destination-out" : "source-over";
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  paint();
  ctx.restore();
}

function drawStroke(ctx, stroke) {
  if (!stroke.points?.length) return;
  withPaint(ctx, stroke, () => {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i += 1) {
      const prev = stroke.points[i - 1];
      const point = stroke.points[i];
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + point.x) / 2, (prev.y + point.y) / 2);
    }
    ctx.stroke();
  });
}

function polygonPoints(cx, cy, radiusX, radiusY, sides, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index * Math.PI * 2) / sides;
    return { x: cx + Math.cos(angle) * radiusX, y: cy + Math.sin(angle) * radiusY };
  });
}

function drawPath(ctx, points, close = true) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  if (close) ctx.closePath();
  ctx.stroke();
}

function drawShape(ctx, shape) {
  if (!shape.start || !shape.end) return;
  const { start, end, shape: type } = shape;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2;

  withPaint(ctx, shape, () => {
    if (type === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      return;
    }
    if (type === "rectangle") {
      ctx.strokeRect(x, y, width, height);
      return;
    }
    if (type === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(width, height) / 2, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (type === "oval") {
      ctx.beginPath();
      ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (type === "triangle") {
      drawPath(ctx, [{ x: cx, y }, { x: end.x, y: end.y }, { x: start.x, y: end.y }]);
      return;
    }
    if (type === "diamond") {
      drawPath(ctx, [{ x: cx, y }, { x: end.x, y: cy }, { x: cx, y: end.y }, { x: start.x, y: cy }]);
      return;
    }
    if (type === "pentagon") {
      drawPath(ctx, polygonPoints(cx, cy, width / 2, height / 2, 5));
      return;
    }
    if (type === "hexagon") {
      drawPath(ctx, polygonPoints(cx, cy, width / 2, height / 2, 6, Math.PI / 6));
      return;
    }
    if (type === "star") {
      const points = [];
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? 1 : 0.45;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        points.push({ x: cx + Math.cos(angle) * (width / 2) * radius, y: cy + Math.sin(angle) * (height / 2) * radius });
      }
      drawPath(ctx, points);
      return;
    }
    if (type === "arrow") {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const head = Math.max(14, shape.size * 3);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(end.x - Math.cos(angle - Math.PI / 6) * head, end.y - Math.sin(angle - Math.PI / 6) * head);
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - Math.cos(angle + Math.PI / 6) * head, end.y - Math.sin(angle + Math.PI / 6) * head);
      ctx.stroke();
    }
  });
}

function renderCanvasItem(ctx, item) {
  if (item.kind === "shape") drawShape(ctx, item);
  else drawStroke(ctx, item);
}

export function useCanvasEngine(onStroke) {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const history = useRef([]);
  const [tool, setTool] = useState({ color: "#57f7ff", size: 8, mode: "draw", shape: "brush" });
  const toolRef = useRef(tool);
  const draft = useRef(null);
  const pendingPoints = useRef([]);
  const lastSentPoint = useRef(null);
  const flushTimer = useRef(null);
  const onStrokeRef = useRef(onStroke);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    onStrokeRef.current = onStroke;
  }, [onStroke]);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, rect.width, rect.height);
    history.current.forEach((item) => renderCanvasItem(ctx, item));
  }, []);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    if (preview) {
      preview.width = canvas.width;
      preview.height = canvas.height;
      preview.getContext("2d").setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    repaint();
  }, [repaint]);

  useEffect(() => {
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [fitCanvas]);

  const clearPreview = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    preview.getContext("2d").clearRect(0, 0, rect.width, rect.height);
  }, []);

  const renderStroke = useCallback((item) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    history.current.push(item);
    if (history.current.length > 5000) history.current.shift();
    renderCanvasItem(canvas.getContext("2d"), item);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    history.current = [];
    const rect = canvas.getBoundingClientRect();
    canvas.getContext("2d").clearRect(0, 0, rect.width, rect.height);
    clearPreview();
  }, [clearPreview]);

  const hydrate = useCallback(
    (items = []) => {
      history.current = items;
      clearPreview();
      requestAnimationFrame(repaint);
    },
    [clearPreview, repaint]
  );

  const pointFromEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const drawShapePreview = useCallback(
    (shape) => {
      const preview = previewRef.current;
      if (!preview) return;
      clearPreview();
      const ctx = preview.getContext("2d");
      ctx.setLineDash([6, 5]);
      drawShape(ctx, shape);
      ctx.setLineDash([]);
    },
    [clearPreview]
  );

  const begin = useCallback((point, toolOverride = null) => {
    const current = { ...toolRef.current, ...toolOverride };
    const shapeMode = shapeTools.has(current.shape);
    draft.current = shapeMode
      ? { id: crypto.randomUUID(), kind: "shape", ...current, start: point, end: point }
      : { id: crypto.randomUUID(), kind: "stroke", ...current, points: [point] };
    pendingPoints.current = [point];
    lastSentPoint.current = point;
    if (shapeMode) drawShapePreview(draft.current);
  }, [drawShapePreview]);

  const flushStroke = useCallback(() => {
    if (!draft.current || draft.current.kind === "shape" || pendingPoints.current.length < 2) return;
    const points = [lastSentPoint.current, ...pendingPoints.current.slice(1)].filter(Boolean);
    pendingPoints.current = [points[points.length - 1]];
    lastSentPoint.current = points[points.length - 1];
    onStrokeRef.current?.({ ...draft.current, points });
  }, []);

  const move = useCallback(
    (point) => {
      if (!draft.current) return;
      if (draft.current.kind === "shape") {
        draft.current.end = point;
        drawShapePreview(draft.current);
        return;
      }
      const last = draft.current.points[draft.current.points.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) < 1.8) return;
      draft.current.points.push(point);
      const delta = { ...draft.current, points: draft.current.points.slice(-3) };
      renderCanvasItem(canvasRef.current.getContext("2d"), delta);
      pendingPoints.current.push(point);
      if (pendingPoints.current.length >= 7) {
        flushStroke();
      } else if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => {
          flushTimer.current = null;
          flushStroke();
        }, 33);
      }
    },
    [drawShapePreview, flushStroke]
  );

  const end = useCallback(() => {
    if (!draft.current) return;
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    if (draft.current.kind === "shape") {
      clearPreview();
      const shape = { ...draft.current };
      renderStroke(shape);
      onStrokeRef.current?.(shape);
    } else {
      flushStroke();
    }
    draft.current = null;
    pendingPoints.current = [];
    lastSentPoint.current = null;
  }, [clearPreview, flushStroke, renderStroke]);

  useEffect(() => () => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
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

  return { canvasRef, previewRef, tool, setTool, begin, move, end, renderStroke, clear, hydrate, pointerHandlers };
}
