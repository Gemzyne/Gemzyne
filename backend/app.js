// backend/app.js
require("dotenv").config();
console.log("ENV check -> USE_ETHEREAL:", process.env.USE_ETHEREAL);

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");

// existing routes
const authRoutes = require("./Routes/AuthRoutes");
const meRoutes = require("./Routes/MeRoutes");
const adminUsersRoutes = require("./Routes/AdminUsersRoutes");
const adminOverviewRoutes = require("./Routes/AdminOverviewRoutes");
const adminComplaintsRoutes = require("./Routes/AdminComplaintsRoutes");

// new gem routes
const gemRoutes = require("./Routes/AddGem/gemRoutes");
const AdminMetricsRoutes = require("./Routes/AdminMetricsRoutes"); // <-- add

const orderRoutes = require('./Routes/OrderRoutes');
const errorMiddleware = require('./Middleware/CustomError');
const paymentRoutes = require('./Routes/PaymentRoutes'); // <-- add

//Auction 
// --- AUCTION: add below your other requires ---
const auctionRoutes = require("./Routes/AuctionRoutes");
const bidRoutes = require("./Routes/BidRoutes");
const winnerRoutes = require("./Routes/WinnerRoutes");
const { startCloseEndedAuctionsJob } = require("./jobs/closeEndedAuctions");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json());

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(cookieParser());

// static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// health
app.get("/", (_req, res) => res.send("🚀 API up"));

// mount
app.use("/users", meRoutes);
app.use("/auth", authRoutes);
app.use("/admin/overview", adminOverviewRoutes);
app.use("/admin/complaints", adminComplaintsRoutes);
app.use("/admin/users", adminUsersRoutes);
app.use("/admin/metrics", AdminMetricsRoutes); 
app.use("/api/gems", gemRoutes);

// multer + generic error handlers
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || /Only .* allowed/i.test(err.message)) {
    return res.status(400).json({ ok: false, message: err.message });
  }
  return next(err);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
// ✅ mount your Custom Order + Checkout API
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes); // <-- add

//Auction
// --- AUCTION: mount routes (all prefixed) ---
app.use("/api/auctions", auctionRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/wins", winnerRoutes);


// ✅ error handler last
app.use(errorMiddleware);

// --- Connect DB + Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    startCloseEndedAuctionsJob();
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((e) => console.error("DB error:", e));
