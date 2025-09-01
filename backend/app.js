// backend/app.js
require("dotenv").config(); // <--- load .env first
console.log(
  "ENV check -> USE_ETHEREAL:",
  process.env.USE_ETHEREAL,
  "SMTP_HOST:",
  process.env.SMTP_HOST
);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require('path');

const authRoutes = require("./Routes/AuthRoutes");
const meRoutes = require("./Routes/MeRoutes");
const adminUsersRoutes = require("./Routes/AdminUsersRoutes");
const adminOverviewRoutes = require("./Routes/AdminOverviewRoutes"); // <-- add
const adminComplaintsRoutes = require("./Routes/AdminComplaintsRoutes"); // <-- add

const orderRoutes = require('./Routes/CustomOrderRoutes');
const errorMiddleware = require('./Middleware/CustomError');

const app = express();

//middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // CRA default is 3000
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ✅ serve uploaded bank slips
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/users", meRoutes);
app.use("/auth", authRoutes);
//admin routes
app.use("/admin/overview", adminOverviewRoutes);
app.use("/admin/complaints", adminComplaintsRoutes);
app.use("/admin/users", adminUsersRoutes);

// ✅ mount your Custom Order + Checkout API
app.use('/api/orders', orderRoutes);

// ✅ error handler last
app.use(errorMiddleware);

// --- Connect DB + Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
