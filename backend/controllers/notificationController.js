const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const createNotification = async (req, res) => {
    try {
        const { title, message, target_role } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO notifications (title, message, target_role, created_by)
             VALUES (?, ?, ?, ?)`,
            [title, message, target_role || 'all', req.user.id]
        );
        
        // Create user notifications for target users
        let userQuery = 'SELECT id FROM users WHERE is_active = TRUE';
        const params = [];
        
        if (target_role && target_role !== 'all') {
            userQuery += ' AND role = ?';
            params.push(target_role);
        }
        
        const [users] = await pool.query(userQuery, params);
        
        for (const user of users) {
            await pool.query(
                `INSERT INTO user_notifications (user_id, notification_id) VALUES (?, ?)`,
                [user.id, result.insertId]
            );
        }
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Notification sent', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getNotifications = async (req, res) => {
    try {
        const [notifications] = await pool.query(
            `SELECT n.*, un.is_read, un.read_at
             FROM notifications n
             JOIN user_notifications un ON n.id = un.notification_id
             WHERE un.user_id = ?
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [req.user.id]
        );
        
        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const markAsRead = async (req, res) => {
    try {
        await pool.query(
            `UPDATE user_notifications SET is_read = TRUE, read_at = NOW()
             WHERE notification_id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );
        
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await pool.query(
            `UPDATE user_notifications SET is_read = TRUE, read_at = NOW()
             WHERE user_id = ? AND is_read = FALSE`,
            [req.user.id]
        );
        
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const [result] = await pool.query(
            `SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = FALSE`,
            [req.user.id]
        );
        
        res.json({ success: true, data: { unread_count: result[0].count } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};