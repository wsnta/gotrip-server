const mongoose = require('mongoose');
const MinPrice = require('../model/listMinPrice');
const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios')
const fetch = require('node-fetch');
const schedule = require('node-schedule');
const UserAgent = require('user-agents');
const userAgent = new UserAgent();
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
dotenv.config();

const fetchFlightData = async (item, headers) => {
    return (await axios.post("http://plugin.datacom.vn/flightmonth", item, {
        headers: headers
    })).data;
};

// const fetchRequests = [];

// for (let j = 0; j < inputArray.length; j++) {
//     for (let k = j; k < inputArray.length; k++) {
//         const productKey = "r1e0q6z8md6akul";
//         const monthValue = targetMonth;
//         const yearValue = parseInt(targetYear);
//         const startPoint = inputArray[j];
//         const endPoint = inputArray[k];

//         const request = fetchFlightData({
//             ProductKey: productKey,
//             StartPoint: startPoint,
//             EndPoint: endPoint,
//             Month: monthValue,
//             Year: `${yearValue}`,
//         }, headers);

//         fetchRequests.push(request);
//     }
// }

// const responses = await Promise.all(fetchRequests);
// for (const response of responses) {
//     data.push(...response.ListFare);
// }

const updateListPrice = async () => {
    try {
        console.log('Đang cập nhật danh sách giá');

        const today = dayjs();
        const inputArray = ["HAN", "DAD", "CXR", "SGN", "VCL"];
        const targetMonth = today.format("MM");
        const targetYear = today.format("YYYY");
        const data = [];
        const headers = {};

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < inputArray.length; j++) {
                for (let k = j; k < inputArray.length; k++) {
                    const productKey = "r1e0q6z8md6akul";
                    const monthValue = targetMonth;
                    const yearValue = parseInt(targetYear);
                    const startPoint = inputArray[j];
                    const endPoint = inputArray[k];

                    const responses = await fetchFlightData({
                        ProductKey: productKey,
                        StartPoint: startPoint,
                        EndPoint: endPoint,
                        Month: monthValue,
                        Year: `${yearValue}`,
                    }, headers);

                    data.push(...responses.ListFare);
                }
            }

            if (targetMonth === "12") {
                targetMonth = "01";
                targetYear++;
            } else {
                targetMonth = (parseInt(targetMonth) + 1).toString().padStart(2, '0');
            }
        }

        const existValue = await MinPrice.countDocuments();
        if (existValue > 0) {
            await MinPrice.deleteMany();
        }
        await MinPrice.insertMany(data);

    } catch (error) {
        console.error({ error: 'Không thể cập nhật dữ liệu mới.' }, error);
    }
}

// schedule.scheduleJob('0 */2 * * *', async () => {
//     try {
//         await updateListPrice();
//     } catch (error) {
//         console.error("Cập nhật danh sách giá rẻ thất bại", error);
//     }
// });

schedule.scheduleJob('0 * * * *', async () => {
    try {
        await updateListPrice();
    } catch (error) {
        console.error("Cập nhật danh sách giá rẻ thất bại", error);
    }
});

exports.getListPrice = async (req, res) => {
    try {
        const {
            startPoint,
            endPoint,
            departDate,
        } = req.query;

        const dateObject = dayjs(departDate, "DDMMYYYY");

        const targetMonth = dateObject.format("MM");
        const targetYear = dateObject.format("YYYY");

        const data = [];

        let month = targetMonth.padStart(2, '0');
        let year = parseInt(targetYear);

        for (let i = 0; i < 2; i++) {
            const productKey = "r1e0q6z8md6akul";
            const monthValue = month;
            const yearValue = year;
            data.push({
                ProductKey: productKey,
                StartPoint: startPoint,
                EndPoint: endPoint,
                Month: monthValue,
                Year: yearValue,
            });

            if (month === "12") {
                month = "01";
                year++;
            } else {
                month = (parseInt(month) + 1).toString().padStart(2, '0');
            }
        }

        const headers = {
            // "Accept": "*/*",
            // "Accept-Encoding": "gzip, deflate",
            // "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            // "Connection": "keep-alive",
            // "Content-Length": JSON.stringify(data).length,
            // "Content-Type": "application/json; charset=UTF-8",
            // "Host": "plugin.datacom.vn",
            // "Origin": "http://wpv08.webphongve.vn",
            // "Referer": "http://wpv08.webphongve.vn/",
            // "User-Agent": navigator.userAgent,
        };

        const responses = await Promise.all(data.map((item) => fetchFlightData(item, headers)));
        const mergedListFare = responses.reduce((accumulator, currentObject) => {
            return accumulator.concat(currentObject.ListFare);
        }, []);

        res.status(201).json(mergedListFare);
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ lieu.' });
    }
}