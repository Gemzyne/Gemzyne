// src/api.js
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("accessToken");
}

let refreshingPromise = null;
async function refreshToken() {
  if (refreshingPromise) return refreshingPromise;

  const sessionId = localStorage.getItem("sessionId");
  if (!sessionId) return false;

  refreshingPromise = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send HttpOnly refresh cookie
    body: JSON.stringify({ sessionId }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const json = await res.json().catch(() => ({}));
      const accessToken = json?.accessToken;
      if (!accessToken) return false;
      localStorage.setItem("accessToken", accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshingPromise = null;
    });

  return refreshingPromise;
}

// Base request with a single automatic retry after refresh
async function coreRequest(path, options = {}, _retried = false) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  // Set JSON Content-Type only when not sending FormData
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach bearer if present
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // 🛠️ FIX: properly destructure options to use rest/signal safely
  const { signal, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    credentials: "include",
    signal,
  });

  // Attempt a single refresh on 401
  if (res.status === 401 && !_retried) {
    const ok = await refreshToken();
    if (ok) return coreRequest(path, options, true);
  }

  // Parse body safely (handles empty responses)
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function request(path, options) {
  return coreRequest(path, options);
}

//NEW: metrics helpers (read-only, hit your new endpoints)
export const metrics = {
  summary: (year) => request(`/api/metrics/seller/summary?year=${year}`),
  monthly: (year) => request(`/api/metrics/seller/monthly?year=${year}`),
  category: (year) => request(`/api/metrics/seller/category?year=${year}`),
};


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

  login: async (payload) => {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Store once, only when present
    if (result?.accessToken)
      localStorage.setItem("accessToken", result.accessToken);
    if (result?.sessionId) localStorage.setItem("sessionId", result.sessionId);
    if (result?.user) localStorage.setItem("user", JSON.stringify(result.user));
    return result;
  },

  logout: async () => {
    const sessionId = localStorage.getItem("sessionId");
    try {
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ sessionId }), // ← SEND IT
      });
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("sessionId");
      localStorage.removeItem("user");
    }
  },

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
    // Metrics / Overview
    getMetrics: () => request("/admin/metrics"),
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

    // Complaints (from your “payment management” / merged branch)
    listComplaints: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/complaints${qs ? `?${qs}` : ""}`);
    },
    getComplaint: (id) => request(`/admin/complaints/${id}`),
    resolveComplaint: (id) =>
      request(`/admin/complaints/${id}/resolve`, { method: "PATCH" }),
  },

  // ===== ORDERS (Customize & Payment flow) =====
  orders: {
    create: (payload) =>
      request("/api/orders", { method: "POST", body: JSON.stringify(payload) }),

    get: (id) => request(`/api/orders/${id}`),

    // Card checkout
    checkoutCard: (id, { customer, payment, country }) =>
      request(`/api/orders/${id}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          country,
          customer,
          payment: { method: "card", ...(payment || {}) },
        }),
      }),

    // Bank transfer checkout (multipart/form-data)
    checkoutBank: (id, { customer, country, slip, payment = {} }) => {
      const fd = new FormData();
      if (country) fd.append("country", country);
      if (customer) fd.append("customer", JSON.stringify(customer));
      fd.append("payment", JSON.stringify({ method: "bank", ...payment }));
      if (slip) fd.append("slip", slip);
      return request(`/api/orders/${id}/checkout`, {
        method: "POST",
        body: fd,
      });
    },
  },
};
