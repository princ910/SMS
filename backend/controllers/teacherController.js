const { pool } = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const getTeachers = async (req, res) => {
    try {
        const [teachers] = await pool.query('SELECT * FROM teachers WHERE status = "active" ORDER BY teacher_id');
        res.json({ success: true, data: teachers });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getTeacherProfile = async (req, res) => {
    try {
        const [teachers] = await pool.query('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teachers.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Teacher profile not found' });
        }
        res.json({ success: true, data: teachers[0] });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const createTeacher = async (req, res) => {
    try {
        const { teacher_id, name, specialization, qualification, experience_years, phone, email, address } = req.body;
        
        const [existing] = await pool.query('SELECT id FROM teachers WHERE teacher_id = ? OR email = ?', [teacher_id, email]);
        if (existing.length > 0) {
            return res.status(HTTP_STATUS.CONFLICT).json({ success: false, message: 'Teacher ID or email already exists' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO teachers (teacher_id, name, specialization, qualification, experience_years, phone, email, address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [teacher_id, name, specialization, qualification, experience_years || 0, phone, email, address]
        );
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Teacher created', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const { name, specialization, qualification, experience_years, phone, email, address, status } = req.body;
        
        const [result] = await pool.query(
            `UPDATE teachers SET name=?, specialization=?, qualification=?, experience_years=?, phone=?, email=?, address=?, status=?
             WHERE id = ?`,
            [name, specialization, qualification, experience_years, phone, email, address, status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Teacher not found' });
        }
        
        res.json({ success: true, message: 'Teacher updated' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const [result] = await pool.query('UPDATE teachers SET status = "inactive" WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Teacher not found' });
        }
        
        res.json({ success: true, message: 'Teacher deleted' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

// Assignment Management
const createAssignment = async (req, res) => {
    try {
        const { class: className, subject, title, description, due_date, total_marks } = req.body;
        const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        
        if (teacher.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Teacher not found' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO assignments (teacher_id, class, subject, title, description, due_date, total_marks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [teacher[0].id, className, subject, title, description, due_date, total_marks || 100]
        );
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Assignment created', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getAssignments = async (req, res) => {
    try {
        const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacher.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const [assignments] = await pool.query(
            `SELECT a.*, COUNT(s.id) as submissions_count 
             FROM assignments a 
             LEFT JOIN submissions s ON a.id = s.assignment_id 
             WHERE a.teacher_id = ? 
             GROUP BY a.id 
             ORDER BY a.created_at DESC`,
            [teacher[0].id]
        );
        
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getAssignmentSubmissions = async (req, res) => {
    try {
        const [submissions] = await pool.query(
            `SELECT s.*, st.name as student_name, st.roll_number 
             FROM submissions s 
             JOIN students st ON s.student_id = st.student_id 
             WHERE s.assignment_id = ?`,
            [req.params.id]
        );
        
        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const gradeSubmission = async (req, res) => {
    try {
        const { marks_obtained, feedback } = req.body;
        
        await pool.query(
            `UPDATE submissions SET marks_obtained = ?, feedback = ? WHERE id = ?`,
            [marks_obtained, feedback, req.params.id]
        );
        
        res.json({ success: true, message: 'Submission graded successfully' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

// Marks Management
const addMarks = async (req, res) => {
    try {
        const { student_id, subject, exam_type, marks_obtained, total_marks, exam_date, remarks } = req.body;
        const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        
        const [result] = await pool.query(
            `INSERT INTO marks (student_id, subject, exam_type, marks_obtained, total_marks, exam_date, teacher_id, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, subject, exam_type, marks_obtained, total_marks || 100, exam_date, teacher[0].id, remarks]
        );
        
        res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Marks added', data: { id: result.insertId } });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const updateMarks = async (req, res) => {
    try {
        const { marks_obtained, remarks } = req.body;
        
        await pool.query(
            `UPDATE marks SET marks_obtained = ?, remarks = ? WHERE id = ?`,
            [marks_obtained, remarks, req.params.id]
        );
        
        res.json({ success: true, message: 'Marks updated' });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

const getClassStudents = async (req, res) => {
    try {
        const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacher.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const [classes] = await pool.query('SELECT class_name FROM classes WHERE class_teacher_id = ?', [teacher[0].id]);
        if (classes.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const classNames = classes.map(c => c.class_name);
        const placeholders = classNames.map(() => '?').join(',');
        
        const [students] = await pool.query(
            `SELECT * FROM students WHERE class IN (${placeholders}) AND status = 'active' ORDER BY roll_number`,
            classNames
        );
        
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
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
};