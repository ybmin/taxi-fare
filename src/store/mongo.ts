const mongoose = require("mongoose");

const taxiFareSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // 출발지
    goal: { type: String, required: true }, // 도착지
    time: { type: Number, required: true }, // 출발 시간 (24h를 30분 단위로 분리, 0 ~ 47 (0:00 ~ 23:30))
    fare: { type: Number, default: false }, // 예상 택시 요금
  },
  {
    timestamps: true, // 최근 업데이트 시간 기록용
  }
);
// Create Model & Export
module.exports =
  mongoose.models.TaxiFare || mongoose.model("TaxiFare", taxiFareSchema);
