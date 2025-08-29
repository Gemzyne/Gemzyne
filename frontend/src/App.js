// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import UserDashboard from "./pages/DashBoards/UserDashboard";
import AdminDashboard from "./pages/DashBoards/AdminDashboard"; // NEW
import AdminUsersPage from "./pages/AdminUsers/AdminUsersPage";

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireRole = ({ role, children }) => {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/mainhome" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/mainhome" replace />} />
      <Route path="/mainhome" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* User */}
      <Route
        path="/udashboard"
        element={
          <RequireAuth>
            <UserDashboard />
          </RequireAuth>
        }
      />

      {/* Admin */}
      <Route
        path="/admin-dashboard"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

       <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminUsersPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route path="*" element={<div style={{ padding: 32 }}>404 – Page not found</div>} />
    </Routes>
  );
}

