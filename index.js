const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const initDatabase = require("./init");
const locations = require("./src/static/locations.json");
const TaxiFare = require("./src/store/mongo.ts");

dotenv.config();

const NAVER_MAP_API_KEYS = {
  "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_API_ID,
  "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_API_KEY,
};

const app = express();

app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});
app.get("/taxiFare/init", async (req, res) => {
  try {
    await initDatabase();
    res.json({ message: "Database initialized" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed with exception " + err.message });
  }
});

app.get("/taxiFare/:start/:goal/:time", async (req, res) => {
  try {
    let start = locations[req.params.start];
    let goal = locations[req.params.goal];
    let time = new Date(req.params.time);
    let sTime = time.getHours() * 2 + Math.floor(time.getMinutes() / 30);

    let taxiFare = await TaxiFare.findOne({ start, goal, time: sTime });

    if (taxiFare && new Date() - taxiFare.updatedAt < 24 * 60 * 60 * 1000) {
      res.send({ fare: taxiFare.fare });
      return;
    } else {
      let response = await axios.get(
        `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${goal}&options=traoptimal`,
        { headers: NAVER_MAP_API_KEYS }
      );
      let fare = response.data.route.traoptimal[0].summary.taxiFare;
      if (taxiFare) {
        taxiFare.fare = fare;
      } else {
        taxiFare = new TaxiFare({ start, goal, time: sTime, fare });
      }

      await taxiFare.save();

      res.json({ fare });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed with exception " + err.message });
  }
});

mongoose
  .connect("mongodb://localhost:27017/taxiFareDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    app.listen(3000, () => console.log("Server is running on port 3000"))
  )
  .catch((err) => console.error(err));
