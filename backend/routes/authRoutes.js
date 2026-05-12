const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    changePassword,
    resetPassword,
    getUsers,
    toggleUserStatus
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Protected routes - All authenticated users
router.get('/me', protect, getCurrentUser);
router.put('/change-password', protect, changePassword);

// Admin only routes
router.post('/register', protect, authorize('admin'), registerUser);
router.put('/reset-password/:id', protect, authorize('admin'), resetPassword);
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/toggle-status/:id', protect, authorize('admin'), toggleUserStatus);

module.exports = router;