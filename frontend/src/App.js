import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import UserDashboard from "./pages/DashBoards/UserDashboard";
import AdminDashboard from "./pages/DashBoards/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsers/AdminUsersPage";
import SellerDashboard from "./pages/DashBoards/SellerDashboard";
import UserSettings from "./pages/Settings/UserSettings";
import SellerSettings from "./pages/Settings/SellerSettings";
import AdminSettings from "./pages/Settings/AdminSettings";
import AdminUserDetailPage from "./pages/AdminUsers/AdminUserDetails";
import AdminUserCreatePage from "./pages/AdminUsers/AdminUserCreatePage";
import CustomPage from "./pages/Custom/CustomPage";
import PaymentPage from "./pages/Payment/PaymentPage";
import PaymentHistory from "./pages/Payment/PaymentHistory";
import SellerPayments from "./pages/Payment/SellerPayments";
import AboutUs from "./pages/AboutUs/AboutUs";
import SellerOrder from "./pages/Order/SellerOrders";

// Public shop pages
import GemInventory from "./pages/Inventory/InventoryPage";
import GemDetail from "./pages/Inventory/GemDetail";

// Seller inventory page
import SellerInventory from "./pages/SellerAddGem/SellerInventory";

// ✅ Add these
import AddGem from "./pages/SellerAddGem/AddGem";
import EditGem from "./pages/SellerAddGem/EditGem"; // <--- NEW
// === AUCTION: add at top with others ===
import AuctionCentre from "./pages/Auction/AuctionCentre";
import AuctionBuyerDashboard from "./pages/Auction/AuctionBuyerDashboard";
import AuctionSellerDashboard from "./pages/Auction/AuctionDashboard";
import SellerAuctionControlDashboard from "./pages/DashBoards/SellerAuctionControlDashboard";

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
      <Route path="/about" element={<AboutUs />} />

      {/* Public shop routes */}
      {/* <Route path="/collection" element={<GemInventory />} />*/}
      <Route path="/inventory" element={<GemInventory />} />
      <Route path="/gems/:id" element={<GemDetail />} />

      {/* Shop */}
      <Route path="/custom" element={<CustomPage />} />
      <Route
        path="/payment"
        element={
          <RequireAuth>
            <PaymentPage />
          </RequireAuth>
        }
      />

      {/* User */}
      <Route
        path="/udashboard"
        element={
          <RequireAuth>
            <UserDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <UserSettings />
          </RequireAuth>
        }
      />
      <Route
        path="/payment-history"
        element={
          <RequireAuth>
            <PaymentHistory />
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
      <Route
        path="/admin/settings"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminSettings />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminUserDetailPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminUserCreatePage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Seller */}
      <Route
        path="/seller-dashboard"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <SellerDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/seller/settings"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <SellerSettings />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Seller inventory list */}
      <Route
        path="/seller/gems"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <SellerInventory />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* AddGem page */}
      <Route
        path="/seller/gems/new"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <AddGem />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* ✅ EditGem page */}
      <Route
        path="/seller/gems/:id/edit"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <EditGem />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/seller/payments"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <SellerPayments />
            </RequireRole>
          </RequireAuth>
        }
      />

        {/*Seller order*/ }
      <Route
        path="/seller/orders"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <SellerOrder />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* === AUCTION: Public centre === */}
      <Route path="/auction" element={<AuctionCentre />} />

      {/* === AUCTION: Buyer dashboard (logged in) === */}
      <Route
        path="/auction/buyer"
        element={
          <RequireAuth>
            <AuctionBuyerDashboard />
          </RequireAuth>
        }
      />

      {/* === AUCTION: Seller dashboard (seller only) === */}
      <Route
        path="/auction/seller"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <AuctionSellerDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/seller/auction-control"
        element={
          <RequireAuth>
            <RequireRole role="seller">
              <SellerAuctionControlDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="*"
        element={<div style={{ padding: 32 }}>404 – Page not found</div>}
      />
    </Routes>
  );
}
