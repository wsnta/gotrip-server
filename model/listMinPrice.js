const mongoose = require('mongoose');

const listDbHost = process.env.LIST_MIN_PRICE
const listDb = mongoose.createConnection(listDbHost);

const minPriceSchema = new mongoose.Schema({
    Key: String,
    DepartDate: Number,
    Airline: String,
    MinFareAdt: Number,
    StartPoint: String,
    Month: Number,
    Day: Number,
    Year: Number,
    EndPoint: String,
    MinTotalAdt: Number,
    MinFareAdtFormat: String,
    MinTotalAdtFormat: String,
}, {
    collection: 'minPrice'
});

const MinPrice = listDb.model('minPrice', minPriceSchema);

module.exports = MinPrice;