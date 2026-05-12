const express = require('express');
const router = express.Router();
const {
    getAdminDashboard,
    getTeacherDashboard,
    getStudentDashboard,
    getReceptionDashboard,
    getAccountantDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/teacher', authorize('teacher'), getTeacherDashboard);
router.get('/student', authorize('student'), getStudentDashboard);
router.get('/reception', authorize('reception'), getReceptionDashboard);
router.get('/accountant', authorize('accountant'), getAccountantDashboard);

module.exports = router;