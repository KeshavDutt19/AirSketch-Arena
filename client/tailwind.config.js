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
        hot: "0 0 26px rgba(255, 78, 205, 0.32)"
      }
    }
  },
  plugins: []
};
