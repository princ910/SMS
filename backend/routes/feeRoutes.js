const express = require('express');
const router = express.Router();
const {
    getFees,
    getStudentFees,
    createFee,
    recordPayment,
    getFeeStats
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Student view their own fees
router.get('/my-fees', authorize('student'), getStudentFees);

// Fee management
router.route('/')
    .get(authorize('admin', 'accountant', 'reception'), getFees)
    .post(authorize('admin', 'accountant', 'reception'), createFee);

router.get('/stats', authorize('admin', 'accountant'), getFeeStats);
router.get('/student/:studentId', authorize('admin', 'accountant', 'reception'), getStudentFees);
router.post('/:id/payment', authorize('admin', 'accountant', 'reception'), recordPayment);

module.exports = router;