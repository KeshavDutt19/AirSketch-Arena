export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#070912",
        panel: "rgba(15, 20, 39, 0.72)",
        cyanpop: "#57f7ff",
        magenta: "#ff4ecd",
        limepop: "#b6ff5c"
      },
      boxShadow: {
        neon: "0 0 24px rgba(87, 247, 255, 0.35)",
        hot: "0 0 26px rgba(255, 78, 205, 0.32)",
        arcade: "0 0 18px rgba(87, 247, 255, 0.5), 0 0 48px rgba(255, 78, 205, 0.22)"
      },
      fontFamily: {
        arcade: ["Impact", "\"Arial Black\"", "\"Trebuchet MS\"", "system-ui", "sans-serif"],
        pixel: ["\"Courier New\"", "\"Lucida Console\"", "monospace"]
      },
      keyframes: {
        "arena-shake": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "16%": { transform: "translate3d(-1px, 1px, 0) rotate(-0.15deg)" },
          "33%": { transform: "translate3d(1px, -1px, 0) rotate(0.12deg)" },
          "49%": { transform: "translate3d(-0.5px, -1px, 0) rotate(0.08deg)" },
          "67%": { transform: "translate3d(1px, 0.5px, 0) rotate(-0.1deg)" },
          "84%": { transform: "translate3d(-1px, 0, 0) rotate(0.14deg)" }
        },
        "glow-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 14px rgba(87, 247, 255, 0.65)) drop-shadow(0 0 30px rgba(255, 78, 205, 0.28))" },
          "50%": { filter: "drop-shadow(0 0 22px rgba(87, 247, 255, 0.95)) drop-shadow(0 0 46px rgba(124, 92, 255, 0.45))" }
        },
        "neon-flicker": {
          "0%, 18%, 22%, 25%, 53%, 57%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.72" }
        },
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(0, -18px, 0) rotate(4deg)" }
        },
        "float-reverse": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(0, 16px, 0) rotate(-5deg)" }
        },
        "grid-drift": {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-72px, -72px, 0)" }
        },
        "particle-rise": {
          "0%": { transform: "translateY(24px) scale(0.8)", opacity: "0" },
          "15%": { opacity: "0.85" },
          "100%": { transform: "translateY(-120px) scale(1.15)", opacity: "0" }
        },
        "soft-zoom": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.035)" }
        }
      },
      animation: {
        "arena-shake": "arena-shake 2.4s steps(2, end) infinite",
        "glow-pulse": "glow-pulse 2.8s ease-in-out infinite",
        "neon-flicker": "neon-flicker 5.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-reverse": "float-reverse 7s ease-in-out infinite",
        "grid-drift": "grid-drift 18s linear infinite",
        "particle-rise": "particle-rise 5s linear infinite",
        "soft-zoom": "soft-zoom 11s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
