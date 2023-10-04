const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios');
const MinPrice = require('../model/listMinPrice');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
dotenv.config();

exports.getListPrice = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const itemsPerPage = req.query.itemsPerPage || 5;
        const month = dayjs(req.query.departDate, "DDMMYYYY").format('MM') || dayjs().format('MM');
        const day = dayjs(req.query.departDate, "DDMMYYYY").format('DD') || dayjs().format('DD');
        const startPoint = req.query.startPoint || '';
        const endPoint = req.query.endPoint || '';
        
        const totalCount = await MinPrice.countDocuments({
            Month: parseInt(month),
            StartPoint: startPoint,
            EndPoint: endPoint
        });

        const startIndex = (page - 1) * itemsPerPage;
        
        const endIndex = page * itemsPerPage;

        const data = await MinPrice.find({
            Month: {$gte: parseInt(month) - 1},
            StartPoint: startPoint,
            EndPoint: endPoint,
            Day: {$gte: parseInt(day) - 1}
        }).skip(startIndex).limit(itemsPerPage);

        const totalPages = Math.ceil(totalCount / itemsPerPage);

        res.json({
            data: data,
            totalPages: totalPages,
            totalCount: totalCount,
            currentPage: page,
            endIndex: endIndex
        });

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu.' + error });
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
