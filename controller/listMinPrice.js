const mongoose = require('mongoose');
const MinPrice = require('../model/listMinPrice');
const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios')
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
dotenv.config();

exports.updateListPrice = async (req, res) => {
    try {
        const { listDate } = req.body;
        const existValue = await MinPrice.countDocuments()
        if(existValue > 0){
            await MinPrice.deleteMany();
            await MinPrice.insertMany(listDate);
            res.status(201).json({ message: 'Dữ liệu mới đã được cập nhật' });
        }else{
            await MinPrice.insertMany(listDate);
            res.status(201).json({ message: 'Dữ liệu mới đã được thêm vào' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Không thể cập nhật dữ liệu mới.' });
    }
}

const fetchFlightData = async (item, headers) => {
    return (await axios.post("http://plugin.datacom.vn/flightmonth", item, {
        headers: headers
    })).data;
};

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