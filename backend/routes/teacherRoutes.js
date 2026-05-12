const express = require('express');
const router = express.Router();
const {
    getTeachers,
    getTeacherProfile,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    createAssignment,
    getAssignments,
    getAssignmentSubmissions,
    gradeSubmission,
    addMarks,
    updateMarks,
    getClassStudents
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Teacher profile
router.get('/profile', authorize('teacher'), getTeacherProfile);
router.get('/class-students', authorize('teacher'), getClassStudents);

// Assignment management
router.post('/assignments', authorize('teacher'), createAssignment);
router.get('/assignments', authorize('teacher'), getAssignments);
router.get('/assignments/:id/submissions', authorize('teacher'), getAssignmentSubmissions);
router.put('/submissions/:id/grade', authorize('teacher'), gradeSubmission);

// Marks management
router.post('/marks', authorize('teacher'), addMarks);
router.put('/marks/:id', authorize('teacher'), updateMarks);

// CRUD operations
router.route('/')
    .get(authorize('admin'), getTeachers)
    .post(authorize('admin'), createTeacher);

router.route('/:id')
    .put(authorize('admin'), updateTeacher)
    .delete(authorize('admin'), deleteTeacher);

module.exports = router;