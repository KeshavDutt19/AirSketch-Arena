import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Copy, RadioTower, RotateCcw, Share2, Sparkles, Trophy, Wifi, WifiOff } from "lucide-react";
import { PlayerList } from "./PlayerList.jsx";
import { ChatPanel } from "./ChatPanel.jsx";
import { ToolBar } from "./ToolBar.jsx";
import { GlassPanel } from "./GlassPanel.jsx";
import { useCanvasEngine } from "../hooks/useCanvasEngine.js";
import { useHandTracking } from "../hooks/useHandTracking.js";
import { api } from "../api.js";

export function GameScreen({ room, setRoom, socket, socketStatus, user, onUserChange }) {
  const [messages, setMessages] = useState([]);
  const [secret, setSecret] = useState("");
  const [airMode, setAirMode] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [aiLabels, setAiLabels] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [wordChoices, setWordChoices] = useState([]);
  const [choiceEndsAt, setChoiceEndsAt] = useState(null);
  const [rematch, setRematch] = useState(null);
  const [rematchCountdown, setRematchCountdown] = useState(null);
  const [loadingAction, setLoadingAction] = useState("");
  const isDrawer = room.drawerId === user.id;
  const canDraw = isDrawer && room.status === "playing";
  const inviteUrl = `${window.location.origin}/room/${room.code}`;

  const sendStroke = useCallback((stroke) => {
    socket.emit("canvas:stroke", { code: room.code, stroke });
  }, [room.code, socket]);

  const canvas = useCanvasEngine(canDraw ? sendStroke : null);
  const hand = useHandTracking({
    enabled: airMode && canDraw,
    canvasRef: canvas.canvasRef,
    onBegin: canvas.begin,
    onMove: canvas.move,
    onEnd: canvas.end
  });

  const playSound = useCallback((type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const tones = {
      start: [520, 0.08],
      correct: [820, 0.14],
      countdown: [380, 0.05],
      rematch: [660, 0.16]
    };
    const [frequency, duration] = tones[type] || tones.start;
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.02);
  }, []);

  useEffect(() => {
    const onState = (nextRoom) => setRoom(nextRoom);
    const onMessage = (msg) => setMessages((items) => [...items.slice(-80), msg]);
    const onSecret = ({ word }) => setSecret(word);
    const onChoosing = ({ choiceEndsAt: endsAt }) => {
      setRoundResult(null);
      setWordChoices([]);
      setChoiceEndsAt(endsAt);
      setMessages((items) => [...items, { id: crypto.randomUUID(), username: "Arena", message: "Drawer is choosing a word.", type: "system" }]);
    };
    const onChoices = ({ choices, seconds }) => {
      setWordChoices(choices);
      setChoiceEndsAt(Date.now() + seconds * 1000);
    };
    const onHint = ({ hint, category }) => {
      setMessages((items) => [...items, { id: crypto.randomUUID(), username: "Hint", message: `${category}: ${hint}`, type: "system" }]);
    };
    const onRoundStarted = () => {
      setRoundResult(null);
      setWordChoices([]);
      setChoiceEndsAt(null);
      setSecret("");
      playSound("start");
      setMessages((items) => [...items, { id: crypto.randomUUID(), username: "Arena", message: "New round started.", type: "system" }]);
    };
    const onRoundEnded = (result) => setRoundResult(result);
    const onFinished = (leaderboard) => {
      setRoundResult({ final: true, leaderboard });
      setRematch(null);
    };
    const onCorrect = ({ username, points }) => {
      playSound("correct");
      setMessages((items) => [...items, { id: crypto.randomUUID(), username: "Arena", message: `${username} scored ${points} points.`, type: "guess" }]);
    };
    const onRematchRequest = (payload) => {
      setRematch(payload);
      setRoundResult((current) => current || { final: true, leaderboard: room.players });
    };
    const onRematchAccepted = (payload) => {
      setRematch(payload);
      playSound("rematch");
    };
    const onRematchStart = (payload) => {
      setRematch(payload);
      setRematchCountdown(payload.countdownEndsAt);
      playSound("rematch");
    };
    const onRematchStarted = () => {
      setRoundResult(null);
      setRematch(null);
      setRematchCountdown(null);
      setMessages([]);
    };
    const onReconnect = () => {
      socket.emit("room:join", { code: room.code, profile: user }, (res) => {
        if (res?.ok) setRoom(res.room);
      });
    };
    const onPlayerUpdated = ({ id, username }) => {
      if (id === user.id) onUserChange?.(username);
      setMessages((items) => items.map((message) => (message.userId === id ? { ...message, username } : message)));
    };
    socket.on("room:state", onState);
    socket.on("chat:message", onMessage);
    socket.on("canvas:stroke", canvas.renderStroke);
    socket.on("canvas:clear", canvas.clear);
    socket.on("canvas:hydrate", canvas.hydrate);
    socket.on("round:choosing", onChoosing);
    socket.on("round:word_choices", onChoices);
    socket.on("round:secret", onSecret);
    socket.on("round:hint", onHint);
    socket.on("round:started", onRoundStarted);
    socket.on("round:ended", onRoundEnded);
    socket.on("game:finished", onFinished);
    socket.on("guess:correct", onCorrect);
    socket.on("rematch-request", onRematchRequest);
    socket.on("rematch-accepted", onRematchAccepted);
    socket.on("rematch-start", onRematchStart);
    socket.on("rematch:started", onRematchStarted);
    socket.on("connect", onReconnect);
    socket.on("player:updated", onPlayerUpdated);
    return () => {
      socket.off("room:state", onState);
      socket.off("chat:message", onMessage);
      socket.off("canvas:stroke", canvas.renderStroke);
      socket.off("canvas:clear", canvas.clear);
      socket.off("canvas:hydrate", canvas.hydrate);
      socket.off("round:choosing", onChoosing);
      socket.off("round:word_choices", onChoices);
      socket.off("round:secret", onSecret);
      socket.off("round:hint", onHint);
      socket.off("round:started", onRoundStarted);
      socket.off("round:ended", onRoundEnded);
      socket.off("game:finished", onFinished);
      socket.off("guess:correct", onCorrect);
      socket.off("rematch-request", onRematchRequest);
      socket.off("rematch-accepted", onRematchAccepted);
      socket.off("rematch-start", onRematchStart);
      socket.off("rematch:started", onRematchStarted);
      socket.off("connect", onReconnect);
      socket.off("player:updated", onPlayerUpdated);
    };
  }, [canvas.clear, canvas.hydrate, canvas.renderStroke, onUserChange, playSound, room.code, room.players, setRoom, socket, user]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isDrawer) return undefined;
    const id = setInterval(async () => {
      const data = await api("/api/ai/detect", { method: "POST", body: JSON.stringify({ strokeCount: Date.now() % 120 }) }).catch(() => null);
      if (data) setAiLabels(data.labels);
    }, 6000);
    return () => clearInterval(id);
  }, [isDrawer]);

  const seconds = useMemo(() => {
    if (!room.roundEndsAt) return 0;
    return Math.max(0, Math.ceil((room.roundEndsAt - now) / 1000));
  }, [room.roundEndsAt, now]);

  const choiceSeconds = useMemo(() => {
    if (!choiceEndsAt) return 0;
    return Math.max(0, Math.ceil((choiceEndsAt - now) / 1000));
  }, [choiceEndsAt, now]);

  const rematchSeconds = useMemo(() => {
    if (!rematchCountdown) return 0;
    return Math.max(0, Math.ceil((rematchCountdown - now) / 1000));
  }, [rematchCountdown, now]);

  useEffect(() => {
    if (seconds > 0 && seconds <= 5) playSound("countdown");
  }, [playSound, seconds]);

  function sendChat(message) {
    socket.emit("chat:send", { code: room.code, message });
  }

  function chooseWord(word) {
    setLoadingAction("word");
    socket.timeout(5000).emit("round:select_word", { code: room.code, word }, () => {
      setLoadingAction("");
      setWordChoices([]);
    });
  }

  function requestRematch() {
    setLoadingAction("rematch");
    socket.timeout(5000).emit("rematch-request", { code: room.code }, () => setLoadingAction(""));
  }

  function acceptRematch() {
    setLoadingAction("accept-rematch");
    socket.timeout(5000).emit("rematch-accepted", { code: room.code }, () => setLoadingAction(""));
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl);
    setMessages((items) => [...items, { id: crypto.randomUUID(), username: "Arena", message: "Invite link copied.", type: "system" }]);
  }

  async function shareInvite() {
    if (navigator.share) {
      await navigator.share({ title: "Join my AirSketch Arena room", text: `Room ${room.code}`, url: inviteUrl });
    } else {
      copyInvite();
    }
  }

  function updateName(value) {
    const nextUser = onUserChange?.(value) || { ...user, username: value.trim() };
    socket.emit("profile:update", { profile: nextUser });
  }

  return (
    <main className="min-h-screen bg-void p-3 text-white md:p-5">
      <div className="mb-3 grid gap-3 md:grid-cols-[240px_1fr_300px]">
        <GlassPanel className="flex items-center justify-between p-3 md:col-span-3">
          <div className="flex items-center gap-3">
            <RadioTower className="text-cyanpop" />
            <button onClick={() => navigator.clipboard.writeText(room.code)} className="inline-flex items-center gap-2 font-black tracking-[.24em] text-cyanpop">
              {room.code}<Copy size={16} />
            </button>
            <button title="Copy invite link" onClick={copyInvite} className="bg-white/5 p-2 text-cyanpop"><Copy size={16} /></button>
            <button title="Share room" onClick={shareInvite} className="bg-white/5 p-2 text-limepop"><Share2 size={16} /></button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <input
              value={user.username || ""}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Name"
              className="w-28 bg-white/5 px-2 py-1 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyanpop"
            />
            <span className={`inline-flex items-center gap-2 text-sm capitalize ${socketStatus === "connected" ? "text-limepop" : "text-magenta"}`}>
              {socketStatus === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}
              {socketStatus}
            </span>
            <span className="text-slate-300">Round {room.currentRound}/{room.settings?.rounds}</span>
            <span className="inline-flex items-center gap-2 text-2xl font-black text-limepop"><Clock /> {seconds}s</span>
            <span className="text-sm text-cyanpop">Category: {room.category || "Waiting"}</span>
            <span className="font-mono text-xl">{isDrawer ? secret || "Choose a word" : room.hint}</span>
          </div>
        </GlassPanel>
        <div className="space-y-3">
          <PlayerList room={room} selfId={user.id} onKick={(targetId) => socket.emit("room:kick", { code: room.code, targetId })} />
          <GlassPanel className="p-4">
            <h3 className="mb-2 font-bold">AI Read</h3>
            {aiLabels.map((item) => (
              <div key={item.label} className="mb-2 flex justify-between text-sm">
                <span>{item.label}</span><span className="text-cyanpop">{Math.round(item.confidence * 100)}%</span>
              </div>
            ))}
            <p className="text-xs text-slate-400">Power-ups: blind, mirror, speed, emoji bursts</p>
          </GlassPanel>
        </div>
        <section className="relative min-h-[520px] overflow-hidden border border-cyanpop/20 bg-white shadow-neon">
          <canvas ref={canvas.canvasRef} className="h-full min-h-[520px] w-full touch-none bg-[#fbfdff]" {...(!airMode && canDraw ? canvas.pointerHandlers : {})} />
          {airMode && <video ref={hand.videoRef} muted playsInline className="absolute bottom-3 left-3 w-36 border border-white/20 opacity-70" />}
          {airMode && <canvas ref={hand.overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />}
          {!isDrawer && room.status === "choosing" && <div className="absolute inset-x-0 top-0 bg-void/70 p-2 text-center text-sm text-slate-200">Drawer choosing word... {choiceSeconds}s</div>}
          {!isDrawer && room.status !== "choosing" && <div className="absolute inset-x-0 top-0 bg-void/70 p-2 text-center text-sm text-slate-200">Guess the word from the hint above</div>}
          {airMode && isDrawer && <div className="absolute right-3 top-3 bg-void/80 px-3 py-2 text-xs text-cyanpop">{hand.status}</div>}
        </section>
        <ChatPanel messages={messages} onSend={sendChat} />
      </div>
      {canDraw && (
        <ToolBar
          tool={canvas.tool}
          setTool={canvas.setTool}
          airMode={airMode}
          setAirMode={setAirMode}
          showLandmarks={hand.showLandmarks}
          setShowLandmarks={hand.setShowLandmarks}
          onUndo={() => socket.emit("canvas:undo", { code: room.code })}
          onClear={() => socket.emit("canvas:clear", { code: room.code })}
        />
      )}
      {room.status === "waiting" && room.hostId === user.id && (
        <button onClick={() => socket.emit("room:start", { code: room.code })} className="fixed bottom-5 right-5 bg-limepop px-6 py-4 font-black text-void shadow-neon">Start Match</button>
      )}
      <AnimatePresence>
        {isDrawer && wordChoices.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 grid place-items-center bg-void/80 p-6 backdrop-blur">
            <GlassPanel className="w-full max-w-2xl p-6">
              <h2 className="mb-2 flex items-center gap-2 text-3xl font-black"><Sparkles className="text-cyanpop" /> Pick Your Word</h2>
              <p className="mb-5 text-slate-300">Choose before the timer ends: {choiceSeconds}s</p>
              <div className="grid gap-3 md:grid-cols-3">
                {wordChoices.map((choice) => (
                  <button key={choice.word} disabled={loadingAction === "word"} onClick={() => chooseWord(choice.word)} className="border border-cyanpop/30 bg-cyanpop/10 p-5 text-left transition hover:bg-cyanpop hover:text-void disabled:opacity-60">
                    <span className="block text-xs uppercase tracking-[.18em] opacity-70">{choice.category}</span>
                    <strong className="mt-2 block text-2xl">{choice.word}</strong>
                    <span className="mt-3 block text-sm capitalize opacity-75">{choice.difficulty}</span>
                  </button>
                ))}
              </div>
            </GlassPanel>
          </motion.div>
        )}
        {roundResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 grid place-items-center bg-void/80 p-6 backdrop-blur">
            <GlassPanel className="w-full max-w-lg p-6">
              <h2 className="mb-4 flex items-center gap-2 text-3xl font-black"><Trophy className="text-limepop" /> {roundResult.final ? "Final Leaderboard" : `Word: ${roundResult.word}`}</h2>
              {roundResult.leaderboard?.map((player, index) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} key={player.id} className="mb-2 flex justify-between bg-white/5 p-3">
                  <span>{index + 1}. {player.username}</span><strong>{player.score}</strong>
                </motion.div>
              ))}
              {roundResult.final && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  {rematchCountdown ? (
                    <p className="text-center text-2xl font-black text-limepop">Rematch starts in {rematchSeconds}s</p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                        <span>{rematch?.requestedBy ? `${rematch.requestedBy} wants a rematch` : "Ready for another round?"}</span>
                        <span>{rematch?.accepted || room.rematch?.accepted || 0}/{rematch?.needed || room.rematch?.needed || 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button disabled={loadingAction === "rematch"} onClick={requestRematch} className="inline-flex items-center justify-center gap-2 bg-cyanpop p-3 font-bold text-void disabled:opacity-60"><RotateCcw size={18} /> Rematch</button>
                        <button disabled={loadingAction === "accept-rematch"} onClick={acceptRematch} className="inline-flex items-center justify-center gap-2 border border-limepop/40 p-3 font-bold text-limepop disabled:opacity-60"><Check size={18} /> Accept</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
