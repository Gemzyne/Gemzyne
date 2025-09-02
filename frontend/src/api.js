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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null; // non-JSON / empty body
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || `Error ${res.status}`);
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

  // resend verification code
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
  getMe: () => request("/users/me"),
  updateMe: (data) =>
    request("/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  // ===== ME EXTRA (for settings page) =====
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

  // ===== PASSWORD RESET =====
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
    // OVERVIEW
    getOverview: () => request("/admin/overview"),

    // USERS
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

    // COMPLAINTS
    listComplaints: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/complaints${qs ? `?${qs}` : ""}`);
    },
    getComplaint: (id) => request(`/admin/complaints/${id}`),
    resolveComplaint: (id) =>
      request(`/admin/complaints/${id}/resolve`, { method: "PATCH" }),
  },
};

// ---- GEMS ----
api.gems = {
  // public list (storefront /collection)
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/gems${qs ? `?${qs}` : ""}`);
  },

  // public details (/gems/:id)
  byId: (id) => request(`/api/gems/${id}`),

  // seller: my gems in inventory page
  mine: () => request(`/api/gems/mine/list`),

  // seller: create (multipart/form-data)
  // pass a FormData instance with fields and files:
  //  - images (1–4) -> append("images", file)
  //  - certificate (optional) -> append("certificate", file)
  //  - other text fields...
  create: (formData) =>
    request(`/api/gems`, {
      method: "POST",
      body: formData, // DO NOT set Content-Type; browser sets boundary
    }),

  // seller: update (multipart/form-data)
  // include keepImages as JSON string of URLs to keep:
  //   form.append("keepImages", JSON.stringify(existingImageUrls))
  update: (id, formData) =>
    request(`/api/gems/${id}`, {
      method: "PUT",
      body: formData,
    }),

  // seller: delete
  remove: (id) => request(`/api/gems/${id}`, { method: "DELETE" }),
};

export default api;
