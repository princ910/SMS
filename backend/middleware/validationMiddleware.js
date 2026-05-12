const { body, param, query, validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../config/constants');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Student validation rules
const validateStudent = [
    body('student_id').notEmpty().withMessage('Student ID is required'),
    body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('class').notEmpty().withMessage('Class is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('parent_phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('date_of_birth').optional().isDate().withMessage('Invalid date format'),
    validate
];

// Teacher validation rules
const validateTeacher = [
    body('teacher_id').notEmpty().withMessage('Teacher ID is required'),
    body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    validate
];

// Class validation rules
const validateClass = [
    body('class_name').notEmpty().withMessage('Class name is required'),
    body('capacity').optional().isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1 and 100'),
    validate
];

// Attendance validation rules
const validateAttendance = [
    body('date').isDate().withMessage('Valid date is required'),
    body('attendance_records').isArray().withMessage('Attendance records must be an array'),
    body('attendance_records.*.student_id').notEmpty().withMessage('Student ID is required'),
    body('attendance_records.*.status').isIn(['present', 'absent', 'late', 'half-day']).withMessage('Invalid status'),
    validate
];

// Pagination validation
const validatePagination = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate
];

module.exports = {
    validateStudent,
    validateTeacher,
    validateClass,
    validateAttendance,
    validatePagination
};