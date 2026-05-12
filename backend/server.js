const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL Connection Pool
let pool = null;

// Create database connection
async function initDB() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        
        await connection.query('CREATE DATABASE IF NOT EXISTS school_management');
        await connection.end();
        
        pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'school_management',
            waitForConnections: true,
            connectionLimit: 10
        });
        
        // Create users table
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role VARCHAR(50) DEFAULT 'student',
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create students table
        await pool.query(`CREATE TABLE IF NOT EXISTS students (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50) UNIQUE NOT NULL,
            user_id INT,
            name VARCHAR(100) NOT NULL,
            class VARCHAR(50),
            section VARCHAR(50),
            roll_number INT,
            parent_name VARCHAR(100),
            parent_phone VARCHAR(20),
            email VARCHAR(100),
            phone VARCHAR(20),
            address TEXT,
            gender VARCHAR(20),
            admission_date DATE DEFAULT CURRENT_DATE,
            status VARCHAR(20) DEFAULT 'active',
            discipline_marks INT DEFAULT 100,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create teachers table
        await pool.query(`CREATE TABLE IF NOT EXISTS teachers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            teacher_id VARCHAR(50) UNIQUE NOT NULL,
            user_id INT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE,
            phone VARCHAR(20),
            specialization VARCHAR(100),
            qualification VARCHAR(200),
            experience_years INT DEFAULT 0,
            address TEXT,
            joining_date DATE DEFAULT CURRENT_DATE,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create classes table
        await pool.query(`CREATE TABLE IF NOT EXISTS classes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            class_name VARCHAR(50) NOT NULL,
            section VARCHAR(50),
            class_teacher_id INT,
            room_number VARCHAR(20),
            capacity INT DEFAULT 30,
            academic_year VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create assignments table
        await pool.query(`CREATE TABLE IF NOT EXISTS assignments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            teacher_id INT NOT NULL,
            class VARCHAR(50) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            due_date DATE NOT NULL,
            total_marks INT DEFAULT 100,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create submissions table
        await pool.query(`CREATE TABLE IF NOT EXISTS submissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            assignment_id INT NOT NULL,
            student_id VARCHAR(50) NOT NULL,
            submission_text TEXT,
            file_path VARCHAR(500),
            marks_obtained INT DEFAULT 0,
            feedback TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create marks table
        await pool.query(`CREATE TABLE IF NOT EXISTS marks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            exam_type VARCHAR(50) NOT NULL,
            marks_obtained INT DEFAULT 0,
            total_marks INT DEFAULT 100,
            exam_date DATE,
            teacher_id INT,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create attendance table
        await pool.query(`CREATE TABLE IF NOT EXISTS attendance (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            status VARCHAR(20) NOT NULL,
            remarks TEXT,
            marked_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_attendance (student_id, date)
        )`);
        
        // Create fees table with RWF currency
        await pool.query(`CREATE TABLE IF NOT EXISTS fees (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50) NOT NULL,
            fee_type VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            paid_amount DECIMAL(10,2) DEFAULT 0,
            due_date DATE NOT NULL,
            payment_date DATE,
            payment_status VARCHAR(20) DEFAULT 'pending',
            payment_method VARCHAR(50),
            currency VARCHAR(3) DEFAULT 'RWF',
            transaction_id VARCHAR(100),
            remarks TEXT,
            recorded_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create notifications table
        await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            target_role VARCHAR(50) DEFAULT 'all',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Create user_notifications table
        await pool.query(`CREATE TABLE IF NOT EXISTS user_notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            notification_id INT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Insert default users
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        
        const [adminExists] = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        if (adminExists.length === 0) {
            await pool.query(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                ['admin', hashedPassword, 'admin@school.com', 'System Administrator', 'admin']);
            console.log('✓ Admin user created');
        }
        
        const [teacherExists] = await pool.query("SELECT * FROM users WHERE username = 'teacher'");
        if (teacherExists.length === 0) {
            const teacherPassword = bcrypt.hashSync('teacher123', 10);
            const [result] = await pool.query(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                ['teacher', teacherPassword, 'teacher@school.com', 'Demo Teacher', 'teacher']);
            await pool.query(`INSERT INTO teachers (teacher_id, user_id, name, email, specialization) VALUES (?, ?, ?, ?, ?)`,
                ['TCH001', result.insertId, 'Demo Teacher', 'teacher@school.com', 'General']);
            console.log('✓ Teacher user created');
        }
        
        const [studentExists] = await pool.query("SELECT * FROM users WHERE username = 'student'");
        if (studentExists.length === 0) {
            const studentPassword = bcrypt.hashSync('student123', 10);
            const [result] = await pool.query(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                ['student', studentPassword, 'student@school.com', 'Demo Student', 'student']);
            await pool.query(`INSERT INTO students (student_id, user_id, name, class, email) VALUES (?, ?, ?, ?, ?)`,
                ['STU001', result.insertId, 'Demo Student', '10th Grade', 'student@school.com']);
            console.log('✓ Student user created');
        }
        
        const [receptionExists] = await pool.query("SELECT * FROM users WHERE username = 'reception'");
        if (receptionExists.length === 0) {
            const receptionPassword = bcrypt.hashSync('reception123', 10);
            await pool.query(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                ['reception', receptionPassword, 'reception@school.com', 'Reception Officer', 'reception']);
            console.log('✓ Reception user created');
        }
        
        const [accountantExists] = await pool.query("SELECT * FROM users WHERE username = 'accountant'");
        if (accountantExists.length === 0) {
            const accountantPassword = bcrypt.hashSync('accountant123', 10);
            await pool.query(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                ['accountant', accountantPassword, 'accountant@school.com', 'Accountant', 'accountant']);
            console.log('✓ Accountant user created');
        }
        
        // Insert sample fee records in RWF
        const [feesExist] = await pool.query("SELECT * FROM fees LIMIT 1");
        if (feesExist.length === 0) {
            await pool.query(`INSERT INTO fees (student_id, fee_type, amount, due_date, currency) VALUES 
                ('STU001', 'Tuition Fee', 250000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'RWF'),
                ('STU001', 'Library Fee', 25000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'RWF'),
                ('STU001', 'Sports Fee', 15000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'RWF')`);
            console.log('✓ Sample fee records created in RWF');
        }
        
        console.log('✓ Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Database error:', error.message);
        return false;
    }
}

// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = TRUE', [username]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const user = users[0];
        const isValid = bcrypt.compareSync(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        try {
            await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        } catch (err) {}
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            'your_secret_key',
            { expiresIn: '7d' }
        );
        
        let roleData = null;
        if (user.role === 'student') {
            const [student] = await pool.query('SELECT * FROM students WHERE user_id = ?', [user.id]);
            roleData = student[0] || null;
        } else if (user.role === 'teacher') {
            const [teacher] = await pool.query('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
            roleData = teacher[0] || null;
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                roleData: roleData,
                token
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        const [users] = await pool.query('SELECT id, username, email, full_name, role FROM users WHERE id = ?', [decoded.id]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, data: users[0] });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// ==========================================
// STUDENT ROUTES
// ==========================================

app.get('/api/students', async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students WHERE status = "active" ORDER BY student_id');
        res.json({ success: true, data: students });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const { student_id, name, class: className, section, parent_phone, email, phone, address, gender } = req.body;
        
        const [existing] = await pool.query('SELECT id FROM students WHERE student_id = ?', [student_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Student ID already exists' });
        }
        
        await pool.query(`INSERT INTO students (student_id, name, class, section, parent_phone, email, phone, address, gender) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, name, className, section, parent_phone, email, phone, address, gender]);
        
        res.json({ success: true, message: 'Student added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        await pool.query('UPDATE students SET status = "inactive" WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// TEACHER ROUTES
// ==========================================

app.get('/api/teachers', async (req, res) => {
    try {
        const [teachers] = await pool.query('SELECT * FROM teachers WHERE status = "active"');
        res.json({ success: true, data: teachers });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.get('/api/teachers/class-students', async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students WHERE status = "active" LIMIT 20');
        res.json({ success: true, data: students });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

// ==========================================
// CLASS ROUTES
// ==========================================

app.get('/api/classes', async (req, res) => {
    try {
        const [classes] = await pool.query('SELECT * FROM classes');
        res.json({ success: true, data: classes });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

// ==========================================
// ATTENDANCE ROUTES
// ==========================================

app.get('/api/attendance/students', async (req, res) => {
    try {
        const { class: className } = req.query;
        let query = 'SELECT student_id, name, class, roll_number FROM students WHERE status = "active"';
        const params = [];
        
        if (className) {
            query += ' AND class = ?';
            params.push(className);
        }
        
        const [students] = await pool.query(query, params);
        res.json({ success: true, data: students });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.get('/api/attendance', async (req, res) => {
    try {
        const { date, class: className } = req.query;
        let query = `SELECT a.*, s.name as student_name FROM attendance a JOIN students s ON a.student_id = s.student_id WHERE 1=1`;
        const params = [];
        
        if (date) {
            query += ' AND a.date = ?';
            params.push(date);
        }
        if (className) {
            query += ' AND s.class = ?';
            params.push(className);
        }
        
        const [attendance] = await pool.query(query, params);
        res.json({ success: true, data: attendance });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const { date, attendance_records } = req.body;
        
        for (const record of attendance_records) {
            await pool.query(`INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
                [record.student_id, date, record.status]);
        }
        
        res.json({ success: true, message: 'Attendance saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// FEE ROUTES WITH RWF CURRENCY
// ==========================================

app.get('/api/fees', async (req, res) => {
    try {
        const [fees] = await pool.query(`
            SELECT f.*, s.name as student_name 
            FROM fees f 
            JOIN students s ON f.student_id = s.student_id 
            ORDER BY f.due_date DESC
        `);
        res.json({ success: true, data: fees });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.get('/api/fees/my-fees', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.json({ success: true, data: { records: [], summary: { total_fees: 0, total_paid: 0, total_due: 0, currency: 'RWF' } } });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [decoded.id]);
        
        if (student.length === 0) {
            return res.json({ success: true, data: { records: [], summary: { total_fees: 0, total_paid: 0, total_due: 0, currency: 'RWF' } } });
        }
        
        const [fees] = await pool.query('SELECT * FROM fees WHERE student_id = ?', [student[0].student_id]);
        
        const summary = {
            total_fees: fees.reduce((sum, f) => sum + parseFloat(f.amount), 0),
            total_paid: fees.reduce((sum, f) => sum + parseFloat(f.paid_amount), 0),
            total_due: fees.reduce((sum, f) => sum + (parseFloat(f.amount) - parseFloat(f.paid_amount)), 0),
            currency: 'RWF'
        };
        
        res.json({ success: true, data: { records: fees, summary } });
    } catch (error) {
        res.json({ success: true, data: { records: [], summary: { total_fees: 0, total_paid: 0, total_due: 0, currency: 'RWF' } } });
    }
});

app.post('/api/fees', async (req, res) => {
    try {
        const { student_id, fee_type, amount, due_date } = req.body;
        await pool.query(`INSERT INTO fees (student_id, fee_type, amount, due_date, currency) VALUES (?, ?, ?, ?, 'RWF')`,
            [student_id, fee_type, amount, due_date]);
        res.json({ success: true, message: `Fee of ${parseFloat(amount).toLocaleString()} RWF added successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/fees/:id/payment', async (req, res) => {
    try {
        const { amount } = req.body;
        const [fee] = await pool.query('SELECT * FROM fees WHERE id = ?', [req.params.id]);
        
        if (fee.length === 0) {
            return res.status(404).json({ success: false, message: 'Fee not found' });
        }
        
        const newPaidAmount = parseFloat(fee[0].paid_amount) + parseFloat(amount);
        const paymentStatus = newPaidAmount >= parseFloat(fee[0].amount) ? 'paid' : 'partial';
        
        await pool.query(`UPDATE fees SET paid_amount = ?, payment_status = ?, payment_date = NOW() WHERE id = ?`,
            [newPaidAmount, paymentStatus, req.params.id]);
        
        res.json({ success: true, message: `Payment of ${parseFloat(amount).toLocaleString()} RWF recorded successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// DASHBOARD ROUTES
// ==========================================

app.get('/api/dashboard/:role', async (req, res) => {
    try {
        const [students] = await pool.query('SELECT COUNT(*) as count FROM students WHERE status = "active"');
        const [teachers] = await pool.query('SELECT COUNT(*) as count FROM teachers WHERE status = "active"');
        const [classes] = await pool.query('SELECT COUNT(*) as count FROM classes');
        
        const today = new Date().toISOString().split('T')[0];
        let todayAttendance = { total: 0, present: 0 };
        
        try {
            const [attendance] = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present FROM attendance WHERE date = ?`, [today]);
            todayAttendance = attendance[0] || { total: 0, present: 0 };
        } catch (e) {}
        
        res.json({
            success: true,
            data: {
                counts: { students: students[0]?.count || 0, teachers: teachers[0]?.count || 0, classes: classes[0]?.count || 0 },
                attendance: { total: todayAttendance.total || 0, present: todayAttendance.present || 0 }
            }
        });
    } catch (error) {
        res.json({ success: true, data: { counts: { students: 0, teachers: 0, classes: 0 }, attendance: { total: 0, present: 0 } } });
    }
});

// ==========================================
// TEACHER ASSIGNMENT ROUTES
// ==========================================

app.get('/api/teachers/assignments', async (req, res) => {
    try {
        const [assignments] = await pool.query('SELECT * FROM assignments ORDER BY due_date DESC');
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.post('/api/teachers/assignments', async (req, res) => {
    try {
        const { class: className, subject, title, due_date, description } = req.body;
        await pool.query(`INSERT INTO assignments (teacher_id, class, subject, title, due_date, description) VALUES (1, ?, ?, ?, ?, ?)`,
            [className, subject, title, due_date, description]);
        res.json({ success: true, message: 'Assignment created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/teachers/marks', async (req, res) => {
    try {
        const { student_id, subject, exam_type, marks_obtained, total_marks, exam_date } = req.body;
        await pool.query(`INSERT INTO marks (student_id, subject, exam_type, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [student_id, subject, exam_type, marks_obtained, total_marks || 100, exam_date]);
        res.json({ success: true, message: 'Marks added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// STUDENT MARKS AND ASSIGNMENTS
// ==========================================

app.get('/api/students/marks', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.json({ success: true, data: [] });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [decoded.id]);
        
        if (student.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const [marks] = await pool.query('SELECT * FROM marks WHERE student_id = ? ORDER BY exam_date DESC', [student[0].student_id]);
        res.json({ success: true, data: marks });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.get('/api/students/assignments', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.json({ success: true, data: [] });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        const [student] = await pool.query('SELECT class, student_id FROM students WHERE user_id = ?', [decoded.id]);
        
        if (student.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const [assignments] = await pool.query('SELECT * FROM assignments WHERE class = ? OR class = "all" ORDER BY due_date ASC', [student[0].class || '10th Grade']);
        const [submissions] = await pool.query('SELECT assignment_id FROM submissions WHERE student_id = ?', [student[0].student_id]);
        
        const submittedIds = submissions.map(s => s.assignment_id);
        const assignmentsWithStatus = assignments.map(a => ({ ...a, is_submitted: submittedIds.includes(a.id), marks_obtained: null }));
        
        res.json({ success: true, data: assignmentsWithStatus });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.post('/api/students/submit-assignment', async (req, res) => {
    try {
        const { assignment_id, submission_text } = req.body;
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [decoded.id]);
        
        if (student.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        const [existing] = await pool.query('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?', [assignment_id, student[0].student_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Assignment already submitted' });
        }
        
        await pool.query(`INSERT INTO submissions (assignment_id, student_id, submission_text) VALUES (?, ?, ?)`, [assignment_id, student[0].student_id, submission_text]);
        res.json({ success: true, message: 'Assignment submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/students/attendance', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.json({ success: true, data: { records: [], summary: { total: 0, present: 0, percentage: 0 } } });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        const [student] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [decoded.id]);
        
        if (student.length === 0) {
            return res.json({ success: true, data: { records: [], summary: { total: 0, present: 0, percentage: 0 } } });
        }
        
        const [attendance] = await pool.query('SELECT date, status, remarks FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30', [student[0].student_id]);
        
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const percentage = total > 0 ? (present / total * 100).toFixed(2) : 0;
        
        res.json({ success: true, data: { records: attendance, summary: { total, present, percentage } } });
    } catch (error) {
        res.json({ success: true, data: { records: [], summary: { total: 0, present: 0, percentage: 0 } } });
    }
});

// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================

app.get('/api/auth/users', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, full_name, role, is_active FROM users');
        res.json({ success: true, data: users });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email, full_name, role } = req.body;
        
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Username or email already exists' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const [result] = await pool.query(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, full_name, role || 'student']);
        
        if (role === 'teacher') {
            await pool.query(`INSERT INTO teachers (teacher_id, user_id, name, email) VALUES (?, ?, ?, ?)`, ['TCH' + result.insertId, result.insertId, full_name, email]);
        }
        
        if (role === 'student') {
            await pool.query(`INSERT INTO students (student_id, user_id, name, email) VALUES (?, ?, ?, ?)`, ['STU' + result.insertId, result.insertId, full_name, email]);
        }
        
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/auth/reset-password/:id', async (req, res) => {
    try {
        const { password } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/auth/toggle-status/:id', async (req, res) => {
    try {
        const { is_active } = req.body;
        await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// NOTIFICATION ROUTES
// ==========================================

app.get('/api/notifications', async (req, res) => {
    res.json({ success: true, data: [] });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch all
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
async function start() {
    const dbOk = await initDB();
    if (!dbOk) {
        console.log('\n⚠️ Warning: Could not connect to MySQL. Please check your database connection.\n');
    }
    
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        // console.log(`\n📝 Login Credentials:`);
        // console.log(`   Admin: admin / admin123`);
        // console.log(`   Teacher: teacher / teacher123`);
        // console.log(`   Student: student / student123`);
        // console.log(`   Reception: reception / reception123`);
        // console.log(`   Accountant: accountant / accountant123`);
        // console.log(`\n💰 Currency: All fees are in RWF (Rwandan Franc)`);
        console.log(`\nOpen http://localhost:${PORT}\n`);
    });
}

start();