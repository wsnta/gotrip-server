const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios');
const MinPrice = require('../model/listMinPrice');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
dotenv.config();

exports.getListPrice = async (req, res) => {
    try {
        const { DepartDate, startPoint, endPoint, skipReq, limit } = req.query;

        let query = {
            StartPoint: startPoint,
            EndPoint: endPoint,
        }

        const totalCount = await MinPrice.countDocuments(query)

        let skip = (await MinPrice.aggregate([{
            $match: query,
        }])).findIndex(
            (item) => item.DepartDate === parseInt(dayjs(DepartDate, 'DDMMYYYY').format('YYYYMMDD')))
        
        if(skipReq){
            skip = parseInt(skipReq)
        }
       
        const results = await MinPrice.aggregate([
            {
                $match: query,
            },
            { $skip: skip },
            { $limit: parseInt(limit) },
        ])

        res.json({
            prices: results,
            message: '',
            totalCount: totalCount,
            targetSkip: skip
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Đã xảy ra lỗi' });
    }
}

exports.getListPriceCalendar = async (req, res) => {
    try {
        const month = dayjs(req.query.month, "DDMMYYYY").format('MM') || dayjs().format('MM');
        const startPoint = req.query.startPoint || ''
        const endPoint = req.query.endPoint || ''
        const data = await MinPrice.find({
            StartPoint: startPoint,
            EndPoint: endPoint
        });

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu.' + error });
    }
}
