const mongoose = require('mongoose');
const MinPrice = require('../model/listMinPrice');
const dotenv = require('dotenv');
const dayjs = require('dayjs');
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

exports.getListPrice = async (req, res) => {
    try {
        const { 
            startPoint,
            endPoint,
            departDate,
         } = req.query;

         const departDateObj = dayjs(departDate, 'DDMMYYYY')
         const lastDayOfMonth = departDateObj.endOf('month')

        const listData = await MinPrice.aggregate([
            {
                $match: {
                    startDate: {
                      $gte: departDateObj.toDate(),
                      $lte: lastDayOfMonth.toDate(),
                    },
                    startPoint: startPoint,
                    endPoint: endPoint
                  },
            }
        ])
        res.status(201).json(listData);
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ li.' });
    }
}