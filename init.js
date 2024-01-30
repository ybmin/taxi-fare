const mongoose = require("mongoose");
const locations = require("./src/static/locations.json");
const TaxiFare = require("./src/store/mongo.ts");

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

  console.log("Database initialized");
}

module.exports = initDatabase;
