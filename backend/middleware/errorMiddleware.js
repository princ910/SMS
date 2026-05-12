const { HTTP_STATUS } = require('../config/constants');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: 'Duplicate entry found'
        });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: err.message || 'Server Error'
    });
};

const notFound = (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Cannot ${req.method} ${req.url}`
    });
};

module.exports = { errorHandler, notFound };