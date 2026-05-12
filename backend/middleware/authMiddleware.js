const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query(
            'SELECT id, username, email, full_name, role FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.id]
        );
        
        if (users.length === 0) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'User not found or inactive'
            });
        }
        
        req.user = users[0];
        next();
    } catch (error) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: `Role ${req.user.role} is not authorized`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };