// frontend/src/lib/api.js

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Small helper to call backend
export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // so cookies/JWT refresh can work if needed
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data;
}

export { API_URL };
