const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { HTTP_STATUS, USER_ROLES } = require('../config/constants');

const registerUser = async (req, res) => {
    try {
        const { username, password, email, full_name, role, student_id, teacher_id } = req.body;
        
        const [existing] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            `INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, full_name, role || 'student']
        );
        
        if (role === 'teacher' && teacher_id) {
            await pool.query(
                `INSERT INTO teachers (teacher_id, user_id, name, email) VALUES (?, ?, ?, ?)`,
                [teacher_id, result.insertId, full_name, email]
            );
        } else if (role === 'student' && student_id) {
            await pool.query(
                `INSERT INTO students (student_id, user_id, name, email) VALUES (?, ?, ?, ?)`,
                [student_id, result.insertId, full_name, email]
            );
        }
        
        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: 'User registered successfully',
            data: { id: result.insertId, username, email, full_name, role }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
        
        // Get role-specific data
        let roleData = null;
        if (user.role === 'student') {
            const [student] = await pool.query('SELECT * FROM students WHERE user_id = ?', [user.id]);
            roleData = student[0];
        } else if (user.role === 'teacher') {
            const [teacher] = await pool.query('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
            roleData = teacher[0];
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                roleData: roleData,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

const logoutUser = async (req, res) => {
    res.json({ success: true, message: 'Logout successful' });
};

const getCurrentUser = async (req, res) => {
    try {
        let roleData = null;
        if (req.user.role === 'student') {
            const [student] = await pool.query('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
            roleData = student[0];
        } else if (req.user.role === 'teacher') {
            const [teacher] = await pool.query('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
            roleData = teacher[0];
        }
        
        res.json({ success: true, data: { ...req.user, roleData } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        
        if (!isMatch) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let query = 'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users';
        const params = [];
        
        if (role) {
            query += ' WHERE role = ?';
            params.push(role);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [users] = await pool.query(query, params);
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { is_active } = req.body;
        
        if (parseInt(req.params.id) === req.user.id && !is_active) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }
        
        await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    changePassword,
    resetPassword,
    getUsers,
    toggleUserStatus
};