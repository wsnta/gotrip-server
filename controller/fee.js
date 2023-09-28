const mongoose = require('mongoose');
const FEE = require('../model/fee');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

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

(async () => {
    await FEE.createFixedAdmin();
})();

const updateFeeValues = async (updatedValues) => {
    try {
        const existingFee = await FEE.findOne();
        if (!existingFee) {
            await FEE.create(updatedValues);
        } else {
            existingFee.set(updatedValues);
            await existingFee.save();
        }
    } catch (error) {
        throw new Error('Đã xảy ra lỗi trong quá trình cập nhật');
    }
};

exports.updateFee = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }
        
        try {
            const user = await verifyToken(token);
            
            if (user.accountType !== 'admin') {
                return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
            }

            const updatedValues = req.body;
            if (!updatedValues) {
                return res.status(400).json({ error: 'Không có giá trị cập nhật' });
            }

            await updateFeeValues(updatedValues);

            return res.status(200).json({ message: 'Cập nhật giá trị FEE thành công' });
        } catch (error) {
            return res.status(403).json({ error: 'Token không hợp lệ' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Đã xảy ra lỗi không xác định' });
    }
};


exports.getFeeValues = async (req, res) => {
    try {
        const existingFee = await FEE.findOne();
        if (!existingFee) {
            return res.status(404).json({ error: 'Không tìm thấy dữ liệu FEE' });
        }

        const feeValues = {
            VJFEE: existingFee.VJFEE,
            VNFEE: existingFee.VNFEE,
            VUFEE: existingFee.VUFEE,
            QHFEE: existingFee.QHFEE,
            BLFEE: existingFee.BLFEE,
        };

        return res.status(200).json(feeValues);
    } catch (error) {
        return res.status(500).json({ error: 'Đã xảy ra lỗi không xác định' });
    }
};