const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { protect, authorize } = require('../middleware/authMiddleware');
const { HTTP_STATUS } = require('../config/constants');

router.use(protect);

// Get all classes
router.get('/', async (req, res) => {
    try {
        const [classes] = await pool.query(`
            SELECT c.*, t.name as teacher_name, COUNT(s.id) as student_count
            FROM classes c
            LEFT JOIN teachers t ON c.class_teacher_id = t.id
            LEFT JOIN students s ON s.class = c.class_name AND s.section = c.section
            GROUP BY c.id
            ORDER BY c.class_name
        `);
        res.json({ success: true, data: classes });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
});

// Get single class
router.get('/:id', async (req, res) => {
    try {
        const [classes] = await pool.query(`
            SELECT c.*, t.name as teacher_name
            FROM classes c
            LEFT JOIN teachers t ON c.class_teacher_id = t.id
            WHERE c.id = ?
        `, [req.params.id]);
        
        if (classes.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Class not found' });
        }
        
        const [students] = await pool.query(
            'SELECT id, student_id, name, roll_number FROM students WHERE class = ? AND section = ? AND status = "active"',
            [classes[0].class_name, classes[0].section]
        );
        
        res.json({ success: true, data: { ...classes[0], students } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
});

// Create class (admin only)
router.post('/', authorize('admin'), async (req, res) => {
    try {
        const { class_name, section, class_teacher_id, room_number, capacity, academic_year } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO classes (class_name, section, class_teacher_id, room_number, capacity, academic_year)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [class_name, section, class_teacher_id, room_number, capacity || 30, academic_year]
        );
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Class created', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
});

// Update class (admin only)
router.put('/:id', authorize('admin'), async (req, res) => {
    try {
        const { class_name, section, class_teacher_id, room_number, capacity, academic_year } = req.body;
        
        const [result] = await pool.query(
            `UPDATE classes SET class_name=?, section=?, class_teacher_id=?, room_number=?, capacity=?, academic_year=?
             WHERE id = ?`,
            [class_name, section, class_teacher_id, room_number, capacity, academic_year, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Class not found' });
        }
        
        res.json({ success: true, message: 'Class updated' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
});

// Delete class (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Class not found' });
        }
        
        res.json({ success: true, message: 'Class deleted' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;