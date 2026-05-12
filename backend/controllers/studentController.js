const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const getStudents = async (req, res) => {
    try {
        let query = 'SELECT s.*, u.email as user_email FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE s.status = "active"';
        const params = [];
        
        if (req.user.role === 'teacher') {
            const [teacher] = await pool.query('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
            if (teacher.length > 0 && teacher[0].specialization) {
                query += ' AND s.class IN (SELECT class_name FROM classes WHERE class_teacher_id = ?)';
                params.push(teacher[0].id);
            }
        }
        
        query += ' ORDER BY s.student_id';
        
        const [students] = await pool.query(query, params);
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentById = async (req, res) => {
    try {
        const [students] = await pool.query(
            'SELECT s.*, u.email as user_email FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?',
            [req.params.id]
        );
        if (students.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student not found' });
        }
        res.json({ success: true, data: students[0] });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentProfile = async (req, res) => {
    try {
        const [students] = await pool.query(
            'SELECT s.*, u.email as user_email FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE s.user_id = ?',
            [req.user.id]
        );
        if (students.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student profile not found' });
        }
        res.json({ success: true, data: students[0] });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const createStudent = async (req, res) => {
    try {
        const { student_id, name, class: className, section, roll_number, parent_name, parent_phone, parent_email, email, phone, address, date_of_birth, gender } = req.body;
        
        const [existing] = await pool.query('SELECT id FROM students WHERE student_id = ?', [student_id]);
        if (existing.length > 0) {
            return res.status(HTTP_STATUS.CONFLICT).json({ success: false, message: 'Student ID already exists' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO students (student_id, name, class, section, roll_number, parent_name, parent_phone, parent_email, email, phone, address, date_of_birth, gender)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, name, className, section, roll_number, parent_name, parent_phone, parent_email, email, phone, address, date_of_birth, gender]
        );
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Student created', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { name, class: className, section, roll_number, parent_name, parent_phone, parent_email, email, phone, address, date_of_birth, gender, status, discipline_marks } = req.body;
        
        const [result] = await pool.query(
            `UPDATE students SET name=?, class=?, section=?, roll_number=?, parent_name=?, parent_phone=?, parent_email=?, email=?, phone=?, address=?, date_of_birth=?, gender=?, status=?, discipline_marks=?
             WHERE id = ?`,
            [name, className, section, roll_number, parent_name, parent_phone, parent_email, email, phone, address, date_of_birth, gender, status, discipline_marks, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student updated' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const [result] = await pool.query('UPDATE students SET status = "inactive" WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student deleted' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentMarks = async (req, res) => {
    try {
        let studentId;
        if (req.user.role === 'student') {
            const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [req.user.id]);
            if (student.length === 0) return res.json({ success: true, data: [] });
            studentId = student[0].student_id;
        } else {
            studentId = req.params.studentId;
        }
        
        const [marks] = await pool.query(
            `SELECT m.*, t.name as teacher_name 
             FROM marks m 
             LEFT JOIN teachers t ON m.teacher_id = t.id 
             WHERE m.student_id = ? 
             ORDER BY m.exam_date DESC`,
            [studentId]
        );
        
        res.json({ success: true, data: marks });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentAssignments = async (req, res) => {
    try {
        let studentId, studentClass;
        if (req.user.role === 'student') {
            const [student] = await pool.query('SELECT student_id, class FROM students WHERE user_id = ?', [req.user.id]);
            if (student.length === 0) return res.json({ success: true, data: [] });
            studentId = student[0].student_id;
            studentClass = student[0].class;
        } else {
            studentId = req.params.studentId;
            const [student] = await pool.query('SELECT class FROM students WHERE student_id = ?', [studentId]);
            if (student.length > 0) studentClass = student[0].class;
        }
        
        const [assignments] = await pool.query(
            `SELECT a.*, 
                    s.marks_obtained, s.submission_text, s.file_path as submission_file, s.submitted_at,
                    CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted
             FROM assignments a
             LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
             WHERE a.class = ? OR a.class = 'all'
             ORDER BY a.due_date ASC`,
            [studentId, studentClass]
        );
        
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const submitAssignment = async (req, res) => {
    try {
        const { assignment_id, submission_text } = req.body;
        const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [req.user.id]);
        
        if (student.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student not found' });
        }
        
        const [existing] = await pool.query(
            'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
            [assignment_id, student[0].student_id]
        );
        
        if (existing.length > 0) {
            return res.status(HTTP_STATUS.CONFLICT).json({ success: false, message: 'Assignment already submitted' });
        }
        
        await pool.query(
            `INSERT INTO submissions (assignment_id, student_id, submission_text) VALUES (?, ?, ?)`,
            [assignment_id, student[0].student_id, submission_text]
        );
        
        res.json({ success: true, message: 'Assignment submitted successfully' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getStudentAttendance = async (req, res) => {
    try {
        let studentId;
        if (req.user.role === 'student') {
            const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [req.user.id]);
            if (student.length === 0) return res.json({ success: true, data: [] });
            studentId = student[0].student_id;
        } else {
            studentId = req.params.studentId;
        }
        
        const [attendance] = await pool.query(
            `SELECT date, status, remarks FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30`,
            [studentId]
        );
        
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        
        res.json({
            success: true,
            data: {
                records: attendance,
                summary: { total, present, absent, late, percentage: total > 0 ? (present / total * 100).toFixed(2) : 0 }
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
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
};