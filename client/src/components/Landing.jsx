import { motion } from "framer-motion";
import { Sparkles, Gamepad2 } from "lucide-react";

export function Landing({ onPlay }) {
  return (
    <main className="min-h-screen overflow-hidden bg-void text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(87,247,255,.20),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(255,78,205,.16),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 border border-cyanpop/30 bg-cyanpop/10 px-3 py-2 text-sm text-cyanpop">
            <Sparkles size={16} /> AI gesture drawing arena
          </div>
          <h1 className="text-5xl font-black tracking-normal md:text-7xl">AirSketch Arena</h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Draw with your mouse or pinch your fingers in the air through webcam tracking while friends guess live in neon-fast multiplayer rounds.
          </p>
          <button
            onClick={onPlay}
            className="mt-8 inline-flex items-center gap-3 bg-cyanpop px-6 py-4 font-bold text-void shadow-neon transition hover:scale-[1.02]"
          >
            <Gamepad2 /> Enter Arena
          </button>
        </motion.div>
      </div>
    </main>
  );
}
