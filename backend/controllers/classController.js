const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
const getClasses = async (req, res) => {
    try {
        const { academic_year } = req.query;
        
        let query = `
            SELECT c.*, t.name as teacher_name,
                   COUNT(DISTINCT s.id) as student_count
            FROM classes c
            LEFT JOIN teachers t ON c.class_teacher_id = t.id
            LEFT JOIN students s ON s.class = c.class_name AND s.section = c.section
        `;
        const params = [];
        
        if (academic_year) {
            query += ' WHERE c.academic_year = ?';
            params.push(academic_year);
        }
        
        query += ' GROUP BY c.id ORDER BY c.class_name, c.section';
        
        const [classes] = await pool.query(query, params);
        
        res.json({
            success: true,
            data: classes
        });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
const getClassById = async (req, res) => {
    try {
        const [classes] = await pool.query(
            `SELECT c.*, t.name as teacher_name,
                    COUNT(DISTINCT s.id) as student_count
             FROM classes c
             LEFT JOIN teachers t ON c.class_teacher_id = t.id
             LEFT JOIN students s ON s.class = c.class_name AND s.section = c.section
             WHERE c.id = ?
             GROUP BY c.id`,
            [req.params.id]
        );
        
        if (classes.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Class not found'
            });
        }
        
        // Get students in this class
        const [students] = await pool.query(
            `SELECT id, student_id, name, roll_number, parent_phone, email
             FROM students
             WHERE class = ? AND section = ? AND status = 'active'
             ORDER BY roll_number`,
            [classes[0].class_name, classes[0].section]
        );
        
        // Get timetable/subjects for this class
        const [subjects] = await pool.query(
            `SELECT s.*, t.name as teacher_name
             FROM subjects s
             LEFT JOIN teachers t ON s.teacher_id = t.id
             WHERE s.class = ?
             ORDER BY s.subject_name`,
            [classes[0].class_name]
        );
        
        res.json({
            success: true,
            data: { ...classes[0], students, subjects }
        });
    } catch (error) {
        console.error('Get class error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res) => {
    try {
        const {
            class_name, section, class_teacher_id, room_number,
            capacity, academic_year, description
        } = req.body;
        
        // Check if class already exists for this academic year
        const [existing] = await pool.query(
            'SELECT id FROM classes WHERE class_name = ? AND section = ? AND academic_year = ?',
            [class_name, section, academic_year]
        );
        
        if (existing.length > 0) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'Class already exists for this academic year'
            });
        }
        
        const [result] = await pool.query(
            `INSERT INTO classes (
                class_name, section, class_teacher_id, room_number,
                capacity, academic_year, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [class_name, section, class_teacher_id, room_number, capacity, academic_year, description]
        );
        
        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Class created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create class error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private/Admin
const updateClass = async (req, res) => {
    try {
        const {
            class_name, section, class_teacher_id, room_number,
            capacity, description
        } = req.body;
        
        const [result] = await pool.query(
            `UPDATE classes SET
                class_name = ?, section = ?, class_teacher_id = ?,
                room_number = ?, capacity = ?, description = ?
             WHERE id = ?`,
            [class_name, section, class_teacher_id, room_number, capacity, description, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Class not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Class updated successfully'
        });
    } catch (error) {
        console.error('Update class error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Class not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Class deleted successfully'
        });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get class students
// @route   GET /api/classes/:id/students
// @access  Private
const getClassStudents = async (req, res) => {
    try {
        const [classes] = await pool.query('SELECT class_name, section FROM classes WHERE id = ?', [req.params.id]);
        
        if (classes.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Class not found'
            });
        }
        
        const [students] = await pool.query(
            `SELECT id, student_id, name, roll_number, parent_phone, email, status
             FROM students
             WHERE class = ? AND section = ? AND status = 'active'
             ORDER BY roll_number`,
            [classes[0].class_name, classes[0].section]
        );
        
        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Get class students error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    getClassStudents
};