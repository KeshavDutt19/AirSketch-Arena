import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, LogIn, Plus, Wifi, WifiOff, Wand2 } from "lucide-react";
import { GlassPanel } from "./GlassPanel.jsx";
import { api } from "../api.js";

export function Lobby({ user, socket, socketStatus, initialCode = "", onRoom, onUserChange }) {
  const [username, setUsername] = useState(user?.username || "");
  const [code, setCode] = useState(initialCode);
  const [theme, setTheme] = useState("future arcade");
  const [wordTheme, setWordTheme] = useState("all");
  const [difficulty, setDifficulty] = useState("medium");
  const [words, setWords] = useState(["cyber dragon", "moon base", "portal"]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  useEffect(() => {
    setUsername(user?.username || "");
  }, [user?.username]);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  function updateName(value) {
    setUsername(value);
    const nextUser = onUserChange?.(value) || { ...user, username: value.trim() };
    socket.emit("profile:update", { profile: nextUser });
  }

  function activeProfile() {
    const clean = username.trim() || "Guest";
    const nextUser = onUserChange?.(clean) || { ...user, username: clean };
    socket.emit("profile:update", { profile: nextUser });
    return nextUser;
  }

  async function createRoom() {
    console.log("Create Room clicked");
    setError("");
    if (!socket?.connected) {
      setError("Socket is not connected yet. Wait for the status to turn connected, then try again.");
      return;
    }
    const profile = activeProfile();
    setLoading("create");
    console.log("Emitting room:create");
    socket.timeout(8000).emit("room:create", {
      settings: {
        wordPack: wordTheme === "custom" ? words : [],
        wordTheme,
        difficulty
      },
      profile
    }, (err, res) => {
      setLoading("");
      if (err) {
        setError("Room creation timed out. Check the backend console for socket errors.");
        return;
      }
      if (res?.ok) {
        console.log("Room creation success:", res.room);
        console.log("Navigating to room:", res.room.code);
        onRoom(res.room);
      } else {
        setError(res?.error || "Could not create room.");
      }
    });
  }

  function joinRoom(spectator = false) {
    console.log("Join Room clicked:", code, spectator ? "spectator" : "player");
    setError("");
    if (!socket?.connected) {
      setError("Socket is not connected yet. Wait for the status to turn connected, then try again.");
      return;
    }
    if (!code.trim()) {
      setError("Enter a room code first.");
      return;
    }
    const profile = activeProfile();
    setLoading(spectator ? "spectate" : "join");
    console.log("Emitting room:join");
    socket.timeout(8000).emit("room:join", { code, spectator, profile }, (err, res) => {
      setLoading("");
      if (err) {
        setError("Join timed out. Check the room code and backend socket logs.");
        return;
      }
      if (res?.ok) {
        console.log("Room joined:", res.room);
        onRoom(res.room);
      } else {
        setError(res?.error || "Could not join room.");
      }
    });
  }

  async function generateWords() {
    try {
      setError("");
      setLoading("words");
      const data = await api("/api/ai/word-theme", { method: "POST", body: JSON.stringify({ theme }) });
      setWords(data.words);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="min-h-screen bg-void p-4 text-white md:p-8">
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[1.1fr_.9fr]">
        <div className="md:col-span-2 flex items-center justify-between border border-white/10 bg-panel p-3 text-sm text-slate-300 backdrop-blur-xl">
          <span className="font-bold text-white">AirSketch Arena Lobby</span>
          <span className={`inline-flex items-center gap-2 capitalize ${socketStatus === "connected" ? "text-limepop" : "text-magenta"}`}>
            {socketStatus === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}
            {socketStatus}
          </span>
        </div>
        <GlassPanel className="p-6">
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-black">Create Lobby</motion.h2>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              Pilot name
              <input value={username} onChange={(e) => updateName(e.target.value)} placeholder="Your display name" className="bg-white/5 p-3 text-white outline-none ring-1 ring-white/10 focus:ring-cyanpop" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Word theme
              <select value={wordTheme} onChange={(e) => setWordTheme(e.target.value)} className="bg-white/5 p-3 text-white outline-none ring-1 ring-white/10 focus:ring-cyanpop">
                <option className="bg-void" value="all">Random All</option>
                <option className="bg-void" value="fruits">Only Fruits</option>
                <option className="bg-void" value="animals">Only Animals</option>
                <option className="bg-void" value="cars">Only Cars</option>
                <option className="bg-void" value="car-logos">Car Logos</option>
                <option className="bg-void" value="sports">Only Sports</option>
                <option className="bg-void" value="movies">Movies</option>
                <option className="bg-void" value="cartoons">Cartoons and Anime</option>
                <option className="bg-void" value="brands">Famous Brands</option>
                <option className="bg-void" value="food">Food</option>
                <option className="bg-void" value="technology">Technology</option>
                <option className="bg-void" value="games">Games</option>
                <option className="bg-void" value="superheroes">Superheroes</option>
                <option className="bg-void" value="nature">Nature</option>
                <option className="bg-void" value="places">Places</option>
                <option className="bg-void" value="custom">AI Custom Theme</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Difficulty
              <div className="grid grid-cols-3 gap-2">
                {["easy", "medium", "hard"].map((level) => (
                  <button key={level} onClick={() => setDifficulty(level)} className={`p-3 font-bold capitalize ${difficulty === level ? "bg-cyanpop text-void" : "bg-white/5 text-white"}`}>
                    {level}
                  </button>
                ))}
              </div>
            </label>
            <label className={`grid gap-2 text-sm text-slate-300 ${wordTheme !== "custom" ? "opacity-50" : ""}`}>
              AI custom words
              <div className="flex gap-2">
                <input disabled={wordTheme !== "custom"} value={theme} onChange={(e) => setTheme(e.target.value)} className="min-w-0 flex-1 bg-white/5 p-3 text-white outline-none ring-1 ring-white/10 focus:ring-cyanpop disabled:cursor-not-allowed" />
                <button disabled={loading === "words" || wordTheme !== "custom"} onClick={generateWords} className="bg-magenta px-4 text-white shadow-hot disabled:opacity-60"><Wand2 /></button>
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              {words.map((word) => <span key={word} className="border border-cyanpop/30 bg-cyanpop/10 px-3 py-2 text-cyanpop">{word}</span>)}
            </div>
            <button disabled={loading === "create"} onClick={createRoom} className="inline-flex items-center justify-center gap-2 bg-cyanpop p-4 font-bold text-void disabled:opacity-60">
              <Plus /> {loading === "create" ? "Creating..." : "Create Room"}
            </button>
          </div>
        </GlassPanel>
        <GlassPanel className="p-6">
          <h2 className="text-3xl font-black">Join Room</h2>
          <div className="mt-6 grid gap-4">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" className="bg-white/5 p-4 text-2xl font-black tracking-[.2em] text-white outline-none ring-1 ring-white/10 focus:ring-cyanpop" />
            <button disabled={loading === "join"} onClick={() => joinRoom(false)} className="inline-flex items-center justify-center gap-2 bg-cyanpop p-4 font-bold text-void disabled:opacity-60"><LogIn /> {loading === "join" ? "Joining..." : "Join as Player"}</button>
            <button disabled={loading === "spectate"} onClick={() => joinRoom(true)} className="inline-flex items-center justify-center gap-2 border border-white/15 p-4 font-bold text-white disabled:opacity-60"><Copy /> {loading === "spectate" ? "Opening..." : "Spectate"}</button>
          </div>
          {error && <p className="mt-4 text-magenta">{error}</p>}
        </GlassPanel>
      </div>
    </main>
  );
}
