const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api(path, options = {}) {
  const token = localStorage.getItem("airsketch_token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

export { API_URL };
