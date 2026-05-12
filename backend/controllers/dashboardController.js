const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const getAdminDashboard = async (req, res) => {
    try {
        // Get counts
        const [totalStudents] = await pool.query('SELECT COUNT(*) as count FROM students WHERE status = "active"');
        const [totalTeachers] = await pool.query('SELECT COUNT(*) as count FROM teachers WHERE status = "active"');
        const [totalClasses] = await pool.query('SELECT COUNT(*) as count FROM classes');
        const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
        
        // Today's attendance
        const today = new Date().toISOString().split('T')[0];
        const [todayAttendance] = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
             FROM attendance WHERE date = ?`,
            [today]
        );
        
        // Fee statistics
        const [feeStats] = await pool.query(`
            SELECT 
                SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as collected,
                SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as pending,
                SUM(CASE WHEN payment_status = 'partial' THEN (amount - paid_amount) ELSE 0 END) as partial
            FROM fees
        `);
        
        // Recent activities
        const [recentActivities] = await pool.query(`
            SELECT 'Student Added' as action, name as details, created_at 
            FROM students ORDER BY created_at DESC LIMIT 5
        `);
        
        res.json({
            success: true,
            data: {
                counts: {
                    students: totalStudents[0].count,
                    teachers: totalTeachers[0].count,
                    classes: totalClasses[0].count,
                    users: totalUsers[0].count
                },
                attendance: {
                    total: todayAttendance[0].total || 0,
                    present: todayAttendance[0].present || 0,
                    percentage: todayAttendance[0].total > 0 ? ((todayAttendance[0].present / todayAttendance[0].total) * 100).toFixed(2) : 0
                },
                fees: feeStats[0],
                recentActivities
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getTeacherDashboard = async (req, res) => {
    try {
        const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        
        if (teacher.length === 0) {
            return res.json({ success: true, data: { assignments: 0, submissions: 0, students: 0 } });
        }
        
        // Get teacher's classes
        const [classes] = await pool.query('SELECT class_name FROM classes WHERE class_teacher_id = ?', [teacher[0].id]);
        const classNames = classes.map(c => c.class_name);
        
        let studentsCount = 0;
        if (classNames.length > 0) {
            const placeholders = classNames.map(() => '?').join(',');
            const [students] = await pool.query(`SELECT COUNT(*) as count FROM students WHERE class IN (${placeholders})`, classNames);
            studentsCount = students[0].count;
        }
        
        // Get assignments count
        const [assignments] = await pool.query('SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ?', [teacher[0].id]);
        
        // Get pending submissions
        const [submissions] = await pool.query(`
            SELECT COUNT(*) as count FROM submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE a.teacher_id = ? AND s.marks_obtained = 0
        `, [teacher[0].id]);
        
        res.json({
            success: true,
            data: {
                students_count: studentsCount,
                assignments_count: assignments[0].count,
                pending_submissions: submissions[0].count,
                classes_count: classes.length
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentDashboard = async (req, res) => {
    try {
        const [student] = await pool.query('SELECT student_id, class, discipline_marks FROM students WHERE user_id = ?', [req.user.id]);
        
        if (student.length === 0) {
            return res.json({ success: true, data: {} });
        }
        
        // Get marks summary
        const [marks] = await pool.query(
            `SELECT subject, AVG(marks_obtained) as average, MAX(marks_obtained) as highest
             FROM marks WHERE student_id = ? GROUP BY subject`,
            [student[0].student_id]
        );
        
        // Get attendance summary
        const [attendance] = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
             FROM attendance WHERE student_id = ?`,
            [student[0].student_id]
        );
        
        // Get pending assignments
        const [pendingAssignments] = await pool.query(
            `SELECT COUNT(*) as count FROM assignments a
             WHERE a.class = ? AND NOT EXISTS (
                 SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = ?
             ) AND a.due_date >= CURDATE()`,
            [student[0].class, student[0].student_id]
        );
        
        // Get fee summary
        const [fees] = await pool.query(
            `SELECT SUM(amount) as total, SUM(paid_amount) as paid
             FROM fees WHERE student_id = ?`,
            [student[0].student_id]
        );
        
        res.json({
            success: true,
            data: {
                discipline_marks: student[0].discipline_marks,
                marks_summary: marks,
                attendance: {
                    total: attendance[0]?.total || 0,
                    present: attendance[0]?.present || 0,
                    percentage: attendance[0]?.total > 0 ? ((attendance[0].present / attendance[0].total) * 100).toFixed(2) : 0
                },
                pending_assignments: pendingAssignments[0].count,
                fees: {
                    total: fees[0]?.total || 0,
                    paid: fees[0]?.paid || 0,
                    due: (fees[0]?.total || 0) - (fees[0]?.paid || 0)
                }
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getReceptionDashboard = async (req, res) => {
    try {
        // Today's registrations
        const today = new Date().toISOString().split('T')[0];
        const [todayRegistrations] = await pool.query(
            'SELECT COUNT(*) as count FROM students WHERE DATE(admission_date) = ?',
            [today]
        );
        
        // Today's fee collections
        const [todayCollections] = await pool.query(
            'SELECT SUM(paid_amount) as total FROM fees WHERE DATE(payment_date) = ?',
            [today]
        );
        
        // Pending registrations (students without user accounts)
        const [pendingRegistrations] = await pool.query(
            'SELECT COUNT(*) as count FROM students WHERE user_id IS NULL'
        );
        
        res.json({
            success: true,
            data: {
                today_registrations: todayRegistrations[0].count,
                today_collections: todayCollections[0].total || 0,
                pending_registrations: pendingRegistrations[0].count,
                total_students: await pool.query('SELECT COUNT(*) as count FROM students').then(r => r[0][0].count)
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getAccountantDashboard = async (req, res) => {
    try {
        // Monthly fee collection
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const [monthlyCollection] = await pool.query(
            `SELECT SUM(paid_amount) as total FROM fees WHERE MONTH(payment_date) = ? AND YEAR(payment_date) = ?`,
            [currentMonth, currentYear]
        );
        
        // Payment status summary
        const [paymentSummary] = await pool.query(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                SUM(amount) as total_amount,
                SUM(paid_amount) as collected
            FROM fees
            GROUP BY payment_status
        `);
        
        // Overdue payments
        const [overduePayments] = await pool.query(
            `SELECT COUNT(*) as count, SUM(amount - paid_amount) as total_due
             FROM fees WHERE due_date < CURDATE() AND payment_status != 'paid'`
        );
        
        res.json({
            success: true,
            data: {
                monthly_collection: monthlyCollection[0].total || 0,
                payment_summary: paymentSummary,
                overdue: {
                    count: overduePayments[0].count,
                    total_due: overduePayments[0].total_due || 0
                }
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getAdminDashboard,
    getTeacherDashboard,
    getStudentDashboard,
    getReceptionDashboard,
    getAccountantDashboard
};