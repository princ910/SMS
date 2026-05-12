const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

let pool;

async function ensureDatabaseExists() {
    try {
        // Connect without database first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        console.log('✅ MySQL connected');

        // Create database if not exists
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
        );

        await connection.end();

        // Create pool
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test pool connection
        const testConnection = await pool.getConnection();
        console.log('✅ Database pool created');
        testConnection.release();

        return true;

    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        return false;
    }
}

async function initializeDatabase() {
    try {

        const dbReady = await ensureDatabaseExists();

        if (!dbReady || !pool) {
            throw new Error('Database pool could not be initialized');
        }

        // USERS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role ENUM('admin', 'teacher', 'student', 'reception', 'accountant') DEFAULT 'student',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // STUDENTS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id VARCHAR(50) UNIQUE NOT NULL,
                user_id INT,
                name VARCHAR(100) NOT NULL,
                class VARCHAR(50) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // TEACHERS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS teachers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                teacher_id VARCHAR(50) UNIQUE NOT NULL,
                user_id INT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                specialization VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // FEES TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fees (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_status ENUM('paid', 'pending') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);

        // ATTENDANCE TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id VARCHAR(50) NOT NULL,
                attendance_date DATE NOT NULL,
                status ENUM('present', 'absent', 'late') DEFAULT 'present',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);

        // DEFAULT ADMIN
        const [adminExists] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            ['admin']
        );

        if (adminExists.length === 0) {

            const hashedPassword = await bcrypt.hash('admin123', 10);

            await pool.query(
                `INSERT INTO users (username, password, email, full_name, role)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'admin',
                    hashedPassword,
                    'admin@school.com',
                    'System Administrator',
                    'admin'
                ]
            );

            console.log('✅ Default admin created');
        }

        // DEFAULT TEACHER
        const [teacherExists] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            ['teacher']
        );

        if (teacherExists.length === 0) {

            const hashedPassword = await bcrypt.hash('teacher123', 10);

            const [teacherUser] = await pool.query(
                `INSERT INTO users (username, password, email, full_name, role)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'teacher',
                    hashedPassword,
                    'teacher@school.com',
                    'Demo Teacher',
                    'teacher'
                ]
            );

            await pool.query(
                `INSERT INTO teachers (teacher_id, user_id, name, email, specialization)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'TCH001',
                    teacherUser.insertId,
                    'Demo Teacher',
                    'teacher@school.com',
                    'General'
                ]
            );

            console.log('✅ Default teacher created');
        }

        // DEFAULT STUDENT
        const [studentExists] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            ['student']
        );

        if (studentExists.length === 0) {

            const hashedPassword = await bcrypt.hash('student123', 10);

            const [studentUser] = await pool.query(
                `INSERT INTO users (username, password, email, full_name, role)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'student',
                    hashedPassword,
                    'student@school.com',
                    'Demo Student',
                    'student'
                ]
            );

            await pool.query(
                `INSERT INTO students (student_id, user_id, name, class, email)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'STU001',
                    studentUser.insertId,
                    'Demo Student',
                    '10th Grade',
                    'student@school.com'
                ]
            );

            console.log('✅ Default student created');
        }

        console.log('✅ Database initialized successfully');

    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
}

async function getPool() {

    if (!pool) {
        await initializeDatabase();
    }

    return pool;
}

module.exports = {
    initializeDatabase,
    getPool
};