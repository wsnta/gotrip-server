const mongoose = require('mongoose');
const Transaction = require('../model/transaction');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const verifyToken = async (token) => {
    try {
        const user = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return user;
    } catch (err) {
        throw err;
    }
};

exports.getTransactions = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Không có token xác thực' });
    }

    try {
        const user = await verifyToken(token);

        if (user.accountType !== 'admin') {
            return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
        }

        const size = parseInt(req.query.size) || 5;
        const currentPage = parseInt(req.query.page);
        const sortDirection = req.query.sort === 'asc' ? 1 : -1;
        const searchQuery = req.query.search || ''; // Thêm tham số tìm kiếm
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        let query = null
        if (endDate != null && startDate != null) {
            query = {
                transactionDateFormat: { $gte: parseInt(startDate), $lte: parseInt(endDate) }
            }
        }

        const length = (await Transaction.find()).length
        const transactions = await Transaction.find({
            $and: [
                { description: { $regex: searchQuery, $options: 'i' } },
                query
            ]
        })
            .sort({ transactionDate: sortDirection })
            .skip((currentPage - 1) * size)
            .limit(size)
            .exec();

        res.status(200).json({ list: transactions, length: length });
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu.' });
    }
};
