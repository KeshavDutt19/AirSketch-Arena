import { Crown, WifiOff } from "lucide-react";
import { GlassPanel } from "./GlassPanel.jsx";

export function PlayerList({ room, selfId, onKick }) {
  return (
    <GlassPanel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Pilots</h3>
        <span className="text-xs text-cyanpop">{room.players?.length || 0}/{room.settings?.maxPlayers}</span>
      </div>
      <div className="space-y-2">
        {room.players?.map((player, index) => (
          <div key={player.id} className="flex items-center justify-between bg-white/5 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {room.hostId === player.id && <Crown className="mr-1 inline text-limepop" size={14} />}
                {room.drawerId === player.id ? "✦ " : ""}{player.username}
              </p>
              <p className="text-xs text-slate-400">#{index + 1} · {player.score} pts {!player.connected && <WifiOff className="inline" size={12} />}</p>
            </div>
            {room.hostId === selfId && player.id !== selfId && (
              <button onClick={() => onKick(player.id)} className="text-xs text-magenta">Kick</button>
            )}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
