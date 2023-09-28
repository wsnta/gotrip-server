const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = (requiredRole) => {
    return (req, res, next) => {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Không có token xác thực' });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ' });
            }

            if (user.accountType !== requiredRole) {
                return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
            }

            req.user = user;
            next();
        });
    };
};

