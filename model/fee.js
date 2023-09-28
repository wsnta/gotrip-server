const mongoose = require('mongoose');

const feeDbHost = process.env.FEE_MDB_LINK

const feeDb = mongoose.createConnection(feeDbHost);

const feeSchema = new mongoose.Schema({
    VJFEE: {
        type: Number,
        default: 0
    },
    VNFEE: {
        type: Number,
        default: 0
    },
    VUFEE: {
        type: Number,
        default: 0
    },
    QHFEE: {
        type: Number,
        default: 0
    },
    BLFEE: {
        type: Number,
        default: 0
    }
}, {
    collection: 'Fee'
});

feeSchema.statics.createFixedAdmin = async function () {
    const existingFee = await this.findOne();
    if (!existingFee) {
        try {
            await this.create({
                VJFEE: 0,
                VNFEE: 0,
                VUFEE: 0,
                QHFEE: 0,
                BLFEE: 0,
            });
        } catch (error) {
            console.log('error', error)
        }
    }
};

const Fee = feeDb.model('Fee', feeSchema);

module.exports = Fee;
