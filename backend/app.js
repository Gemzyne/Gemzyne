// backend/app.js
const express = require('express');
const mongoose = require('mongoose');
const router = require('./Routes/UserRoutes');

const app = express();

//middleware
app.use(express.json());
app.use("/users",router);


// Connect to MongoDB
mongoose.connect('mongodb+srv://gemzyneAdmin:ApeKama_Gemzyne2025@cluster0.icchtnm.mongodb.net/')
.then(()=> console.log("Connected to MongoDB"))
.then(()=>{
    app.listen(5000, () => {
        console.log("Server is running on port 5000");
    });
})
// Handle connection errors
.catch(err => {
    console.error("Database connection error:", err);
}); 