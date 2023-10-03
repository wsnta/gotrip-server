const dotenv = require('dotenv');
const dayjs = require('dayjs');
const axios = require('axios')
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
dotenv.config();

exports.getListPrice = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const itemsPerPage = req.query.itemsPerPage || 6;

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = page * itemsPerPage;

        const data = await MinPrice.find().skip(startIndex).limit(itemsPerPage);

        const totalCount = await MinPrice.count();
        const totalPages = Math.ceil(totalCount / itemsPerPage);

        res.json({
            data: data,
            totalPages: totalPages,
            currentPage: page,
            endIndex: endIndex
        });

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu.' });
    }
}