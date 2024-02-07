const mongoose = require("mongoose");
const locations = require("./src/static/locations.json");
const TaxiFare = require("./src/store/mongo.ts");

module.exports = initDatabase;
