const mongoose = require('mongoose');
const Auth = require('../model/auth');
const User = require('../model/userInf');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Booking = require('../model/bookingModel');

dotenv.config();

const clientUrl = 'http://localhost:3000'

const generateAccessToken = (
    email,
    userId,
    accountType,
) => {
    return jwt.sign({
        email,
        userId,
        accountType,
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });
};

const generateRefreshToken = (
    email,
    userId,
    accountType,
) => {
    return jwt.sign({
        email,
        userId,
        accountType,
    }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' });
};

let refreshTokens = [];


const createUniqueShortId = async () => {
    let shortId;
    while (true) {
        shortId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await Auth.findOne({ identifier: shortId });
        if (!existingUser) {
            break;
        }
    }
    return shortId;
};

exports.register = async (req, res) => {
    try {
        const { fullname, password, email } = req.body;
        const existingUser = await Auth.findOne({ email });
        const existingBooking = await Booking.find(
            { userEmail: email }
        );
        if (existingUser) {
            res.status(409).json({ error: 'Tài khoản đã tồn tại' });
        } else {
            const shortId = await createUniqueShortId();
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new Auth({ email, fullname, password: hashedPassword, accountType: 'user', identifier: shortId });
            if (existingBooking) {
                const toDate = new Date().toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                let truePaymentCount = 0;
                let falsePaymentCount = 0;
                let latestCreateDate = null;
                let rank = 'silver'
                for (const booking of existingBooking) {
                    if (booking.paymentStatus === true) {
                        truePaymentCount++;
                    } else if (booking.paymentStatus === false) {
                        falsePaymentCount++;
                    }

                    if (!latestCreateDate || booking.createDate > latestCreateDate) {
                        latestCreateDate = booking.createDate;
                    }
                }
                if (truePaymentCount >= 30) {
                    rank = 'ruby';
                } else if (truePaymentCount >= 10) {
                    rank = 'platinum';
                } else if (truePaymentCount >= 2) {
                    rank = 'gold';
                }
                const userInf = new User({
                    email,
                    fullname,
                    accountType: 'user',
                    _id: user._id,
                    identifier: shortId,
                    orderNumber: existingBooking.length,
                    lastOrderDate: latestCreateDate ?? toDate,
                    paid: truePaymentCount,
                    unpaid: falsePaymentCount,
                    rank: rank
                })
                await userInf.save();
            } else {
                const userInf = new User({
                    email,
                    fullname,
                    accountType: 'user',
                    _id: user._id,
                    identifier: shortId,
                })
                await userInf.save();
            }

            await user.save();
            res.status(201).json({ message: 'Đăng ký thành công' });
        }
    } catch (error) {
        res.status(500).json({ error: `Đăng ký thất bại`, });
    }
};

exports.getLogAuto = async (req, res) => {
    try{
        const { 
            startPoint,
            endPoint,
            adults,
            children,
            inf,
            startDate,
            endDate,
            twoWay,
            emailAgent
        } = req.body
        
        const existAgent = await Auth.exists({
            email: emailAgent
        })

        if(!existAgent){
            res.status(401).json({ message: 'Không tồn tại agent này' });
        }

        const agent = await Auth.findById({
            _id: existAgent._id
        })

        res.status(201).json(`${clientUrl}/auto-log?uid=${agent.uuid}&startPoint=${startPoint}&endPoint=${endPoint}&adults=${adults}&children=${children}&inf=${inf}&startDate=${startDate}&endDate=${endDate}&twoWay=${twoWay}`);

    }catch(error){
        res.status(500).json({ error: 'Lấy thông tin thất bại' });
    }
}

exports.logAuto = async (req, res) => {
    try{
        const { uid } = req.query
        const existUser = await Auth.exists({
            uuid: uid
        })
        if(!existUser){
            res.status(401).json({ error: 'Sai mã đăng nhập' });
        }else{
            const userInf = await Auth.findById({
                _id: existUser._id
            })
            const accessToken = generateAccessToken(
                userInf.email,
                userInf._id,
                userInf.accountType,
            );
            const refreshToken = generateRefreshToken(
                userInf.email,
                userInf._id,
                userInf.accountType,
            );
            refreshTokens.push(refreshToken);
            res.json({
                email: userInf.email,
                accessToken,
                refreshToken,
                userId: userInf._id,
                accountType: userInf.accountType,
                identifier: userInf.identifier
            });
        }
    }catch(error){
        res.status(500).json({ error: 'Đăng nhập thất bại' });
    }
}

exports.createAgent = async (req, res) => {
    try {
        const {
            fullname,
            password,
            email,
            telegramid,
            telegram,
            acqId,
            accountNo,
            accountName,
            rank
        } = req.body;

        // Kiểm tra quyền admin
        if (req.user.accountType !== 'admin') {
            return res.status(403).json({ error: 'Bạn không có quyền thực hiện tạo tài khoản đại lý' });
        }

        // Tạo shortId duy nhất
        const shortId = await createUniqueShortId();

        const existingUser = await Auth.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'Tài khoản đã tồn tại' });
        }

        const setRank = rank || 'silver'
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new Auth({ email, fullname, password: hashedPassword, accountType: 'agent', identifier: shortId });
        const userInf = new User({
            email,
            fullname,
            accountType: 'agent',
            _id: user._id,
            identifier: shortId,
            telegram, telegramid,
            bank: {
                accountName: accountName,
                accountNo: accountNo,
                acqId: acqId
            },
            rank: setRank
        });
        await user.save();
        await userInf.save();
        res.status(201).json({ message: 'Tạo tài khoản đại lý thành công' });
    } catch (error) {
        res.status(500).json({ error: 'Tạo tài khoản đại lý thất bại' });
    }
};

exports.updateAgent = async (req, res) => {
    try {
        const {
            idAgent,
            fullname,
            telegramid,
            telegram,
            acqId,
            accountNo,
            accountName,
            rank
        } = req.body;

        // Kiểm tra quyền admin
        if (req.user.accountType !== 'admin') {
            return res.status(403).json({ error: 'Bạn không có quyền thực hiện tạo tài khoản đại lý' });
        }

        const existingUser = await Auth.exists({
            _id: idAgent
        });

        if (!existingUser) {
            return res.status(409).json({ error: 'Tài khoản không tồn tại' });
        }

        const filter = {_id: idAgent}

        const update = {
            $set: {
                fullname: fullname,
                telegramid: telegramid,
                telegram: telegram,
                bank: {
                    acqId: acqId,
                    accountNo: accountNo,
                    accountName: accountName
                },
                rank: rank
            }
        }
        await User.updateMany(filter, update)

        res.status(201).json({ message: 'Cập nhật tài khoản đại lý thành công' });
    } catch (error) {
        res.status(500).json({ error: 'Cập nhật tài khoản đại lý thất bại' });
    }
};

exports.getAllAgentInf = async (req, res) => {
    try{
        const listAgent = await User.aggregate([
            {$match: {
                accountType: 'agent'
            }}
        ])

        res.status(201).json(listAgent);
    }catch (error){
        res.status(500).json({ error: 'Lấy thông tin đại lý thất bại' });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Auth.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Tài khoản không tồn tại' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Sai mật khẩu' });
        }
        const accessToken = generateAccessToken(
            email,
            user._id,
            user.accountType,
        );
        const refreshToken = generateRefreshToken(
            email,
            user._id,
            user.accountType,
        );
        refreshTokens.push(refreshToken);
        res.json({
            email,
            accessToken,
            refreshToken,
            userId: user._id,
            accountType: user.accountType,
            identifier: user.identifier
        });
    } catch (error) {
        return res.status(500).json({ error: 'Đăng nhập thất bại' });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { email, fullname } = req.body;
        let user = await Auth.findOne({ email });
        const existingBooking = await Booking.find(
            { userEmail: email }
        );
        if (user) {
            res.status(409).json({ error: 'Tài khoản đã tồn tại' });
        }
        if (!user) {
            const shortId = await createUniqueShortId();
            const hashedPassword = await bcrypt.hash(email, 10);
            user = new Auth({ email, fullname, password: hashedPassword, accountType: 'user', identifier: shortId });
            if (existingBooking) {
                const toDate = new Date().toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                let truePaymentCount = 0;
                let falsePaymentCount = 0;
                let latestCreateDate = null;
                let rank = 'silver'
                for (const booking of existingBooking) {
                    if (booking.paymentStatus === true) {
                        truePaymentCount++;
                    } else if (booking.paymentStatus === false) {
                        falsePaymentCount++;
                    }

                    if (!latestCreateDate || booking.createDate > latestCreateDate) {
                        latestCreateDate = booking.createDate;
                    }
                }
                if (truePaymentCount >= 30) {
                    rank = 'ruby';
                } else if (truePaymentCount >= 10) {
                    rank = 'platinum';
                } else if (truePaymentCount >= 2) {
                    rank = 'gold';
                }
                const userInf = new User({
                    email,
                    fullname,
                    accountType: 'user',
                    _id: user._id,
                    identifier: shortId,
                    orderNumber: existingBooking.length,
                    lastOrderDate: latestCreateDate ?? toDate,
                    paid: truePaymentCount,
                    unpaid: falsePaymentCount,
                    rank: rank
                })
                await userInf.save();
            } else {
                const userInf = new User({
                    email,
                    fullname,
                    accountType: 'user',
                    _id: user._id,
                    identifier: shortId,
                })
                await userInf.save();
            }
        }

        const accessToken = generateAccessToken(
            email,
            user._id,
            user.accountType,
        );
        const refreshToken = generateRefreshToken(
            email,
            user._id,
            user.accountType,
        );
        refreshTokens.push(refreshToken);
        res.json({
            email,
            accessToken,
            refreshToken,
            userId: user._id,
            accountType: user.accountType,
            identifier: user.identifier
        });
    } catch (error) {
        res.status(500).json({ error: 'Đăng nhập bằng Google thất bại' });
    }
};

(async () => {
    await Auth.createFixedAdmin();
})();

exports.refresh = (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ error: 'Token refresh không tồn tại' });
    }
    if (!refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ error: 'Token refresh không hợp lệ' });
    }
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verify Error:', err);
            return res.status(403).json({ error: 'Token refresh không hợp lệ' });
        }
        const accessToken = generateAccessToken(
            user.email,
            user._id,
            user.accountType,
        );
        res.json({
            email: user.email,
            accessToken,
            refreshToken,
            userId: user.userId,
            accountType: user.accountType,
            identifier: user.identifier
        });
    });
};

exports.logout = (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ error: 'Token refresh không tồn tại' });
    }
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    res.json({ message: 'Đăng xuất thành công' });
};


exports.updateAccount = async (req, res) => {
    try {
        const token = req.headers.authorization
        if (!token) {
            return res.status(401).json({
                error: 'Không có token xác thực'
            })
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({
                    error: 'Token không hợp lệ'
                })
            }
            const existingUser = await Auth.findOne(
                { _id: user.userId }
            );
            if (!existingUser) {
                return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
            }

            const { fullname, password } = req.body;
            await User.findByIdAndUpdate(
                user.userId
                ,
                { fullname },
                { new: true }
            )

            const hashedPassword = await bcrypt.hash(password, 10);
            await Auth.findByIdAndUpdate(
                { _id: user.userId },
                { password: hashedPassword },
                { fullname: fullname },
                { new: true }
            );

            return res.status(200).json({ message: 'Thông tin tài khoản đã được cập nhật' });
        })
    } catch (error) {
        res.status(500).json({ error: 'Cập nhật thông tin tài khoản thất bại' });
    }
};