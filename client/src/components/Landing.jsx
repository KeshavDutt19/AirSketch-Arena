import { motion } from "framer-motion";
import { Gamepad2, Hand, RadioTower, Sparkles, Users } from "lucide-react";

const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 19) % 88)}%`,
  top: `${12 + ((index * 23) % 78)}%`,
  delay: `${(index % 6) * 0.42}s`,
  duration: `${4.2 + (index % 5) * 0.55}s`
}));

const blocks = [
  "left-[8%] top-[18%] h-10 w-10 bg-cyanpop/20 animate-float",
  "left-[18%] bottom-[16%] h-6 w-6 bg-magenta/25 animate-float-reverse",
  "right-[12%] top-[20%] h-12 w-12 bg-limepop/15 animate-float-reverse",
  "right-[22%] bottom-[18%] h-8 w-8 bg-cyanpop/20 animate-float",
  "left-[46%] top-[10%] h-5 w-5 bg-white/10 animate-float"
];

export function Landing({ onPlay }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,9,18,.98),rgba(9,18,39,.92)_46%,rgba(17,8,32,.94))]" />
      <div className="hero-grid absolute -inset-20 animate-grid-drift opacity-80" />
      <div className="scanline pointer-events-none absolute inset-0 opacity-20" />
      <div className="absolute inset-x-0 top-0 h-64 animate-soft-zoom bg-[linear-gradient(90deg,transparent,rgba(87,247,255,.18),rgba(124,92,255,.16),rgba(255,78,205,.14),transparent)] blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(90deg,rgba(87,247,255,.16),transparent,rgba(255,78,205,.14))] blur-3xl" />

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute h-1.5 w-1.5 animate-particle-rise bg-cyanpop/70 shadow-neon"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration: particle.duration
          }}
        />
      ))}

      {blocks.map((block) => (
        <span key={block} className={`pixel-block absolute hidden border border-white/10 md:block ${block}`} />
      ))}

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_420px]">
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl pt-10 lg:pt-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 inline-flex items-center gap-2 border border-cyanpop/35 bg-cyanpop/10 px-3 py-2 font-pixel text-xs uppercase tracking-[.24em] text-cyanpop shadow-neon backdrop-blur"
          >
            <Sparkles size={16} /> AI gesture drawing arena
          </motion.div>

          <div className="relative">
            <h1
              data-text="AirSketch Arena"
              className="arcade-title relative max-w-5xl animate-arena-shake font-arcade text-5xl font-black sm:text-7xl md:text-8xl lg:text-9xl"
            >
              AirSketch Arena
            </h1>
            <div className="absolute -bottom-3 left-1 h-1 w-56 animate-neon-flicker bg-gradient-to-r from-cyanpop via-[#7c5cff] to-magenta shadow-arcade" />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-8 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg"
          >
            Draw with your mouse or pinch your fingers in the air while friends race to guess live. Fast rooms, glowing canvases, and arcade chaos built for real multiplayer nights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <motion.button
              onClick={onPlay}
              whileHover={{ scale: 1.045, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="arcade-button inline-flex items-center justify-center gap-3 bg-cyanpop px-7 py-4 font-pixel text-sm font-black uppercase tracking-[.18em] text-void shadow-arcade transition"
            >
              <Gamepad2 /> Enter Arena
            </motion.button>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 sm:min-w-80">
              <span className="border border-white/10 bg-white/5 px-3 py-2"><Users className="mr-1 inline text-cyanpop" size={14} /> Rooms</span>
              <span className="border border-white/10 bg-white/5 px-3 py-2"><Hand className="mr-1 inline text-magenta" size={14} /> Air Draw</span>
              <span className="border border-white/10 bg-white/5 px-3 py-2"><RadioTower className="mr-1 inline text-limepop" size={14} /> Live</span>
            </div>
          </motion.div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="relative hidden lg:block"
        >
          <div className="absolute -inset-6 animate-glow-pulse border border-cyanpop/20 bg-cyanpop/5 blur-xl" />
          <div className="relative border border-white/10 bg-panel p-5 shadow-arcade backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between font-pixel text-xs uppercase tracking-[.2em] text-cyanpop">
              <span>Live Canvas</span>
              <span className="animate-neon-flicker text-limepop">Online</span>
            </div>
            <div className="relative aspect-square overflow-hidden border border-cyanpop/20 bg-[#f9fbff]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 320" role="img" aria-label="Neon drawing preview">
                <path d="M52 210 C80 118, 148 78, 238 94 C272 101, 286 130, 266 154 C235 190, 167 137, 132 179 C107 209, 136 239, 189 232" fill="none" stroke="#57f7ff" strokeLinecap="round" strokeWidth="10" />
                <path d="M76 228 C118 268, 230 270, 272 214" fill="none" stroke="#ff4ecd" strokeLinecap="round" strokeWidth="8" />
                <circle cx="106" cy="123" r="10" fill="#7c5cff" />
                <circle cx="231" cy="124" r="10" fill="#7c5cff" />
              </svg>
              <div className="absolute inset-x-5 bottom-5 border border-void/10 bg-void/85 p-3 font-pixel text-xs text-cyanpop">
                PINCH DETECTED - STROKE SYNC
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </main>
  );
}
