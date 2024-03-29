const express = require('express')
require('dotenv').config();
const bodyParser = require('body-parser')
const cors = require('cors')
const axios = require('axios');
const schedule = require('node-schedule');
const User = require('./model/userInf')
const MinPrice = require('./model/listMinPrice');
const Transaction = require('./model/transaction');
const Booking = require('./model/bookingModel');
const compression = require('compression');
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const app = express()
const route = require('./routes/route');
const POST = 7777

app.use(cors())
app.use(compression());
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use('/api', route)

app.get('/', function (req, res) {
    res.send("We are on home")
})

const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
    cors: {
        origin: "https://gotrip-client-e0yo.onrender.com",
        methods: ["GET", "POST"]
    }
});

const extractBookingIdFromDescription = (description) => {
    const regex = /BK(\d+)/;
    const match = description.match(regex);

    if (match && match[1]) {
        return match[1];
    }

    return null;
};

const extractBlanceIdFromDescription = (description) => {
    const regex = /AG(\d+)/;
    const match = description.match(regex);

    if (match && match[1]) {
        return match[1];
    }

    return null;
};


const updateBlanceByTransaction = async (transaction) => {
    try {
        const { creditAmount, description } = transaction;
        const identifier = extractBlanceIdFromDescription(description);
        if (!identifier) {
            return '';
        }
        const existingUser = await User.findOne(
            { identifier: identifier }
        );

        if (!existingUser) {
            return '';
        }

        existingUser.balance += Number(creditAmount);

        await existingUser.save();

        return identifier

    } catch (error) {
        return ''
    }
}

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

const updateBookingByTransaction = async (transaction) => {
    try {
        const { creditAmount, description } = transaction;

        // Trích xuất bookingId từ mô tả
        const bookingId = extractBookingIdFromDescription(description);

        if (!bookingId) {
            return;
        }

        const existingBooking = await Booking.find({
            _id: bookingId
        });

        if (!existingBooking) {
            return;
        }
        const bookingExists = await Booking.findById({
            _id: bookingId
        });

        if (bookingExists) {
            const userId = bookingExists.userId
            const existingUser = await User.findOne(
                { email: bookingExists.userEmail }
            );

            if (!bookingExists) {
                return res.status(404).json({ error: 'Đặt chỗ không tồn tại hoặc không thể cập nhật.' });
            }

            const newPaymentStatus = Number(creditAmount) === Number(bookingExists.pricePayment);
            const updatedBooking = await Booking.findByIdAndUpdate(
                { _id: bookingId },
                { paymentStatus: newPaymentStatus },
            );

            if (!updatedBooking) {
                return res.status(404).json({ error: 'Đặt chỗ không tồn tại hoặc không thể cập nhật.' });
            }

            let paidBookingsCount = 0;
            let unpaidBookingsCount = 0
            if (existingUser && existingUser.accountType === 'agent') {
                if (updatedBooking.paymentStatus) {
                    const paid = updatedBooking.listFareData.reduce((count, fare) => {
                        count += (fare.adt || 0) + (fare.chd || 0) + (fare.inf || 0);
                    }, 0);
                    paidBookingsCount = paid
                } else {
                    const unpaid = updatedBooking.listFareData.reduce((count, fare) => {
                        count += (fare.adt || 0) + (fare.chd || 0) + (fare.inf || 0);
                    }, 0);
                    unpaidBookingsCount = unpaid
                }


            } else if (!existingUser || (existingUser && existingUser.accountType !== 'agent')) {
                if (updatedBooking.paymentStatus) {
                    paidBookingsCount = paidBookingsCount + 1
                }
            }

            let rank = 'silver';
            if (existingUser && existingUser.accountType === 'agent') {
                if (paidBookingsCount >= 5000) {
                    rank = 'ruby';
                } else if (paidBookingsCount >= 2000) {
                    rank = 'diamond';
                } else if (paidBookingsCount >= 200) {
                    rank = 'platinum';
                } else if (paidBookingsCount >= 5) {
                    rank = 'gold';
                }
            } else if (!existingUser || (existingUser && existingUser.accountType === 'user')) {
                if (paidBookingsCount >= 30) {
                    rank = 'ruby';
                } else if (paidBookingsCount >= 10) {
                    rank = 'platinum';
                } else if (paidBookingsCount >= 2) {
                    rank = 'gold';
                }
            }

            const userUpdate = {
                orderNumber: paidBookingsCount + unpaidBookingsCount,
                paid: paidBookingsCount,
                unpaid: unpaidBookingsCount,
                rank: rank
            };

            if (newPaymentStatus) {
                const fareData = bookingExists.listFareData;
                const isEx = fareData.every((element) => element.bookingCode != null && element.airline != null)
                if (fareData && fareData.length > 0 && isEx) {
                    const responses = await Promise.all(fareData.map((element) => fetchFlightData(element.bookingCode, element.airline)))
                    const isMatch = responses.every((ele) => ele === 'Đã xuất vé thành công')
                    if (isMatch) {
                        await Booking.findByIdAndUpdate(
                            { _id: bookingId },
                            { ticketingStatus: true },
                        );
                    }
                }
            }

            await User.findByIdAndUpdate(userId, { $set: userUpdate });

        }
    } catch (error) {
        console.error('Đã xảy ra lỗi khi cập nhật booking:', error);
        throw error;
    }
};

let sessionId = ''
let deviceIdCommon = ''
let callAgain = true;
let isHasKey = false;
let callUpdateTransacion = false;

const fetchKey = async () => {
    try {
        callAgain = false
        const res = await axios.get('https://khodosi.com/bookings/getsession.php');
        const rawData = res.data;
        const sessionIdMatch = rawData.match(/"sessionId": "([^"]+)"/);
        const deviceIdCommonMatch = rawData.match(/"deviceIdCommon": "([^"]+)"/);

        if (sessionIdMatch && deviceIdCommonMatch) {
            const sessionIdf = sessionIdMatch[1];
            const deviceIdCommonf = deviceIdCommonMatch[1];
            sessionId = sessionIdf
            deviceIdCommon = deviceIdCommonf
            // console.log(deviceIdCommonf, sessionIdf)
            isHasKey = true
            callAgain = false
            callUpdateTransacion = true
        } else {
            console.error('Data not found in the response.');
            callAgain = true
            isHasKey = false
            callUpdateTransacion = false
        }
    } catch (error) {
        console.error('Error fetching key:', error.message);
        sessionId = ''
        deviceIdCommon = ''
        callAgain = true
        isHasKey = false
        callUpdateTransacion = false
    }
};

const updateTransacion = async () => {
    try {
        const currentDate = new Date();
        const toDate = new Date().toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        currentDate.setDate(currentDate.getDate() - 1);

        const fromDate = currentDate.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const taikhoanmb = '0984227777';
        const sotaikhoanmb = '0984227777';
        const apiResponse = await axios.post('https://online.mbbank.com.vn/api/retail-web-transactionservice/transaction/getTransactionAccountHistory', {
            accountNo: sotaikhoanmb,
            deviceIdCommon: deviceIdCommon,
            fromDate: fromDate,
            historyNumber: '',
            historyType: 'DATE_RANGE',
            refNo: `${taikhoanmb}-${toDate}`,
            sessionId: sessionId,
            toDate: toDate,
            type: 'ACCOUNT'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'vi-US,vi;q=0.9',
                'Authorization': 'Basic QURNSU46QURNSU4=',
                'Connection': 'keep-alive',
                'Host': 'online.mbbank.com.vn',
                'Origin': 'https://online.mbbank.com.vn',
                'Referer': 'https://online.mbbank.com.vn/information-account/source-account',
                'sec-ch-ua': '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
            }
        });
        const response = apiResponse.data;
        // console.log(response.result.ok)
        if (response.result.ok === false) {
            await fetchKey()
            return
        }
        if (response.result.ok === true) {
            const existingBooking = await Transaction.find() ?? [];
            const existingTransactionList = existingBooking
            const responseTransactionList = response.transactionHistoryList;
            if (responseTransactionList.length > 0) {
                const differentTransactions = [];
                for (const responseTransaction of responseTransactionList) {
                    let found = false;
                    for (const existingTransaction of existingTransactionList) {
                        if (existingTransaction.description === responseTransaction.description) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        const dateString = responseTransaction.transactionDate ?? '';
                        const ddmmyyyy = dayjs(dateString, 'DD/MM/YYYY HH:mm:ss').format('YYYYMMDD')
                        responseTransaction.transactionDateFormat = parseInt(ddmmyyyy)
                        differentTransactions.push(responseTransaction);
                    }
                }

                await Transaction.insertMany(differentTransactions)

                if (differentTransactions.length > 0) {
                    differentTransactions.forEach(async (transaction) => {
                        await updateBookingByTransaction(transaction);
                        const identifier = await updateBlanceByTransaction(transaction)
                        if (identifier !== '') {
                            io.emit('identifier', identifier);
                        }
                    });
                    io.emit('transactions', differentTransactions);
                    console.log('Update')
                } else {
                    if (io.sockets.server.engine.clientsCount > 0) {
                        io.close();
                    }
                    console.log('No update')
                }
            }
        }

    } catch (error) {
        console.error('Error calling API:', error.message);
    } finally {
        callUpdateTransacion = true
        // console.log('Hoàn tất công việc')
    }
}

schedule.scheduleJob('*/15 * * * * *', async () => {
    // console.log('callAgain', callUpdateTransacion, isHasKey)

    if (isHasKey === false) {
        await fetchKey()
        return;
    }
    
    if (callUpdateTransacion === false && isHasKey === true) {
        console.log('Công việc đang chạy, bỏ qua lần chạy mới')
        return;
    }

    if (callUpdateTransacion === true & isHasKey === true) {
        await updateTransacion()
        return;
    }
});

const fetchFlightPrice = async (item, headers) => {
    return (await axios.post("http://plugin.datacom.vn/flightmonth", item, {
        headers: headers
    })).data;
};

const updateListPrice = async () => {
    try {
        console.log('Đang cập nhật danh sách giá');

        const today = dayjs();
        const inputArray = ["HAN", "DAD", "CXR", "SGN", "VCL"];
        let targetMonth = parseInt(today.format("MM"), 10);
        let targetYear = parseInt(today.format("YYYY"));
        const data = [];
        const headers = {};

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < inputArray.length; j++) {
                for (let k = j; k < inputArray.length; k++) {
                    const productKey = "r1e0q6z8md6akul";
                    const monthValue = targetMonth;
                    const yearValue = parseInt(targetYear);
                    const startPoint = inputArray[j];
                    const endPoint = inputArray[k];

                    const responses = await fetchFlightPrice({
                        ProductKey: productKey,
                        StartPoint: startPoint,
                        EndPoint: endPoint,
                        Month: monthValue,
                        Year: `${yearValue}`,
                    }, headers);
                    if (responses.ListFare && Array.isArray(responses.ListFare)) {
                        const modifiedListFare = responses.ListFare.map(fare => ({
                            ...fare,
                            StartPoint: startPoint,
                            EndPoint: endPoint,
                            DepartDate: parseInt(dayjs(fare.DepartDate, 'DDMMYYYY').format('YYYYMMDD')),
                            Month: monthValue,
                            Day: parseInt(dayjs(fare.DepartDate, 'DDMMYYYY').format("DD"), 10),
                            Year: yearValue
                          }));
                        data.push(...modifiedListFare);
                    }
                }
            }

            if (targetMonth === 12) {
                targetMonth = 1;
                targetYear++;
            } else {
                targetMonth = (targetMonth + 1);
            }
        }

        const existValue = await MinPrice.count();
        if (existValue > 0) {
            await MinPrice.deleteMany();
            await MinPrice.insertMany(data);
        } else {
            await MinPrice.insertMany(data);
        }

    } catch (error) {
        console.error({ error: 'Không thể cập nhật dữ liệu mới.' }, error);
    } finally {
        console.log('Cập nhật giá kết thúc');
    }
}

schedule.scheduleJob('11 * * * *', async () => {
    try {
        await updateListPrice();
    } catch (error) {
        console.error("Cập nhật danh sách giá rẻ thất bại", error);
    }
});

httpServer.listen(POST, () => {
    console.log(`The server is running on ${POST}`);
});