const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const authDbHost = process.env.AUTH_MDB_LINK;

const authDb = mongoose.createConnection(authDbHost);

const authSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    fullname: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    identifier: {
        type: String
    },
    uuid: {
        type: String
    },
    accountType: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
}, {
    collection: 'Auth'
});
authSchema.statics.createFixedAdmin = async function () {
    const existingAdmin = await this.findOne({ accountType: 'admin' });
    shortId = Math.floor(100000 + Math.random() * 900000).toString();
    if (!existingAdmin) {
        try {
            const hashedPassword = await bcrypt.hash('0201172001An', 10);
            await this.create({
                email: 'admin@example.com',
                fullname: 'Admin',
                password: hashedPassword,
                accountType: 'admin',
                identifier: shortId
            });
        } catch (error) {
            console.log('error', error)
        }
    }
};

const Auth = authDb.model('Auth', authSchema);

module.exports = Auth;
