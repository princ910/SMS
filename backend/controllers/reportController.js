const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        // Get total counts
        const [totalStudents] = await pool.query('SELECT COUNT(*) as total FROM students WHERE status = "active"');
        const [totalTeachers] = await pool.query('SELECT COUNT(*) as total FROM teachers WHERE status = "active"');
        const [totalClasses] = await pool.query('SELECT COUNT(*) as total FROM classes');
        
        // Get today's attendance
        const today = new Date().toISOString().split('T')[0];
        const [todayAttendance] = await pool.query(
            `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'half-day' THEN 1 ELSE 0 END) as half_day
            FROM attendance
            WHERE date = ?`,
            [today]
        );
        
        // Get monthly attendance trend
        const [monthlyTrend] = await pool.query(
            `SELECT
                DATE_FORMAT(date, '%Y-%m') as month,
                ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_rate
            FROM attendance
            WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(date, '%Y-%m')
            ORDER BY month`
        );
        
        // Get class-wise student distribution
        const [classDistribution] = await pool.query(
            `SELECT class, COUNT(*) as count
            FROM students
            WHERE status = 'active'
            GROUP BY class
            ORDER BY class`
        );
        
        // Get recent activities (last 5 attendance records)
        const [recentActivities] = await pool.query(
            `SELECT a.date, a.status, s.name as student_name, s.class
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            ORDER BY a.created_at DESC
            LIMIT 5`
        );
        
        res.json({
            success: true,
            data: {
                totals: {
                    students: totalStudents[0].total,
                    teachers: totalTeachers[0].total,
                    classes: totalClasses[0].total
                },
                todayAttendance: todayAttendance[0],
                monthlyTrend,
                classDistribution,
                recentActivities
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get attendance report
// @route   GET /api/reports/attendance
// @access  Private
const getAttendanceReport = async (req, res) => {
    try {
        const { start_date, end_date, class: className, section } = req.query;
        
        let query = `
            SELECT
                s.class,
                s.section,
                COUNT(DISTINCT s.id) as total_students,
                COUNT(a.id) as total_attendance_days,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2) as attendance_percentage
            FROM students s
            LEFT JOIN attendance a ON s.student_id = a.student_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date && end_date) {
            query += ' AND a.date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        if (className) {
            query += ' AND s.class = ?';
            params.push(className);
        }
        
        if (section) {
            query += ' AND s.section = ?';
            params.push(section);
        }
        
        query += ' GROUP BY s.class, s.section ORDER BY s.class, s.section';
        
        const [report] = await pool.query(query, params);
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get attendance report error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get fee collection report
// @route   GET /api/reports/fees
// @access  Private/Admin
const getFeeReport = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT
                fee_type,
                COUNT(*) as total_invoices,
                SUM(amount) as total_amount,
                SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as collected_amount,
                SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as pending_amount,
                SUM(CASE WHEN payment_status = 'overdue' THEN amount ELSE 0 END) as overdue_amount
            FROM fees
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date && end_date) {
            query += ' AND due_date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        query += ' GROUP BY fee_type';
        
        const [report] = await pool.query(query, params);
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get fee report error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Export data
// @route   GET /api/reports/export/:type
// @access  Private
const exportData = async (req, res) => {
    try {
        const { type } = req.params;
        const { format = 'csv' } = req.query;
        
        let data = [];
        let filename = '';
        
        switch(type) {
            case 'students':
                [data] = await pool.query('SELECT * FROM students WHERE status = "active" ORDER BY student_id');
                filename = 'students_export';
                break;
            case 'teachers':
                [data] = await pool.query('SELECT * FROM teachers WHERE status = "active" ORDER BY teacher_id');
                filename = 'teachers_export';
                break;
            case 'attendance':
                [data] = await pool.query(
                    `SELECT a.*, s.name as student_name, s.class, s.section
                    FROM attendance a
                    JOIN students s ON a.student_id = s.student_id
                    ORDER BY a.date DESC
                    LIMIT 1000`
                );
                filename = 'attendance_export';
                break;
            default:
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid export type'
                });
        }
        
        if (format === 'csv') {
            // Convert to CSV
            if (data.length === 0) {
                return res.json({
                    success: true,
                    message: 'No data to export'
                });
            }
            
            const headers = Object.keys(data[0]);
            const csvRows = [];
            csvRows.push(headers.join(','));
            
            for (const row of data) {
                const values = headers.map(header => {
                    const val = row[header] || '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                });
                csvRows.push(values.join(','));
            }
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csvRows.join('\n'));
        } else {
            res.json({
                success: true,
                data
            });
        }
    } catch (error) {
        console.error('Export data error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getDashboardStats,
    getAttendanceReport,
    getFeeReport,
    exportData
};