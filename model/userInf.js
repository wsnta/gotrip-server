const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Auth = require('../model/auth');

const userDbHost = process.env.USER_MDB_LINK
const userDb = mongoose.createConnection(userDbHost);

const userSchema = new mongoose.Schema({
    _id: {
        type: String,
        require: true
    },
    email: {
        type: String,
        required: true
    },
    fullname: {
        type: String,
        required: true,
    },
    telegram: {
        type: String,
        default: null
    },
    telegramid: {
        type: String,
        default: null
    },
    accountType: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
    rank: { type: String, enum: ['silver', 'gold', 'platinum', 'diamond', 'ruby', 'admin'], default: 'silver' },
    orderNumber: {
        type: Number,
        default: 0
    },
    paid: {
        type: Number,
        default: 0
    },
    unpaid: {
        type: Number,
        default: 0
    },
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
    },
    balance: {
        type: Number,
        default: 0
    },
    bank: {
        accountNo: String,
        accountName: String,
        acqId: Number
    },
    identifier: {
        type: String,
    },
    lastOrderDate: String,
}, {
    collection: 'User'
});
userSchema.statics.createFixedAdmin = async function () {
    const existingAdmin = await this.findOne({ accountType: 'admin' });
    const user = await Auth.findOne({ email: "admin@example.com" });
    if (!existingAdmin) {
        try {
            await this.create({
                _id: user._id,
                email: 'admin@example.com',
                fullname: 'Admin',
                rank: 'admin',
                accountType: 'admin',
                identifier: user.identifier,
                bank: {
                    accountNo: '0984227777',
                    accountName: 'HUYNH PHUOC MAN',
                    acqId: 970422
                }
            });
        } catch (error) {
            console.log('error', error)
        }
    }
};

const User = userDb.model('User', userSchema);

module.exports = User;
