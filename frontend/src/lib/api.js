// frontend/src/lib/api.js
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("accessToken");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
    // Only set JSON content-type when NOT sending FormData
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  // 204 No Content => return empty object
  if (res.status === 204) return {};

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data;
}

export { API_URL };
