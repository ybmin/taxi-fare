const mongoose = require("mongoose");

// Define Schemes
const taxiFareSchema = new mongoose.Schema(
  {
    start: { type: String, required: true },
    goal: { type: String, required: true },
    time: { type: Number, required: true },
    fare: { type: Number, default: false },
  },
  {
    timestamps: true,
  }
);
// Create Model & Export
module.exports =
  mongoose.models.TaxiFare || mongoose.model("TaxiFare", taxiFareSchema);
