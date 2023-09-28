const mongoose = require('mongoose');

const listDbHost = process.env.LIST_MIN_PRICE
const listDb = mongoose.createConnection(listDbHost);

const minPriceSchema = new mongoose.Schema({
    departDate: {
        type: Date,
        require: true
    },
    minPrice: Number,
    startPoint: String,
    endPoint: String,
    currency: {
        type: String,
        default: "VNĐ"
    },
}, {
    collection: 'minPrice'
});

const MinPrice = listDb.model('transaction', minPriceSchema);

module.exports = MinPrice;