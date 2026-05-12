const express = require('express');
const router = express.Router();
const {
    getStudents,
    getStudentById,
    getStudentProfile,
    createStudent,
    updateStudent,
    deleteStudent,
    getStudentMarks,
    getStudentAssignments,
    submitAssignment,
    getStudentAttendance
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Student specific routes
router.get('/profile', getStudentProfile);
router.get('/marks', getStudentMarks);
router.get('/assignments', getStudentAssignments);
router.post('/submit-assignment', submitAssignment);
router.get('/attendance', getStudentAttendance);

// CRUD operations (admin and reception)
router.route('/')
    .get(authorize('admin', 'teacher', 'reception'), getStudents)
    .post(authorize('admin', 'reception'), createStudent);

router.route('/:id')
    .get(authorize('admin', 'teacher', 'reception'), getStudentById)
    .put(authorize('admin', 'reception'), updateStudent)
    .delete(authorize('admin'), deleteStudent);

// Get specific student's marks (teacher)
router.get('/:studentId/marks', authorize('admin', 'teacher'), getStudentMarks);
router.get('/:studentId/assignments', authorize('admin', 'teacher'), getStudentAssignments);
router.get('/:studentId/attendance', authorize('admin', 'teacher'), getStudentAttendance);

module.exports = router;