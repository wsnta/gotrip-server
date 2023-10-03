const mongoose = require('mongoose');

const listDbHost = process.env.LIST_MIN_PRICE
const listDb = mongoose.createConnection(listDbHost);

const minPriceSchema = new mongoose.Schema({
    Key: {
        type: String,
        require: true
    },
    DepartDate: String,
    Airline: String,
    MinFareAdt: Number,
    MinTotalAdt: Number,
    MinFareAdtFormat: String,
    MinTotalAdtFormat: String,
    ListFareData: [mongoose.Schema.Types.Mixed]
}, {
    collection: 'minPrice'
});

const MinPrice = listDb.model('minPrice', minPriceSchema);

module.exports = MinPrice;