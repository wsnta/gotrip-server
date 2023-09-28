
const mongoose = require('mongoose');
const User = require('../model/userInf');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

exports.getUserInf = async (req, res) => {
    try {
        const userId = req.params.userId
        const userInf = await User.findOne({ _id: userId });
        res.status(200).json(userInf);
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu người dùng.' });
    }
};


const verifyToken = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                reject(err);
            } else {
                resolve(user);
            }
        });
    });
};

exports.updateBlanceAgent = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }

        try {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
                if (user.accountType !== 'agent') {
                    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
                }

                const { balance } = req.body;

                const updatedUser = await User.findByIdAndUpdate(
                    user.userId,
                    {
                        balance: balance,
                    },
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ error: 'Người dùng không tồn tại' });
                }

                return res.status(200).json({ message: 'Cập nhật số dư thành công' });
            });
        } catch (error) {
            return res.status(403).json({ error: 'Token không hợp lệ' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Đã xảy ra lỗi không xác định' });
    }
};

exports.updateFeeAgent = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }

        try {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
                if (user.accountType !== 'agent') {
                    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
                }

                const { VJFEE, VNFEE, VUFEE, QHFEE, BLFEE } = req.body;

                if (!user) {
                    return res.status(404).json({ error: 'Người dùng không tồn tại' });
                }

                const updatedUser = await User.findByIdAndUpdate(
                    user.userId,
                    {
                        VJFEE: VJFEE,
                        VNFEE: VNFEE,
                        VUFEE: VUFEE,
                        QHFEE: QHFEE,
                        BLFEE: BLFEE,
                    },
                    { new: true }
                );

                return res.status(200).json({ message: 'Cập nhật giá trị FEE thành công' });
            });
        } catch (error) {
            return res.status(403).json({ error: 'Token không hợp lệ' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Đã xảy ra lỗi không xác định' });
    }
};

exports.updateUserInf = async (req, res) => {
    try {
        const { userId, accountType, ticketsCount } = req.body
        const existingUser = await User.findOne(
            { _id: userId }
        );
        if (existingUser) {
            const paidBookingsCount = existingUser.paid + ticketsCount
            if (accountType === 'agent') {
                await User.findByIdAndUpdate(
                    { _id: userId },
                    {
                        $set: {
                            paid: ticketsCount,
                            unpaid: existingUser.orderNumber - ticketsCount,
                            rank: paidBookingsCount >= 5000 ? 'ruby' :
                                paidBookingsCount >= 2000 ? 'diamond' :
                                    paidBookingsCount >= 200 ? 'platinum' :
                                        paidBookingsCount >= 5 ? 'gold' : 'silver'
                        }
                    }
                );
                res.status(200).json({ error: 'Cập nhật thành công' });
            }
            if (accountType === 'user') {
                await User.findByIdAndUpdate(
                    { _id: userId },
                    {
                        $set: {
                            paid: ticketsCount,
                            unpaid: existingUser.orderNumber - ticketsCount,
                            rank: paidBookingsCount >= 30 ? 'ruby' :
                                paidBookingsCount >= 10 ? 'platinum' :
                                    paidBookingsCount >= 2 ? 'gold' : 'silver'
                        }
                    }
                );
                res.status(200).json({ error: 'Cập nhật thành công' });
            }
        } else {
            res.status(401).json({ error: 'Không tìm thấy nguời dùng' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu người dùng.' });
    }
};

(async () => {
    await User.createFixedAdmin();
})();
