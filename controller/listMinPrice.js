const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios')
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