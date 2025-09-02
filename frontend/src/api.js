// src/api.js
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("accessToken");
}

async function request(path, options = {}) {
  const headers = options.headers || {};
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const { signal, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    credentials: "include",
    signal,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // ===== AUTH =====
  register: (data) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  verifyEmail: (data) =>
    request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resendVerify: (email) =>
    request("/auth/resend-verify", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  login: async (data) => {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.accessToken)
      localStorage.setItem("accessToken", result.accessToken);
    if (result.user) localStorage.setItem("user", JSON.stringify(result.user));
    return result;
  },
  logout: () => request("/auth/logout", { method: "POST" }),

  // ===== ME =====
  getMe: (opts) => request("/users/me", opts),
  updateMe: (data) =>
    request("/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  me: {
    changePassword: (data) =>
      request("/users/me/password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    requestEmailChange: (data) =>
      request("/users/me/email/request", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    confirmEmailChange: (data) =>
      request("/users/me/email/confirm", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteMe: (reason) =>
      request("/users/me", {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      }),
  },

  // ===== RESET =====
  forgotPassword: (email) =>
    request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload) =>
    request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ===== ADMIN =====
  admin: {
    getOverview: () => request("/admin/overview"),
    listUsers: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/users${qs ? `?${qs}` : ""}`);
    },
    addUser: (data) =>
      request("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    getUser: (id) => request(`/admin/users/${id}`),
    updateUser: (id, data) =>
      request(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),

    // ✅ FIX: Complaints API
    listComplaints: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/complaints${qs ? `?${qs}` : ""}`);
    },
  },
};
