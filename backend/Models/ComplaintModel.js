const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true },
    phone:     { type: String, trim: true },

    orderDate: { type: Date, required: true },
    product:   { type: String, default: "" },

    category:  { type: String, required: true, enum: [
      "quality","shipping","description","service","certification","other"
    ]},
    details:   { type: String, required: true, trim: true },

    images:    [{ type: String }],        // URLs if you add uploads later
    status:    { type: String, default: "new", enum: ["new","in_progress","resolved"] },

    // nice human ref like LG-4839
    reference: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
