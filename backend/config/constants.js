module.exports = {
    USER_ROLES: {
        ADMIN: 'admin',
        TEACHER: 'teacher',
        STUDENT: 'student',
        RECEPTION: 'reception',
        ACCOUNTANT: 'accountant'
    },
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500
    },
    ATTENDANCE_STATUS: {
        PRESENT: 'present',
        ABSENT: 'absent',
        LATE: 'late',
        HALF_DAY: 'half-day'
    },
    PAYMENT_STATUS: {
        PAID: 'paid',
        PENDING: 'pending',
        PARTIAL: 'partial',
        OVERDUE: 'overdue'
    },
    EXAM_TYPES: {
        MIDTERM: 'midterm',
        FINAL: 'final',
        QUIZ: 'quiz',
        ASSIGNMENT: 'assignment'
    }
};