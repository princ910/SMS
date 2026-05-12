const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const getAttendance = async (req, res) => {
    try {
        const { date, class: className, section } = req.query;
        let query = `
            SELECT a.*, s.name as student_name, s.class, s.section, s.roll_number
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            WHERE 1=1
        `;
        const params = [];
        
        if (date) {
            query += ' AND a.date = ?';
            params.push(date);
        }
        if (className) {
            query += ' AND s.class = ?';
            params.push(className);
        }
        if (section) {
            query += ' AND s.section = ?';
            params.push(section);
        }
        
        query += ' ORDER BY s.roll_number';
        
        const [attendance] = await pool.query(query, params);
        res.json({ success: true, data: attendance });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const markAttendance = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { date, attendance_records } = req.body;
        
        for (const record of attendance_records) {
            await connection.query(
                `INSERT INTO attendance (student_id, date, status, remarks, marked_by)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)`,
                [record.student_id, date, record.status, record.remarks, req.user.id]
            );
        }
        
        await connection.commit();
        res.json({ success: true, message: 'Attendance saved successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};

const getStudentsForAttendance = async (req, res) => {
    try {
        const { class: className, section } = req.query;
        let query = 'SELECT student_id, name, class, section, roll_number FROM students WHERE status = "active"';
        const params = [];
        
        if (className) {
            query += ' AND class = ?';
            params.push(className);
        }
        if (section) {
            query += ' AND section = ?';
            params.push(section);
        }
        
        query += ' ORDER BY roll_number';
        
        const [students] = await pool.query(query, params);
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getAttendanceSummary = async (req, res) => {
    try {
        const { class: className, month, year } = req.query;
        
        let query = `
            SELECT
                s.student_id,
                s.name,
                s.roll_number,
                COUNT(a.id) as total_days,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2) as percentage
            FROM students s
            LEFT JOIN attendance a ON s.student_id = a.student_id
            WHERE s.status = 'active'
        `;
        const params = [];
        
        if (className) {
            query += ' AND s.class = ?';
            params.push(className);
        }
        if (month && year) {
            query += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?';
            params.push(month, year);
        }
        
        query += ' GROUP BY s.id ORDER BY s.roll_number';
        
        const [summary] = await pool.query(query, params);
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getAttendance,
    markAttendance,
    getStudentsForAttendance,
    getAttendanceSummary
};