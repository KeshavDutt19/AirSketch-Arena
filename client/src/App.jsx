import { useEffect, useMemo, useState } from "react";
import { Landing } from "./components/Landing.jsx";
import { Lobby } from "./components/Lobby.jsx";
import { GameScreen } from "./components/GameScreen.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useSocket } from "./hooks/useSocket.js";

export default function App() {
  const [screen, setScreen] = useState(() => (window.location.pathname.startsWith("/room/") ? "lobby" : "landing"));
  const [room, setRoomState] = useState(() => JSON.parse(sessionStorage.getItem("airsketch_room") || "null"));
  const auth = useAuth();
  const socketState = useSocket();
  const socket = socketState.socket;

  const routeRoomCode = useMemo(() => {
    const match = window.location.pathname.match(/^\/room\/([A-Z0-9]{4,10})/i);
    return match?.[1]?.toUpperCase() || "";
  }, []);

  function setRoom(nextRoom) {
    setRoomState(nextRoom);
    if (nextRoom?.code) {
      sessionStorage.setItem("airsketch_room", JSON.stringify(nextRoom));
      window.history.replaceState({}, "", `/room/${nextRoom.code}`);
    } else {
      sessionStorage.removeItem("airsketch_room");
    }
  }

  useEffect(() => {
    socket.emit("profile:update", { profile: auth.user });
  }, [auth.user, socket]);

  useEffect(() => {
    if (!socket.connected) return undefined;
    const code = routeRoomCode || room?.code || sessionStorage.getItem("airsketch_room_code");
    if (!code) return undefined;
    socket.timeout(8000).emit("room:join", { code, profile: auth.user }, (err, res) => {
      if (!err && res?.ok) {
        setRoom(res.room);
        setScreen("game");
      }
    });
    return undefined;
  }, [auth.user, routeRoomCode, socket, socketState.connected]);

  useEffect(() => {
    if (room?.code) sessionStorage.setItem("airsketch_room_code", room.code);
  }, [room?.code]);

  async function enter() {
    if (!auth.user?.username) await auth.guest("Guest");
    setScreen("lobby");
  }

  const activeUser = auth.user;

  if (screen === "landing") return <Landing onPlay={enter} />;
  if (!room) {
    return (
      <Lobby
        user={activeUser}
        socket={socket}
        socketStatus={socketState.status}
        initialCode={routeRoomCode}
        onRoom={setRoom}
        onUserChange={auth.updateUsername}
      />
    );
  }
  return <GameScreen room={room} setRoom={setRoom} socket={socket} socketStatus={socketState.status} user={activeUser} onUserChange={auth.updateUsername} />;
}
