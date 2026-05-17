import { Brush, Eraser, MousePointer2, Hand, Undo2, Trash2, Eye } from "lucide-react";

const colors = ["#57f7ff", "#ff4ecd", "#b6ff5c", "#ffffff", "#ffdd57", "#7c5cff"];

export function ToolBar({ tool, setTool, airMode, setAirMode, showLandmarks, setShowLandmarks, onUndo, onClear }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border border-white/10 bg-panel p-3 backdrop-blur-xl">
      <button title="Mouse mode" onClick={() => setAirMode(false)} className={`p-3 ${!airMode ? "bg-cyanpop text-void" : "bg-white/5"}`}><MousePointer2 /></button>
      <button title="Air draw mode" onClick={() => setAirMode(true)} className={`p-3 ${airMode ? "bg-cyanpop text-void" : "bg-white/5"}`}><Hand /></button>
      <button title="Brush" onClick={() => setTool({ ...tool, mode: "draw" })} className={`p-3 ${tool.mode === "draw" ? "bg-cyanpop text-void" : "bg-white/5"}`}><Brush /></button>
      <button title="Eraser" onClick={() => setTool({ ...tool, mode: "erase" })} className={`p-3 ${tool.mode === "erase" ? "bg-cyanpop text-void" : "bg-white/5"}`}><Eraser /></button>
      <div className="flex gap-1">
        {colors.map((color) => (
          <button key={color} title={color} onClick={() => setTool({ ...tool, color })} className="h-9 w-9 border border-white/20" style={{ background: color, outline: tool.color === color ? "2px solid white" : "none" }} />
        ))}
      </div>
      <input title="Brush size" type="range" min="2" max="32" value={tool.size} onChange={(e) => setTool({ ...tool, size: Number(e.target.value) })} />
      <button title="Landmark overlay" onClick={() => setShowLandmarks(!showLandmarks)} className={`p-3 ${showLandmarks ? "bg-white/15" : "bg-white/5"}`}><Eye /></button>
      <button title="Undo" onClick={onUndo} className="bg-white/5 p-3"><Undo2 /></button>
      <button title="Clear" onClick={onClear} className="bg-white/5 p-3 text-magenta"><Trash2 /></button>
    </div>
  );
}
