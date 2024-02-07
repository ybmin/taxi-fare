const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

const mongoose = require("mongoose");
const { validationResult, check } = require("express-validator");

const locations = require("./src/static/locations.json");
const TaxiFare = require("./src/store/mongo.ts");

// load env
dotenv.config();

// Naver Cloud Platform Maps Directions 5 API Keys
const NAVER_MAP_API_KEYS = {
  "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_API_ID,
  "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_API_KEY,
};

// Express App for showcase of taxi fare
const app = express();

app.get("/", (req, res) => {
  res.send("Taxi Fare API");
});

// Initialize database
// Erase all previous data and sets all taxi fare to 0
async function initDatabase() {
  await mongoose.connect("mongodb://localhost:27017/taxiFareDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Remove all previous data
  await TaxiFare.deleteMany({});

  for (let skey in locations) {
    for (let gkey in locations) {
      if (skey === gkey) continue;

      let tableFare = [];
      for (let i = 0; i < 48; i++) {
        tableFare.push({
          start: skey,
          goal: gkey,
          time: i,
          fare: 0,
        });
      }

      await TaxiFare.insertMany(tableFare);
    }
  }

  console.log("TaxiFare Database initialized");
}
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

const getTaxiFare = async (req, res) => {
  try {
    let start = locations[req.params.start];
    let goal = locations[req.params.goal];
    let time = new Date(req.params.time);
    let sTime = time.getHours() * 2 + Math.floor(time.getMinutes() / 30); // Scaled Time. 0 ~ 47 (0:00 ~ 23:30)

    let taxiFare = await TaxiFare.findOne(
      {
        start: req.params.start,
        goal: req.params.goal,
        time: sTime,
      },
      function (err, res) {
        if (err) console.log(err);
      }
    ).clone();

    if (
      taxiFare &&
      new Date() - taxiFare.updatedAt < 24 * 60 * 60 * 1000 &&
      taxiFare.fare !== false
    ) {
      res.json({ fare: taxiFare.fare });
      return;
    } else {
      let response = await axios.get(
        `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${goal}&options=traoptimal`,
        { headers: NAVER_MAP_API_KEYS }
      );

      let fare = response.data.route.traoptimal[0].summary.taxiFare;
      if (!taxiFare) {
        taxiFare = new TaxiFare(
          {
            start: req.params.start,
            goal: req.params.goal,
            time: sTime,
            fare: fare,
          },
          function (err, docs) {
            if (err) console.log(err);
            else console.log("TaxiFare Document Created: " + docs);
          }
        ); // 진짜 만일 document가 중간에 삭제되어 공백이 생겼을 경우 채우는 용도
      }

      await TaxiFare.updateOne(
        { start: req.params.start, goal: req.params.goal, time: sTime },
        { fare: fare },
        function (err, docs) {
          if (err) console.log(err);
          else console.log("Document Updated: " + docs);
        }
      ).clone();
      res.json({ fare: fare });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed with exception " + err.message });
  }
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  res.status(400).json({ success: false, errors: errors.array() });
};

const checkTaxiFareParams = [
  check("start")
    .isIn(Object.keys(locations))
    .withMessage("출발지가 올바르지 않습니다"),
  check("goal")
    .isIn(Object.keys(locations))
    .withMessage("도착지가 올바르지 않습니다"),
  check("time")
    .exists()
    .withMessage("날짜/시간을 입력해주세요")
    .isISO8601()
    .withMessage("날짜/시간 형식이 올바르지 않습니다"),
  validate,
];

// Get taxi fare
app.get("/taxiFare/:start-:goal/time/:time", checkTaxiFareParams, getTaxiFare);

mongoose
  .connect("mongodb://localhost:27017/taxiFareDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    app.listen(3000, () => console.log("Server is running on port 3000"))
  )
  .catch((err) => console.error(err));
