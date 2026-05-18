import { useEffect, useState } from "react";
import { api } from "../api.js";

function createLocalId() {
  return `player-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function cleanUsername(username) {
  return String(username || "").trim().slice(0, 24);
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("airsketch_user") || "null");
    if (saved?.id) return { ...saved, username: cleanUsername(saved.username) };
    return {
      id: localStorage.getItem("airsketch_player_id") || createLocalId(),
      username: localStorage.getItem("airsketch_username") || ""
    };
  });
  const [token, setToken] = useState(() => localStorage.getItem("airsketch_token"));

  useEffect(() => {
    if (user) {
      localStorage.setItem("airsketch_user", JSON.stringify(user));
      localStorage.setItem("airsketch_player_id", user.id);
      localStorage.setItem("airsketch_username", user.username || "");
    }
    if (token) localStorage.setItem("airsketch_token", token);
  }, [user, token]);

  async function guest(username) {
    const nextUser = { id: user?.id || createLocalId(), username: cleanUsername(username) || "Guest" };
    setUser(nextUser);
    try {
      const data = await api("/api/auth/guest", { method: "POST", body: JSON.stringify(nextUser) });
      const merged = { ...nextUser, ...data.user, id: nextUser.id };
      setUser(merged);
      setToken(data.token);
      return { ...data, user: merged };
    } catch {
      return { token: null, user: nextUser };
    }
  }

  function updateUsername(username) {
    const nextUser = { id: user?.id || createLocalId(), username: cleanUsername(username) || "Guest" };
    setUser(nextUser);
    return nextUser;
  }

  return { user, token, guest, updateUsername };
}
