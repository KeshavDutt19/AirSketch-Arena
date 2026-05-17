import { useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { GlassPanel } from "./GlassPanel.jsx";

export function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState("");
  return (
    <GlassPanel className="flex min-h-[320px] flex-col p-4">
      <div className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-limepop" /> Guess Feed</div>
      <div className="flex-1 space-y-2 overflow-auto pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.type === "guess" ? "text-limepop" : "text-slate-200"}>
            <span className="font-bold">{msg.username}: </span>{msg.message}
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) onSend(text.trim());
          setText("");
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a guess..." className="min-w-0 flex-1 bg-white/5 p-3 outline-none ring-1 ring-white/10 focus:ring-cyanpop" />
        <button className="bg-cyanpop px-4 text-void"><Send size={18} /></button>
      </form>
    </GlassPanel>
  );
}
