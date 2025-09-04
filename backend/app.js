// backend/app.js
require('dotenv').config(); // <--- load .env first
console.log('ENV check -> USE_ETHEREAL:', process.env.USE_ETHEREAL, 'SMTP_HOST:', process.env.SMTP_HOST);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./Routes/AuthRoutes');
const meRoutes = require('./Routes/MeRoutes');
const adminUsersRoutes = require('./Routes/AdminUsersRoutes');
const adminOverviewRoutes = require('./Routes/AdminOverviewRoutes');      // <-- add
const adminComplaintsRoutes = require('./Routes/AdminComplaintsRoutes');  // <-- add
const reviewRoutes = require('./Routes/ReviewRoutes'); // <-- add

const app = express();

//middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // CRA default is 3000
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/users",meRoutes);
app.use("/auth",authRoutes);

// reviews api
app.use("/api/reviews", reviewRoutes);


//admin routes
app.use("/admin/overview",adminOverviewRoutes);
app.use("/admin/complaints",adminComplaintsRoutes);
app.use("/admin/users",adminUsersRoutes);




// --- Connect DB + Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error("Database connection error:", err);
  });