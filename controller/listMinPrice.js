const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios');
const MinPrice = require('../model/listMinPrice');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
dotenv.config();

exports.getListPrice = async (req, res) => {
    try {
        const { nextprev, DepartDate, startPoint, endPoint } = req.query;
        const limit = 5;

        // Chuyển định dạng của departDate từ YYYYMMDD thành một số để so sánh
        const formattedDepartDate = dayjs(DepartDate, 'DDMMYYYY').format('YYYYMMDD');

        let query = {
            DepartDate: { $gte: formattedDepartDate },
            StartPoint: startPoint,
            EndPoint: endPoint
        };

        const totalCount = await MinPrice.countDocuments(query)

        let results = await MinPrice.find(query).sort({ DepartDate: 1 })

        if (results.length < 5) {
            const newResults = await MinPrice.find({
                DepartDate: { $lte: formattedDepartDate },
                StartPoint: startPoint,
                EndPoint: endPoint
            }).sort({ DepartDate: 1 })
            results = [...results,...newResults]
        }

        res.json({
            prices: results,
            message: '',
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
