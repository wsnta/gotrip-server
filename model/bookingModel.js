const mongoose = require('mongoose');

const bookingDbHost = process.env.BOOKING_MDB_LINK;

const bookingDb = mongoose.createConnection(bookingDbHost);

const bookingSchema = new mongoose.Schema({
    _id: String,
    accCode: String,
    userEmail: String,
    agCode: String,
    invoiceRequest: Boolean,
    allowSendSms: Boolean,
    pricePayment: Number,
    paymentStatus: Boolean,
    ticketingStatus: Boolean,
    billingCode: mongoose.Schema.Types.Mixed,
    bookingLogs: [mongoose.Schema.Types.Mixed],
    coinClaim: Boolean,
    invoice: {
        taxCode: String,
        companyName: String,
        companyAdress: String
    },
    contact: {
        address: String,
        agentEmail: mongoose.Schema.Types.Mixed,
        agentName: mongoose.Schema.Types.Mixed,
        agentPhone: mongoose.Schema.Types.Mixed,
        createDate: String,
        email: String,
        firstName: String,
        gender: Boolean,
        ipAddress: String,
        lastName: String,
        note: String,
        phone: String,
    },
    coupon: {
        afterDiscount: Number,
        cash: Boolean,
        code: mongoose.Schema.Types.Mixed,
        codeId: Number,
        discount: Number,
        message: String,
        showTicket: Boolean,
    },
    createDate: {
        type: String,
    },
    id: String,
    isAfter24H: Boolean,
    listFareData: [mongoose.Schema.Types.Mixed],
    listPassenger: [mongoose.Schema.Types.Mixed],
    bookingInf: [mongoose.Schema.Types.Mixed],
    local: Boolean,
    message: String,
    note: String,
    oneway: Boolean,
    paymentFee: Number,
    paymentType: Number,
    status: Number,
    totalAmt: Number,
    trCode: String,
    vat: Boolean,
}, {
    collection: 'Booking'
});

const Booking = bookingDb.model('Booking', bookingSchema);

module.exports = Booking;
