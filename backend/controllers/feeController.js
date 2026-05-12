const { pool } = require('../config/database');
const { HTTP_STATUS, PAYMENT_STATUS } = require('../config/constants');

const getFees = async (req, res) => {
    try {
        const { status, class: className } = req.query;
        let query = `
            SELECT f.*, s.name as student_name, s.class, s.roll_number
            FROM fees f
            JOIN students s ON f.student_id = s.student_id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            query += ' AND f.payment_status = ?';
            params.push(status);
        }
        if (className) {
            query += ' AND s.class = ?';
            params.push(className);
        }
        
        query += ' ORDER BY f.due_date ASC';
        
        const [fees] = await pool.query(query, params);
        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentFees = async (req, res) => {
    try {
        let studentId;
        if (req.user.role === 'student') {
            const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [req.user.id]);
            if (student.length === 0) return res.json({ success: true, data: [] });
            studentId = student[0].student_id;
        } else {
            studentId = req.params.studentId;
        }
        
        const [fees] = await pool.query(
            `SELECT * FROM fees WHERE student_id = ? ORDER BY due_date DESC`,
            [studentId]
        );
        
        const totalDue = fees.reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);
        const totalPaid = fees.reduce((sum, f) => sum + f.paid_amount, 0);
        
        res.json({
            success: true,
            data: {
                records: fees,
                summary: {
                    total_fees: fees.reduce((sum, f) => sum + f.amount, 0),
                    total_paid: totalPaid,
                    total_due: totalDue,
                    paid_count: fees.filter(f => f.payment_status === 'paid').length,
                    pending_count: fees.filter(f => f.payment_status === 'pending').length,
                    partial_count: fees.filter(f => f.payment_status === 'partial').length
                }
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const createFee = async (req, res) => {
    try {
        const { student_id, fee_type, amount, due_date, remarks } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO fees (student_id, fee_type, amount, due_date, remarks, recorded_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [student_id, fee_type, amount, due_date, remarks, req.user.id]
        );
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Fee record created', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_method, transaction_id, remarks } = req.body;
        
        const [fee] = await pool.query('SELECT * FROM fees WHERE id = ?', [id]);
        if (fee.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Fee record not found' });
        }
        
        const newPaidAmount = fee[0].paid_amount + amount;
        let paymentStatus = PAYMENT_STATUS.PARTIAL;
        if (newPaidAmount >= fee[0].amount) {
            paymentStatus = PAYMENT_STATUS.PAID;
        } else if (newPaidAmount === 0) {
            paymentStatus = PAYMENT_STATUS.PENDING;
        } else {
            paymentStatus = PAYMENT_STATUS.PARTIAL;
        }
        
        await pool.query(
            `UPDATE fees SET paid_amount = ?, payment_status = ?, payment_date = NOW(), payment_method = ?, transaction_id = ?, remarks = CONCAT(remarks, ' - ', ?)
             WHERE id = ?`,
            [newPaidAmount, paymentStatus, payment_method, transaction_id, remarks, id]
        );
        
        res.json({ success: true, message: 'Payment recorded successfully' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getFeeStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as total_collected,
                SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as total_pending,
                SUM(CASE WHEN payment_status = 'partial' THEN (amount - paid_amount) ELSE 0 END) as total_partial,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial_count
            FROM fees
        `);
        
        res.json({ success: true, data: stats[0] });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getFees,
    getStudentFees,
    createFee,
    recordPayment,
    getFeeStats
};