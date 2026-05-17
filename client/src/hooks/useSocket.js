import { useEffect, useState } from "react";
import { socket } from "../socket.js";

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(socket.connected ? "connected" : "connecting");

  useEffect(() => {
    setConnected(socket.connected);
    setStatus(socket.connected ? "connected" : "connecting");
    const onConnect = () => {
      setConnected(true);
      setStatus("connected");
    };
    const onConnectError = () => {
      setConnected(false);
      setStatus("disconnected");
    };
    const onDisconnect = () => {
      setConnected(false);
      setStatus("disconnected");
    };
    const onReconnectAttempt = () => {
      setStatus("reconnecting");
    };
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, []);

  return { socket, connected, status };
}
