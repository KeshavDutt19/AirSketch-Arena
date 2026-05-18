import {
  Brush,
  Circle,
  Diamond,
  Eraser,
  Eye,
  Hand,
  Hexagon,
  MousePointer2,
  MoveUpRight,
  Pentagon,
  Slash,
  Square,
  Star,
  Trash2,
  Triangle,
  Undo2
} from "lucide-react";

const colors = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#2563eb",
  "#22c55e",
  "#facc15",
  "#f97316",
  "#7c3aed",
  "#ff4ecd",
  "#57f7ff"
];

const shapes = [
  { id: "line", label: "Line", icon: Slash },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "arrow", label: "Arrow", icon: MoveUpRight },
  { id: "star", label: "Star", icon: Star },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "oval", label: "Oval", icon: Circle },
  { id: "pentagon", label: "Pentagon", icon: Pentagon },
  { id: "hexagon", label: "Hexagon", icon: Hexagon }
];

function toolButton(active, className = "") {
  return `p-3 transition hover:bg-white/10 ${active ? "bg-cyanpop text-void shadow-neon" : "bg-white/5 text-white"} ${className}`;
}

export function ToolBar({ tool, setTool, airMode, setAirMode, showLandmarks, setShowLandmarks, onUndo, onClear }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border border-white/10 bg-panel p-3 backdrop-blur-xl">
      <div className="flex gap-2">
        <button title="Mouse mode" onClick={() => setAirMode(false)} className={toolButton(!airMode)}><MousePointer2 /></button>
        <button title="Air draw mode" onClick={() => setAirMode(true)} className={toolButton(airMode)}><Hand /></button>
      </div>

      <div className="flex gap-2">
        <button title="Brush" onClick={() => setTool({ ...tool, mode: "draw", shape: "brush" })} className={toolButton(tool.mode === "draw" && tool.shape === "brush")}><Brush /></button>
        <button title="Eraser" onClick={() => setTool({ ...tool, mode: "erase", shape: "brush" })} className={toolButton(tool.mode === "erase")}><Eraser /></button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {colors.map((color) => (
          <button
            key={color}
            title={color}
            onClick={() => setTool({ ...tool, color, mode: tool.mode === "erase" ? "draw" : tool.mode })}
            className="h-9 w-9 border transition hover:scale-105"
            style={{
              background: color,
              borderColor: tool.color === color ? "#ffffff" : "rgba(255,255,255,.2)",
              boxShadow: tool.color === color ? `0 0 0 2px #070912, 0 0 0 4px ${color}, 0 0 20px ${color}` : "none"
            }}
          />
        ))}
        <label className="relative h-9 w-9 overflow-hidden border border-white/20 bg-white/5">
          <input
            title="Custom color"
            type="color"
            value={tool.color}
            onChange={(event) => setTool({ ...tool, color: event.target.value, mode: tool.mode === "erase" ? "draw" : tool.mode })}
            className="absolute -inset-2 h-14 w-14 cursor-pointer opacity-0"
          />
          <span className="grid h-full w-full place-items-center text-xs font-black" style={{ color: tool.color }}>+</span>
        </label>
      </div>

      <div className="flex max-w-full flex-wrap justify-center gap-1 border-l border-white/10 pl-3">
        {shapes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => setTool({ ...tool, mode: "draw", shape: id })}
            className={toolButton(tool.shape === id, "p-2")}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      <input title="Brush size" type="range" min="2" max="32" value={tool.size} onChange={(e) => setTool({ ...tool, size: Number(e.target.value) })} />
      <span className="w-8 text-center text-xs text-slate-300">{tool.size}</span>
      <button title="Landmark overlay" onClick={() => setShowLandmarks(!showLandmarks)} className={toolButton(showLandmarks)}><Eye /></button>
      <button title="Undo" onClick={onUndo} className="bg-white/5 p-3 transition hover:bg-white/10"><Undo2 /></button>
      <button title="Clear" onClick={onClear} className="bg-white/5 p-3 text-magenta transition hover:bg-white/10"><Trash2 /></button>
    </div>
  );
}
