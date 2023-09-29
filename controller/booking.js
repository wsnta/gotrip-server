const mongoose = require('mongoose');
const Booking = require('../model/bookingModel');
const User = require('../model/userInf')
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const schedule = require('node-schedule');
const axios = require('axios');
const Auth = require('../model/auth');
const { v4: uuidv4 } = require('uuid');

async function checkUserExistence(email) {
    return Booking.exists({ userEmail: email });
}

schedule.scheduleJob('0 12 * * *', async () => {
    console.log('Định kì.')
    try {
        const users = await User.find();

        for (const user of users) {
            if (user.accountType === 'user') {
                const currentDate = new Date();
                const lastOrderDate = new Date(user.lastOrderDate);

                const monthsDiff = (currentDate.getFullYear() - lastOrderDate.getFullYear()) * 12 +
                    currentDate.getMonth() - lastOrderDate.getMonth();

                if (monthsDiff >= 6) {
                    const nextRank =
                        user.rank === 'ruby' ? 'platinum' :
                            user.rank === 'platinum' ? 'gold' :
                                user.rank === 'gold' ? 'silver' : 'silver';

                    await User.findByIdAndUpdate(
                        { _id: user._id },
                        {
                            $set: {
                                rank: nextRank
                            }
                        }
                    );
                }
            } else if (user.accountType === 'agent') {
                const currentDate = new Date();
                const lastOrderDate = new Date(user.lastOrderDate);

                const monthsDiff = (currentDate.getFullYear() - lastOrderDate.getFullYear()) * 12 +
                    currentDate.getMonth() - lastOrderDate.getMonth();

                if (monthsDiff >= 1) {
                    const nextRank =
                        user.rank === 'ruby' ? 'diamond' :
                            user.rank === 'diamond' ? 'platinum' :
                                user.rank === 'platinum' ? 'gold' : 'silver';

                    await User.findByIdAndUpdate(
                        { _id: user._id },
                        {
                            $set: {
                                rank: nextRank
                            }
                        }
                    );
                }
            }
        }

        const listAgent = await Auth.find({accountType: 'agent'})
        listAgent.forEach( async (agent) => {
            const uuid = uuidv4();
            await Auth.updateOne(
                {_id: agent._id},
                {$set: {uuid: uuid}}
            )
        })
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});

exports.postBooking = async (req, res) => {
    try {
        const { bookingData, ticketsCount, pricePayment, email } = req.body;

        const existingUser = await User.findOne(
            { email: email }
        );

        const newData = { ...bookingData, userEmail: email, _id: bookingData.id, paymentStatus: false, pricePayment: pricePayment, ticketingStatus: false }
        const newBooking = new Booking(newData);
        await newBooking.save();

        if (existingUser) {
            const toDate = new Date().toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const totalOrder = existingUser.orderNumber + ticketsCount
            await User.findOneAndUpdate(
                { email: email },
                {
                    $set: {
                        orderNumber: totalOrder,
                        unpaid: totalOrder - existingUser.paid,
                        lastOrderDate: toDate,
                    }
                }
            );
        }
        res.status(200).json('Tạo booking thành công.');
    } catch (error) {
        res.status(500).json({ error: 'Không thể thêm dữ liệu mới.' });
    }
};

exports.postBookingNoUser = async (req, res) => {
    try {
        const { bookingData, pricePayment, email } = req.body;

        const newBooking = new Booking({
            userId: '',
            email: email,
            listBooking: [{ ...bookingData, paymentStatus: false, pricePayment: pricePayment, ticketingStatus: false }]
        });
        const savedBooking = await newBooking.save();
        res.status(201).json(savedBooking);
    } catch (error) {
        res.status(500).json({ error: 'Không thể thêm dữ liệu mới.' });
    }
};

exports.getUserBookings = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ' });
            }
            const { bookingCode, paymentStatus, size, page } = req.body;
            const currentPage = parseInt(page)
            const pipeline = [
                { $match: { userEmail: user.email } },
                { $sort: { createDate: -1 } }, // Sắp xếp theo createDate từ mới nhất đến cũ nhất
            ];
    
            if (bookingCode !== 'all') {
                pipeline.push({ $match: { 'listFareData.bookingCode': bookingCode } });
            }
    
            if (paymentStatus != null) {
                pipeline.push({ $match: { paymentStatus: paymentStatus } });
            }

            pipeline.push(
                { $skip: (currentPage - 1) * size },
                { $limit: parseInt(size) }
            );
    
            const userData = await Booking.aggregate(pipeline);
            const length = await Booking.countDocuments(pipeline[0].$match || {});
            res.status(200).json({data: userData, length: length});
        });

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu người dùng.' });
    }
};


exports.getAllBookings = async (req, res) => {
    try {
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ' });
            }

            if (user.accountType !== 'admin') {
                return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
            }
            const { email, paymentStatus, size, page, startDate, endDate } = req.query;
            const currentPage = parseInt(page)
            const pipeline = [];

            if (email !== 'null') {
                pipeline.push({ $match: { userEmail: email } });
            }
    
            if (paymentStatus !== 'null') {
                pipeline.push({ $match: { paymentStatus: paymentStatus === 'true' } });
            }
    
            if (startDate && endDate) {
                pipeline.push({ $match: { createDate: { $gte: startDate, $lte: endDate } } });
            }
    
            pipeline.push(
                { $sort: { createDate: -1 } }, 
                { $skip: (currentPage - 1) * size },
                { $limit: parseInt(size) }
            );
    
            const allBookings = await Booking.aggregate(pipeline);
            const length = await Booking.countDocuments(pipeline[0].$match || {});
    
            res.status(200).json({ allBookings, length });
        });
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu đặt chỗ.' });
    }
};


exports.deleteBooking = async (req, res) => {
    try {
        const { userId, bookingId } = req.params;

        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ message: 'Không có token xác thực' });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Token không hợp lệ' });
            }

            const existingUser = await User.findOne(
                { _id: userId }
            );
            const userExists = await checkUserExistence(existingUser.email);

            if (userExists) {
                await Booking.findByIdAndDelete(
                    { _id: bookingId }
                );
                const listBooking = await Booking.find({
                    userEmail: existingUser.email
                })
                if (listBooking) {
                    if (existingUser.accountType === 'agent') {
                        const paidBookingsCount = listBooking.reduce((count, booking) => {
                            if (booking.paymentStatus) {
                                const fareData = booking.listFareData;
                                if (fareData && fareData.length > 0) {
                                    fareData.forEach(fare => {
                                        count += (fare.adt || 0) + (fare.chd || 0) + (fare.inf || 0);
                                    })
                                }
                            }
                            return count;
                        }, 0);

                        const unpaidBookingsCount = listBooking.reduce((count, booking) => {
                            if (booking.paymentStatus === false) {
                                const fareData = booking.listFareData;
                                if (fareData && fareData.length > 0) {
                                    fareData.forEach(fare => {
                                        count += (fare.adt || 0) + (fare.chd || 0) + (fare.inf || 0);
                                    })
                                }
                            }
                            return count;
                        }, 0);
                        await User.findByIdAndUpdate(
                            { _id: userId },
                            {
                                $set: {
                                    orderNumber: paidBookingsCount + unpaidBookingsCount,
                                    unpaid: unpaidBookingsCount,
                                }
                            }
                        );
                    } else {
                        let unpaidBookingsCount = 0;
                        let paidBookingsCount = 0;
                        listBooking.forEach(booking => {
                            if (booking.paymentStatus === false) {
                                unpaidBookingsCount++;
                            } else {
                                paidBookingsCount++
                            }
                        });
                        await User.findByIdAndUpdate(
                            { _id: userId },
                            {
                                $set: {
                                    orderNumber: paidBookingsCount + unpaidBookingsCount,
                                    unpaid: unpaidBookingsCount,
                                }
                            }
                        );
                    }
                    res.status(200).json({ message: 'Xóa thành công.' });
                } else {
                    res.status(404).json({ message: 'Đặt chỗ không tồn tại hoặc không thể cập nhật.' });
                }
            } else {
                res.status(404).json({ message: 'Người dùng không tồn tại.' });
            }
        })
    } catch (error) {
        res.status(500).json({ error: 'Không thể xóa đặt chỗ.' });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { bookingId, newStatus } = req.body;
        const token = req.headers.authorization;
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Token không hợp lệ' });
            }
            if (user && user.accountType === 'admin') {
                await Booking.findByIdAndUpdate(
                    { _id: bookingId },
                    { paymentStatus: newStatus }
                )
                res.status(200).json({ message: 'Cập nhật thành công' })
            } else {
                res.status(400).json({
                    message: 'Bạn không có quyền.'
                });
            }
        })
    } catch (error) {
        res.status(500).json({ error: 'Không thể cập nhật trạng thái thanh toán.' });
    }
};

exports.deleteBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ' });
            }

            if (user && user.accountType === 'admin') {
                const updatedBooking = await Booking.findByIdAndDelete(
                    { _id: bookingId }
                );

                if (updatedBooking) {
                    res.status(200).json(updatedBooking);
                } else {
                    res.status(404).json({ error: 'Đặt chỗ không tồn tại hoặc không thể cập nhật.' });
                }
            } else {
                res.status(404).json({ error: 'Người dùng không tồn tại.' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Không thể xóa đặt chỗ.' });
    }
};

const fetchFlightData = async (bookingCode, airline) => {
    if (bookingCode && airline) {
        try {
            const res = await axios.post(`https://khodosi.com/bookings/xuatve2.php?madatcho=${bookingCode}&hang=${airline}`)
            if (res.data && res.data.status === 'Đã xuất vé thành công') {
                return res.data.status
            }
            return 'Xuất vé không thành công.'
        } catch (error) {
            return 'Xuất vé không thành công.'
        }
    }
    return 'Không có bookingCode hoặc airline'
}

exports.exportTicket = async (req, res) => {
    try {
        const { userId, bookingId, ticketPrice } = req.body;

        // Find the user
        const user = await User.findOne({ _id: userId });

        if (!user) {
            res.status(404).json({ error: 'Người dùng không tồn tại.' });
            return;
        }

        if (user.accountType !== 'admin' && user.balance < ticketPrice) {
            res.status(400).json({ error: 'Số dư không đủ để thanh toán.' });
            return;
        }

        const getBooking = await Booking.findById({
            _id: bookingId
        })

        if (!getBooking) {
            res.status(404).json({ error: 'Không tìm thấy booking hoặc không có quyền truy cập.' });
            return;
        }

        if (!user) {
            res.status(404).json({ error: 'Bạn chưa đăng nhập.' });
            return;
        }

        let paidBookingsCount = 0;
        let unpaidBookingsCount = 0
        if (user && user.accountType === 'agent') {
            const listBookings = await Booking.find({
                userEmail: user.email
            })
            const paid = listBookings.reduce((count, booking) => {
                if (booking.paymentStatus === true) {
                    const fareData = booking.listFareData;
                    if (fareData && fareData.length > 0) {
                        fareData.forEach(fare => {
                            count += (fare.adt || 0) + (fare.chd || 0) + (fare.inf || 0);
                        })
                    }
                }
                return count;
            })

            const unpaid = listBookings.reduce((count, booking) => {
                if (booking.paymentStatus === false) {
                    const fareData = booking.listFareData;
                    if (fareData && fareData.length > 0) {
                        fareData.forEach(fare => {
                            count += (fare.adt || 0) + (fare.chd || 0) + (fare.inf || 0);
                        })
                    }
                }
                return count;
            })
            paidBookingsCount = paid;
            unpaidBookingsCount = unpaid;
        } else {
            const emailBooking = getBooking.userEmail
            const listBookings = await Booking.find({
                userEmail: emailBooking
            })
            const paid = listBookings.reduce((count, booking) => {
                if (booking.paymentStatus === true) {
                    count++;
                }
                return count;
            })
            const unpaid = listBookings.reduce((count, booking) => {
                if (booking.paymentStatus === false) {
                    count++;
                }
                return count;
            })
            paidBookingsCount = paid;
            unpaidBookingsCount = unpaid;
        }

        let rank = user.rank;
        if (user && user.accountType === 'agent') {
            if (paidBookingsCount >= 5000) {
                rank = 'ruby';
            } else if (paidBookingsCount >= 2000) {
                rank = 'diamond';
            } else if (paidBookingsCount >= 200) {
                rank = 'platinum';
            } else if (paidBookingsCount >= 5) {
                rank = 'gold';
            }
        } else if (!user || (user && user.accountType == 'user')) {
            if (paidBookingsCount >= 30) {
                rank = 'ruby';
            } else if (paidBookingsCount >= 10) {
                rank = 'platinum';
            } else if (paidBookingsCount >= 2) {
                rank = 'gold';
            }
        } else if (user && user.accountType === 'admin') {
            rank = 'admin'
        }

        let statusMessage = ''

        const userUpdate = {
            orderNumber: paidBookingsCount + unpaidBookingsCount,
            paid: paidBookingsCount,
            unpaid: unpaidBookingsCount,
            rank: rank,
            balance: user.accountType !== 'admin' ? user.balance -= ticketPrice : 0
        };
        const isEx = getBooking.listFareData.every((element) => element.bookingCode != null && element.airline != null)
        if (isEx) {
            const responses = await Promise.all(getBooking.listFareData.map((element) => fetchFlightData(element.bookingCode, element.airline)))
            const isMatch = responses.every((ele) => ele === 'Đã xuất vé thành công')
            if (isMatch) {
                await Booking.findByIdAndUpdate(
                    { _id: bookingId },
                    { paymentStatus: true },
                );
                await Booking.findByIdAndUpdate(
                    { _id: bookingId },
                    { ticketingStatus: true },
                );
                statusMessage = 'Xuất vé thành công'
            } else {
                statusMessage = 'Xuất vé không thành công'
            }
            await User.findByIdAndUpdate(userId, { $set: userUpdate });
        } else {
            statusMessage = 'Vé cần có đủ bookingCode mới có thể xuất vé.'
        }
        res.status(200).json({ message: statusMessage });
    } catch (error) {
        res.status(500).json({ error: 'Không thể xuất vé.' });
    }
};

exports.updateTicketingStatus = async (req, res) => {
    try {
        const { bookingId, ticketingStatus } = req.body;
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ message: 'Không có token xác thực' });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Token không hợp lệ' });
            }
            const bookingExists = await Booking.exists({ _id: bookingId });

            if (user.accountType === 'admin') {
                if (!bookingExists) {
                    return res.status(404).json({ message: 'Đặt chỗ không tồn tại hoặc không thể cập nhật.' });
                }

                const updatedBooking = await Booking.findByIdAndUpdate(
                    { _id: bookingId },
                    { ticketingStatus: ticketingStatus }
                );

                if (!updatedBooking) {
                    return res.status(404).json({ message: 'Đặt chỗ không tồn tại hoặc không thể cập nhật.' });
                }
                return res.status(200).json({ message: 'Cập nhật thành công' })
            } else {
                return res.status(400).json({
                    message: 'Bạn không có quyền.'
                });
            }
        })
    } catch (error) {
        res.status(500).json({ error: 'Không thể cập nhật trạng thái thanh toán.' });
    }
};

exports.getBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const userBooking = await Booking.findOne(
            { _id: bookingId },
        );
        if (userBooking) {
            res.status(200).json(userBooking);
        } else {
            res.status(404).json({ message: 'Không tìm thấy booking.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy chi tiết booking.' });
    }
};

exports.getAllBookingsByEmail = async (req, res) => {
    try {
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ' });
            }

            if (user.accountType !== 'admin') {
                return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
            }

            // Check if an email parameter is provided in the request query
            const { email } = req.body;

            if (email) {
                // Get the user by email
                const userByEmail = await User.findOne(
                    { email: email }
                )

                if (userByEmail) {

                    if (!userByEmail) {
                        return res.status(404).json({ error: 'Người dùng không tồn tại' });
                    }

                    // Retrieve all bookings for the user
                    const userBookings = await Booking.findOne({ userId: userByEmail._id }, 'listBooking') ?? [];
                    return res.status(200).json(userBookings.listBooking);
                } else {
                    return res.status(200).json([]);
                }


            } else {
                // If no email is provided, retrieve all bookings
                const allBookings = await Booking.findOne({ userId: user._id }, 'listBooking') ?? [];

                return res.status(200).json(allBookings.listBooking);
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu đặt chỗ.' });
    }
};

exports.getInvoice = async (req, res) => {
    try {
        const token = req.headers.authorization;

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({
                    message: 'Token không hợp lệ'
                })
            }
            if (user.accountType !== 'admin') {
                return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
            }

            const { size, page } = req.query;

            const currentPage = parseInt(page)

            const length = (await Booking.aggregate([
                { $match: { invoiceRequest: true } }
            ])).length

            const listInvoice = await Booking.aggregate([
                { $match: { invoiceRequest: true } },
                { $skip: parseInt((currentPage - 1) * parseInt(size)) },
                { $limit: parseInt(size) }
            ])
            return res.status(200).json({
                listInvoice: listInvoice,
                length: length
            })
        })
    } catch (error) {
        return res.status(500).json({
            error: 'Không thể lấy yêu cầu xuất hóa đơn.'
        })
    }
}