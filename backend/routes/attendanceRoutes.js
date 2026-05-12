const express = require('express');
const router = express.Router();
const {
    getAttendance,
    markAttendance,
    getStudentsForAttendance,
    getAttendanceSummary
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(authorize('admin', 'teacher'), getAttendance)
    .post(authorize('admin', 'teacher'), markAttendance);

router.get('/students', authorize('admin', 'teacher'), getStudentsForAttendance);
router.get('/summary', authorize('admin', 'teacher'), getAttendanceSummary);

module.exports = router;