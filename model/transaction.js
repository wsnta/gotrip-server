const mongoose = require('mongoose');

const transactionDbHost = process.env.TRANSACTION_MDB_LINK
const transactionDb = mongoose.createConnection(transactionDbHost);

const transactionSchema = new mongoose.Schema({
    postingDate: String,
    transactionDate: String,
    accountNo: String,
    creditAmount: String,
    debitAmount: String,
    currency: String,
    description: String,
    availableBalance: String,
    beneficiaryAccount: String,
    refNo: String,
    benAccountName: String,
    bankName: String,
    benAccountNo: String,
    dueDate: String,
    docId: String,
    transactionType: String,
    transactionDateFormat: Number,
}, {
    collection: 'transaction'
});

const Transaction = transactionDb.model('transaction', transactionSchema);

module.exports = Transaction;