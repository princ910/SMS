// ==========================================
// SCHOOL MANAGEMENT SYSTEM - COMPLETE APP.JS
// ==========================================

const API = "http://localhost:5000/api";

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getToken() { return localStorage.getItem('token'); }
function setToken(token) { if (token) localStorage.setItem('token', token); else localStorage.removeItem('token'); }
function getUser() { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }

// ==========================================
// AUTHENTICATION
// ==========================================

async function login() {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    if (!username || !password) return;
    
    showLoading();
    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.value, password: password.value })
        });
        const data = await res.json();
        
        if (!data.success) {
            const errDiv = document.getElementById('loginError');
            if (errDiv) errDiv.innerText = data.message;
            showToast(data.message, 'error');
            hideLoading();
            return;
        }
        
        setToken(data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data));
        showToast('Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
        hideLoading();
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ==========================================
// ROLE-BASED NAVIGATION SETUP
// ==========================================

function setupNavigation() {
    const user = getUser();
    if (!user) return;
    
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;
    
    let navItems = [];
    
    // Common nav items for all roles
    navItems.push({ page: 'dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard', id: 'navDashboard' });
    
    // Role-specific navigation
    switch(user.role) {
        case 'admin':
            navItems.push(
                { page: 'students', icon: 'fa-user-graduate', text: 'Students' },
                { page: 'teachers', icon: 'fa-chalkboard-teacher', text: 'Teachers' },
                { page: 'classes', icon: 'fa-book', text: 'Classes' },
                { page: 'attendance', icon: 'fa-calendar-check', text: 'Attendance' },
                { page: 'fees', icon: 'fa-money-bill-wave', text: 'Fees' },
                { page: 'users', icon: 'fa-users-cog', text: 'User Management' }
            );
            break;
        case 'teacher':
            navItems.push(
                { page: 'my-students', icon: 'fa-users', text: 'My Students' },
                { page: 'assignments', icon: 'fa-tasks', text: 'Assignments' },
                { page: 'marks', icon: 'fa-star', text: 'Manage Marks' },
                { page: 'attendance', icon: 'fa-calendar-check', text: 'Mark Attendance' }
            );
            break;
        case 'student':
            navItems.push(
                { page: 'my-marks', icon: 'fa-star', text: 'My Marks' },
                { page: 'my-assignments', icon: 'fa-tasks', text: 'Assignments' },
                { page: 'my-attendance', icon: 'fa-calendar-check', text: 'My Attendance' },
                { page: 'my-fees', icon: 'fa-money-bill-wave', text: 'My Fees' }
            );
            break;
        case 'reception':
            navItems.push(
                { page: 'register-student', icon: 'fa-user-plus', text: 'Register Student' },
                { page: 'students', icon: 'fa-user-graduate', text: 'View Students' },
                { page: 'collect-fees', icon: 'fa-money-bill-wave', text: 'Collect Fees' }
            );
            break;
        case 'accountant':
            navItems.push(
                { page: 'fee-management', icon: 'fa-money-bill-wave', text: 'Fee Management' },
                { page: 'payment-history', icon: 'fa-history', text: 'Payment History' }
            );
            break;
    }
    
    // Build navigation HTML
    navMenu.innerHTML = '';
    navItems.forEach(item => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.setAttribute('data-page', item.page);
        navItem.innerHTML = `<i class="fas ${item.icon}"></i> ${item.text}`;
        navItem.onclick = () => loadPage(item.page);
        navMenu.appendChild(navItem);
    });
    
    // Add logout button
    const logoutItem = document.createElement('div');
    logoutItem.className = 'nav-item logout';
    logoutItem.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    logoutItem.onclick = logout;
    navMenu.appendChild(logoutItem);
    
    // Set active class on dashboard
    const firstItem = navMenu.querySelector('.nav-item');
    if (firstItem) firstItem.classList.add('active');
}

function loadPage(page) {
    // Update active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
    
    // Load page content based on role and page
    const user = getUser();
    if (!user) return;
    
    switch(page) {
        case 'dashboard':
            loadDashboard();
            document.getElementById('pageTitle').innerText = 'Dashboard';
            break;
        case 'students':
            loadStudentsList();
            document.getElementById('pageTitle').innerText = 'Student Management';
            break;
        case 'teachers':
            loadTeachersList();
            document.getElementById('pageTitle').innerText = 'Teacher Management';
            break;
        case 'classes':
            loadClassesList();
            document.getElementById('pageTitle').innerText = 'Class Management';
            break;
        case 'attendance':
            loadAttendanceManagement();
            document.getElementById('pageTitle').innerText = 'Attendance Management';
            break;
        case 'fees':
            loadFeeManagement();
            document.getElementById('pageTitle').innerText = 'Fee Management';
            break;
        case 'users':
            loadUserManagement();
            document.getElementById('pageTitle').innerText = 'User Management';
            break;
        case 'my-students':
            loadTeacherStudents();
            document.getElementById('pageTitle').innerText = 'My Students';
            break;
        case 'assignments':
            loadTeacherAssignments();
            document.getElementById('pageTitle').innerText = 'Assignments';
            break;
        case 'marks':
            loadManageMarks();
            document.getElementById('pageTitle').innerText = 'Manage Marks';
            break;
        case 'my-marks':
            loadStudentMarks();
            document.getElementById('pageTitle').innerText = 'My Marks';
            break;
        case 'my-assignments':
            loadStudentAssignments();
            document.getElementById('pageTitle').innerText = 'My Assignments';
            break;
        case 'my-attendance':
            loadStudentAttendance();
            document.getElementById('pageTitle').innerText = 'My Attendance';
            break;
        case 'my-fees':
            loadStudentFees();
            document.getElementById('pageTitle').innerText = 'My Fees';
            break;
        case 'register-student':
            showRegisterStudentForm();
            document.getElementById('pageTitle').innerText = 'Register Student';
            break;
        case 'collect-fees':
            loadCollectFees();
            document.getElementById('pageTitle').innerText = 'Collect Fees';
            break;
        case 'fee-management':
            loadFeeManagement();
            document.getElementById('pageTitle').innerText = 'Fee Management';
            break;
        case 'payment-history':
            loadPaymentHistory();
            document.getElementById('pageTitle').innerText = 'Payment History';
            break;
        default:
            document.getElementById('pageContent').innerHTML = '<div class="form-container"><p>Page under development.</p></div>';
    }
}

// ==========================================
// DASHBOARD LOADING (Role-Based)
// ==========================================

async function loadDashboard() {
    const user = getUser();
    if (!user) return;
    
    showLoading();
    try {
        const res = await fetch(`${API}/dashboard/${user.role}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        let html = `<div class="stats-grid">`;
        
        if (user.role === 'admin') {
            html += `
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-graduate"></i></div>
                    <h3>Total Students</h3><div class="stat-number">${data.data.counts?.students || 0}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                    <h3>Total Teachers</h3><div class="stat-number">${data.data.counts?.teachers || 0}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-book"></i></div>
                    <h3>Total Classes</h3><div class="stat-number">${data.data.counts?.classes || 0}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                    <h3>Today's Attendance</h3><div class="stat-number">${data.data.attendance?.present || 0}/${data.data.attendance?.total || 0}</div></div>
            `;
        } else if (user.role === 'teacher') {
            html += `
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div>
                    <h3>My Students</h3><div class="stat-number">${data.data.students_count || 0}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-tasks"></i></div>
                    <h3>Assignments</h3><div class="stat-number">${data.data.assignments_count || 0}</div></div>
            `;
        } else if (user.role === 'student') {
            html += `
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-star"></i></div>
                    <h3>Discipline Marks</h3><div class="stat-number">${data.data.discipline_marks || 100}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                    <h3>Attendance</h3><div class="stat-number">${data.data.attendance?.percentage || 0}%</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-tasks"></i></div>
                    <h3>Pending Assignments</h3><div class="stat-number">${data.data.pending_assignments || 0}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <h3>Fee Due</h3><div class="stat-number">₹${data.data.fees?.due || 0}</div></div>
            `;
        } else if (user.role === 'reception') {
            html += `
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-plus"></i></div>
                    <h3>Today's Registrations</h3><div class="stat-number">${data.data.today_registrations || 0}</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <h3>Today's Collection</h3><div class="stat-number">${data.data.today_collections || 0} RWF</div></div>
            `;
        } else if (user.role === 'accountant') {
            html += `
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <h3>Monthly Collection</h3><div class="stat-number">${data.data.monthly_collection || 0} RWF</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3>Overdue Payments</h3><div class="stat-number">${data.data.overdue?.count || 0}</div></div>
            `;
        }
        
        html += `</div>`;
        html += `<div class="form-container"><h3><i class="fas fa-user-circle"></i> Welcome, ${escapeHtml(user.full_name)}!</h3>
                 <p><strong>Role:</strong> ${user.role.toUpperCase()}</p>
                 <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
                 <p><strong>Logged in as:</strong> ${escapeHtml(user.username)}</p>
                 <hr>
                 <p>Use the sidebar menu to navigate through different features.</p></div>`;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        console.error('Dashboard error:', error);
        hideLoading();
        document.getElementById('pageContent').innerHTML = `<div class="form-container"><h3>Welcome ${escapeHtml(user.full_name)}!</h3><p>Role: ${user.role}</p><p>Dashboard loaded successfully.</p></div>`;
    }
}

// ==========================================
// STUDENT MANAGEMENT (Admin/Reception)
// ==========================================

async function loadStudentsList() {
    showLoading();
    try {
        const res = await fetch(`${API}/students`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const students = data.data || [];
        
        let html = `
            <div class="form-container">
                <h3><i class="fas fa-list"></i> Student List</h3>
                <button class="btn btn-primary" onclick="showAddStudentModal()"><i class="fas fa-plus"></i> Add Student</button>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Student ID</th><th>Name</th><th>Class</th><th>Section</th><th>Parent Phone</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${students.map(s => `
                            <tr>
                                <td>${escapeHtml(s.student_id || s.id)}</span>
                                <td>${escapeHtml(s.name)}</span>
                                <td>${escapeHtml(s.class || '-')}</span>
                                <td>${escapeHtml(s.section || '-')}</span>
                                <td>${escapeHtml(s.parent_phone || '-')}</span>
                                <td>
                                    <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id})"><i class="fas fa-trash"></i> Delete</button>
                                </span
                            </tr>
                        `).join('')}
                        ${students.length === 0 ? '<tr><td colspan="6">No students found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load students', 'error');
    }
}

function showAddStudentModal() {
    const html = `
        <div id="studentModal" class="modal" style="display:block">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-user-plus"></i> Add Student</h3><span class="close" onclick="closeModal('studentModal')">&times;</span></div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group"><label>Student ID *</label><input type="text" id="student_id" placeholder="STU001"></div>
                        <div class="form-group"><label>Full Name *</label><input type="text" id="student_name" placeholder="Enter name"></div>
                        <div class="form-group"><label>Class *</label><input type="text" id="student_class" placeholder="10th Grade"></div>
                        <div class="form-group"><label>Section</label><input type="text" id="student_section" placeholder="A"></div>
                        <div class="form-group"><label>Parent Phone</label><input type="text" id="parent_phone" placeholder="Contact number"></div>
                        <div class="form-group"><label>Email</label><input type="email" id="student_email" placeholder="student@school.com"></div>
                        <div class="form-group"><label>Phone</label><input type="text" id="student_phone" placeholder="Student phone"></div>
                        <div class="form-group"><label>Gender</label><select id="gender"><option value="male">Male</option><option value="female">Female</option></select></div>
                    </div>
                    <div class="form-group"><label>Address</label><textarea id="student_address" rows="2"></textarea></div>
                    <button class="btn btn-primary" onclick="addStudent()"><i class="fas fa-save"></i> Save</button>
                    <button class="btn" onclick="closeModal('studentModal')"><i class="fas fa-times"></i> Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function addStudent() {
    const data = {
        student_id: document.getElementById('student_id')?.value,
        name: document.getElementById('student_name')?.value,
        class: document.getElementById('student_class')?.value,
        section: document.getElementById('student_section')?.value,
        parent_phone: document.getElementById('parent_phone')?.value,
        email: document.getElementById('student_email')?.value,
        phone: document.getElementById('student_phone')?.value,
        address: document.getElementById('student_address')?.value,
        gender: document.getElementById('gender')?.value
    };
    
    if (!data.name || !data.class) {
        showToast('Name and class are required', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        showToast('Student added successfully');
        closeModal('studentModal');
        loadStudentsList();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    showLoading();
    try {
        const res = await fetch(`${API}/students/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast('Student deleted successfully');
        loadStudentsList();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

// ==========================================
// TEACHER FUNCTIONS
// ==========================================

async function loadTeachersList() {
    showLoading();
    try {
        const res = await fetch(`${API}/teachers`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const teachers = data.data || [];
        
        let html = `
            <div class="table-container">
                <h3><i class="fas fa-chalkboard-teacher"></i> Teachers List</h3>
                <table>
                    <thead><tr><th>Teacher ID</th><th>Name</th><th>Specialization</th><th>Email</th><th>Phone</th></tr></thead>
                    <tbody>
                        ${teachers.map(t => `
                            <tr>
                                <td>${escapeHtml(t.teacher_id || t.id)}</span>
                                <td>${escapeHtml(t.name)}</span>
                                <td>${escapeHtml(t.specialization || '-')}</span>
                                <td>${escapeHtml(t.email)}</span>
                                <td>${escapeHtml(t.phone || '-')}</span>
                            </tr>
                        `).join('')}
                        ${teachers.length === 0 ? '<tr><td colspan="5">No teachers found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load teachers', 'error');
    }
}

async function loadClassesList() {
    showLoading();
    try {
        const res = await fetch(`${API}/classes`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const classes = data.data || [];
        
        let html = `
            <div class="table-container">
                <h3><i class="fas fa-book"></i> Classes List</h3>
                <table>
                    <thead><tr><th>Class Name</th><th>Section</th><th>Teacher</th><th>Room</th><th>Capacity</th></tr></thead>
                    <tbody>
                        ${classes.map(c => `
                            <tr>
                                <td>${escapeHtml(c.class_name)}</span>
                                <td>${escapeHtml(c.section || '-')}</span>
                                <td>${escapeHtml(c.teacher_name || '-')}</span>
                                <td>${escapeHtml(c.room_number || '-')}</span>
                                <td>${c.capacity || 30}</span>
                            </tr>
                        `).join('')}
                        ${classes.length === 0 ? '<tr><td colspan="5">No classes found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load classes', 'error');
    }
}

// ==========================================
// TEACHER SPECIFIC FUNCTIONS
// ==========================================

async function loadTeacherStudents() {
    showLoading();
    try {
        const res = await fetch(`${API}/teachers/class-students`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const students = data.data || [];
        
        let html = `
            <div class="table-container">
                <h3><i class="fas fa-users"></i> My Students</h3>
                <table>
                    <thead><tr><th>Student ID</th><th>Name</th><th>Class</th><th>Roll No</th><th>Parent Phone</th></tr></thead>
                    <tbody>
                        ${students.map(s => `
                            <tr>
                                <td>${escapeHtml(s.student_id)}</span>
                                <td>${escapeHtml(s.name)}</span>
                                <td>${escapeHtml(s.class)}</span>
                                <td>${s.roll_number || '-'}</span>
                                <td>${escapeHtml(s.parent_phone || '-')}</span>
                            </tr>
                        `).join('')}
                        ${students.length === 0 ? '<tr><td colspan="5">No students assigned</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load students', 'error');
    }
}

async function loadTeacherAssignments() {
    showLoading();
    try {
        const res = await fetch(`${API}/teachers/assignments`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        let html = `
            <div class="form-container">
                <h3><i class="fas fa-plus-circle"></i> Create New Assignment</h3>
                <div class="form-row">
                    <div class="form-group"><label>Class</label><input type="text" id="assign_class" placeholder="10th Grade"></div>
                    <div class="form-group"><label>Subject</label><input type="text" id="assign_subject" placeholder="Mathematics"></div>
                    <div class="form-group"><label>Title</label><input type="text" id="assign_title" placeholder="Assignment Title"></div>
                    <div class="form-group"><label>Due Date</label><input type="date" id="assign_due_date"></div>
                </div>
                <div class="form-group"><label>Description</label><textarea id="assign_description" rows="3"></textarea></div>
                <button class="btn btn-primary" onclick="createAssignment()"><i class="fas fa-save"></i> Create Assignment</button>
            </div>
            <div class="table-container">
                <h3><i class="fas fa-tasks"></i> My Assignments</h3>
                <table>
                    <thead><tr><th>Class</th><th>Subject</th><th>Title</th><th>Due Date</th></tr></thead>
                    <tbody>
                        ${(data.data || []).map(a => `
                            <tr>
                                <td>${escapeHtml(a.class)}</span>
                                <td>${escapeHtml(a.subject)}</span>
                                <td>${escapeHtml(a.title)}</span>
                                <td>${new Date(a.due_date).toLocaleDateString()}</span>
                            </tr>
                        `).join('')}
                        ${(data.data || []).length === 0 ? '<tr><td colspan="4">No assignments created</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load assignments', 'error');
    }
}

async function createAssignment() {
    const data = {
        class: document.getElementById('assign_class')?.value,
        subject: document.getElementById('assign_subject')?.value,
        title: document.getElementById('assign_title')?.value,
        due_date: document.getElementById('assign_due_date')?.value,
        description: document.getElementById('assign_description')?.value
    };
    
    if (!data.class || !data.subject || !data.title || !data.due_date) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/teachers/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        showToast('Assignment created successfully');
        loadTeacherAssignments();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

async function loadManageMarks() {
    showLoading();
    try {
        const res = await fetch(`${API}/teachers/class-students`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const students = data.data || [];
        
        let html = `
            <div class="table-container">
                <h3><i class="fas fa-star"></i> Manage Student Marks</h3>
                <table>
                    <thead><tr><th>Student ID</th><th>Student Name</th><th>Class</th><th>Action</th></tr></thead>
                    <tbody>
                        ${students.map(s => `
                            <tr>
                                <td>${escapeHtml(s.student_id)}</span>
                                <td>${escapeHtml(s.name)}</span>
                                <td>${escapeHtml(s.class)}</span>
                                <td><button class="btn btn-primary btn-sm" onclick="showAddMarksModal('${s.student_id}', '${escapeHtml(s.name)}')"><i class="fas fa-plus"></i> Add Marks</button></span>
                            </tr>
                        `).join('')}
                        ${students.length === 0 ? '<td><td colspan="4">No students found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load students', 'error');
    }
}

function showAddMarksModal(studentId, studentName) {
    const html = `
        <div id="marksModal" class="modal" style="display:block">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-star"></i> Add Marks for ${studentName}</h3><span class="close" onclick="closeModal('marksModal')">&times;</span></div>
                <div class="modal-body">
                    <div class="form-group"><label>Subject</label><input type="text" id="marks_subject" placeholder="Mathematics"></div>
                    <div class="form-group"><label>Exam Type</label>
                        <select id="marks_exam_type">
                            <option value="midterm">Midterm Exam</option>
                            <option value="final">Final Exam</option>
                            <option value="quiz">Quiz</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Marks Obtained</label><input type="number" id="marks_obtained" placeholder="85"></div>
                        <div class="form-group"><label>Total Marks</label><input type="number" id="total_marks" value="100"></div>
                        <div class="form-group"><label>Exam Date</label><input type="date" id="exam_date"></div>
                    </div>
                    <button class="btn btn-primary" onclick="addMarks('${studentId}')"><i class="fas fa-save"></i> Save Marks</button>
                    <button class="btn" onclick="closeModal('marksModal')"><i class="fas fa-times"></i> Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function addMarks(studentId) {
    const data = {
        student_id: studentId,
        subject: document.getElementById('marks_subject')?.value,
        exam_type: document.getElementById('marks_exam_type')?.value,
        marks_obtained: parseInt(document.getElementById('marks_obtained')?.value) || 0,
        total_marks: parseInt(document.getElementById('total_marks')?.value) || 100,
        exam_date: document.getElementById('exam_date')?.value
    };
    
    if (!data.subject || !data.exam_date) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/teachers/marks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        showToast('Marks added successfully');
        closeModal('marksModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

// ==========================================
// STUDENT SPECIFIC FUNCTIONS
// ==========================================

async function loadStudentMarks() {
    showLoading();
    try {
        const res = await fetch(`${API}/students/marks`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const marks = data.data || [];
        
        let html = `
            <div class="table-container">
                <h3><i class="fas fa-star"></i> My Marks</h3>
                <table>
                    <thead><tr><th>Subject</th><th>Exam Type</th><th>Marks Obtained</th><th>Total Marks</th><th>Percentage</th><th>Date</th></tr></thead>
                    <tbody>
                        ${marks.map(m => `
                            <tr>
                                <td>${escapeHtml(m.subject)}</span>
                                <td>${m.exam_type}</span>
                                <td>${m.marks_obtained}</span>
                                <td>${m.total_marks}</span>
                                <td>${((m.marks_obtained / m.total_marks) * 100).toFixed(2)}%</span>
                                <td>${new Date(m.exam_date).toLocaleDateString()}</span>
                            </tr>
                        `).join('')}
                        ${marks.length === 0 ? '<tr><td colspan="6">No marks available</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load marks', 'error');
    }
}

async function loadStudentAssignments() {
    showLoading();
    try {
        const res = await fetch(`${API}/students/assignments`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const assignments = data.data || [];
        
        let html = `
            <div class="table-container">
                <h3><i class="fas fa-tasks"></i> My Assignments</h3>
                <table>
                    <thead><tr><th>Subject</th><th>Title</th><th>Description</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        ${assignments.map(a => `
                            <tr>
                                <td>${escapeHtml(a.subject)}</span>
                                <td>${escapeHtml(a.title)}</span>
                                <td>${escapeHtml(a.description?.substring(0, 50) || '-')}</span>
                                <td>${new Date(a.due_date).toLocaleDateString()}</span>
                                <td>${a.is_submitted ? '<span class="badge badge-success"><i class="fas fa-check"></i> Submitted</span>' : '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>'}</span>
                                <td>${!a.is_submitted ? `<button class="btn btn-primary btn-sm" onclick="showSubmitAssignmentModal(${a.id})"><i class="fas fa-upload"></i> Submit</button>` : '-'}</span>
                            </tr>
                        `).join('')}
                        ${assignments.length === 0 ? '<tr><td colspan="6">No assignments available</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load assignments', 'error');
    }
}

function showSubmitAssignmentModal(assignmentId) {
    const html = `
        <div id="submitModal" class="modal" style="display:block">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-upload"></i> Submit Assignment</h3><span class="close" onclick="closeModal('submitModal')">&times;</span></div>
                <div class="modal-body">
                    <div class="form-group"><label>Your Submission</label><textarea id="submission_text" rows="5" placeholder="Write your answer here..."></textarea></div>
                    <button class="btn btn-primary" onclick="submitAssignment(${assignmentId})"><i class="fas fa-paper-plane"></i> Submit</button>
                    <button class="btn" onclick="closeModal('submitModal')"><i class="fas fa-times"></i> Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function submitAssignment(assignmentId) {
    const submissionText = document.getElementById('submission_text')?.value;
    if (!submissionText) {
        showToast('Please write your submission', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/students/submit-assignment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ assignment_id: assignmentId, submission_text: submissionText })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast('Assignment submitted successfully');
        closeModal('submitModal');
        loadStudentAssignments();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

async function loadStudentAttendance() {
    showLoading();
    try {
        const res = await fetch(`${API}/students/attendance`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const records = data.data?.records || [];
        const summary = data.data?.summary || { total: 0, present: 0, percentage: 0 };
        
        let html = `
            <div class="stats-grid">
                <div class="stat-card"><h3><i class="fas fa-calendar-alt"></i> Total Days</h3><div class="stat-number">${summary.total}</div></div>
                <div class="stat-card"><h3><i class="fas fa-check-circle"></i> Present</h3><div class="stat-number" style="color:#1cc88a">${summary.present}</div></div>
                <div class="stat-card"><h3><i class="fas fa-percent"></i> Percentage</h3><div class="stat-number">${summary.percentage}%</div></div>
            </div>
            <div class="table-container">
                <h3><i class="fas fa-list"></i> Attendance Records</h3>
                <table>
                    <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
                    <tbody>
                        ${records.map(a => `
                            <tr>
                                <td>${new Date(a.date).toLocaleDateString()}</span>
                                <td><span class="badge ${a.status === 'present' ? 'badge-success' : (a.status === 'late' ? 'badge-warning' : 'badge-danger')}">${a.status}</span></span>
                                <td>${a.remarks || '-'}</span>
                            </tr>
                        `).join('')}
                        ${records.length === 0 ? '<tr><td colspan="3">No attendance records found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load attendance', 'error');
    }
}

async function loadStudentFees() {
    showLoading();
    try {
        const res = await fetch(`${API}/fees/my-fees`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const records = data.data?.records || [];
        const summary = data.data?.summary || { total_fees: 0, total_paid: 0, total_due: 0 };
        
        let html = `
            <div class="stats-grid">
                <div class="stat-card"><h3><i class="fas fa-rupee-sign"></i> Total Fees</h3><div class="stat-number">₹${summary.total_fees}</div></div>
                <div class="stat-card"><h3><i class="fas fa-check-circle"></i> Paid</h3><div class="stat-number" style="color:#1cc88a">₹${summary.total_paid}</div></div>
                <div class="stat-card"><h3><i class="fas fa-exclamation-triangle"></i> Due</h3><div class="stat-number" style="color:#e74a3b">₹${summary.total_due}</div></div>
            </div>
            <div class="table-container">
                <h3><i class="fas fa-receipt"></i> Fee Details</h3>
                <table>
                    <thead><tr><th>Fee Type</th><th>Amount</th><th>Paid</th><th>Due Date</th><th>Status</th></tr></thead>
                    <tbody>
                        ${records.map(f => `
                            <tr>
                                <td>${escapeHtml(f.fee_type)}</span>
                                <td>₹${f.amount}</span>
                                <td>₹${f.paid_amount}</span>
                                <td>${new Date(f.due_date).toLocaleDateString()}</span>
                                <td><span class="badge ${f.payment_status === 'paid' ? 'badge-success' : (f.payment_status === 'partial' ? 'badge-warning' : 'badge-danger')}">${f.payment_status}</span></span>
                            </tr>
                        `).join('')}
                        ${records.length === 0 ? '<tr><td colspan="5">No fee records found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load fees', 'error');
    }
}

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

let currentAttendanceRecords = [];

async function loadAttendanceManagement() {
    const today = new Date().toISOString().split('T')[0];
    const html = `
        <div class="form-container">
            <h3><i class="fas fa-calendar-check"></i> Mark Attendance</h3>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" id="attendanceDate" value="${today}"></div>
                <div class="form-group"><label>Class</label><input type="text" id="attendanceClass" placeholder="e.g., 10th Grade"></div>
                <div class="form-group"><label>Section</label><input type="text" id="attendanceSection" placeholder="A/B/C"></div>
            </div>
            <button class="btn btn-primary" onclick="loadStudentsForAttendance()"><i class="fas fa-users"></i> Load Students</button>
        </div>
        <div id="attendanceList"></div>
        <div id="attendanceButtons" style="display:none; text-align:center; margin-top:20px;">
            <button class="btn btn-success" onclick="saveAttendance()"><i class="fas fa-save"></i> Save Attendance</button>
            <button class="btn btn-warning" onclick="markAllPresent()"><i class="fas fa-check-double"></i> Mark All Present</button>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
}

async function loadStudentsForAttendance() {
    const className = document.getElementById('attendanceClass')?.value;
    const section = document.getElementById('attendanceSection')?.value;
    const date = document.getElementById('attendanceDate')?.value;
    
    if (!className) { showToast('Enter class name', 'error'); return; }
    
    showLoading();
    try {
        let url = `${API}/attendance/students?class=${encodeURIComponent(className)}`;
        if (section) url += `&section=${encodeURIComponent(section)}`;
        
        const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        
        const students = data.data || [];
        if (students.length === 0) { showToast('No students found', 'error'); hideLoading(); return; }
        
        // Get existing attendance
        const existingRes = await fetch(`${API}/attendance?date=${date}&class=${encodeURIComponent(className)}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const existingData = await existingRes.json();
        const existingAttendance = existingData.data || [];
        
        currentAttendanceRecords = students.map(s => {
            const existing = existingAttendance.find(a => a.student_id === s.student_id);
            return { student_id: s.student_id, student_name: s.name, roll_number: s.roll_number, status: existing ? existing.status : 'present' };
        });
        
        displayAttendanceList();
        document.getElementById('attendanceButtons').style.display = 'block';
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function displayAttendanceList() {
    const summary = {
        present: currentAttendanceRecords.filter(r => r.status === 'present').length,
        absent: currentAttendanceRecords.filter(r => r.status === 'absent').length,
        late: currentAttendanceRecords.filter(r => r.status === 'late').length
    };
    
    const html = `
        <div class="form-container">
            <h3><i class="fas fa-chart-bar"></i> Attendance Summary</h3>
            <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
                <div class="stat-card"><h3>Present</h3><div class="stat-number" style="color:#1cc88a">${summary.present}</div></div>
                <div class="stat-card"><h3>Absent</h3><div class="stat-number" style="color:#e74a3b">${summary.absent}</div></div>
                <div class="stat-card"><h3>Late</h3><div class="stat-number" style="color:#f6c23e">${summary.late}</div></div>
            </div>
        </div>
        <div class="table-container">
            <td><thead><tr><th>Roll No</th><th>Student Name</th><th>Status</th></tr></thead>
            <tbody>
                ${currentAttendanceRecords.map((r, i) => `
                    <tr>
                        <td>${r.roll_number || '-'}</span>
                        <td>${escapeHtml(r.student_name)}</span>
                        <td>
                            <button class="btn btn-sm ${r.status === 'present' ? 'btn-success' : 'btn-secondary'}" onclick="setAttendanceStatus(${i}, 'present')"><i class="fas fa-check"></i> Present</button>
                            <button class="btn btn-sm ${r.status === 'absent' ? 'btn-danger' : 'btn-secondary'}" onclick="setAttendanceStatus(${i}, 'absent')"><i class="fas fa-times"></i> Absent</button>
                            <button class="btn btn-sm ${r.status === 'late' ? 'btn-warning' : 'btn-secondary'}" onclick="setAttendanceStatus(${i}, 'late')"><i class="fas fa-clock"></i> Late</button>
                        </span
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
    `;
    document.getElementById('attendanceList').innerHTML = html;
}

function setAttendanceStatus(index, status) {
    currentAttendanceRecords[index].status = status;
    displayAttendanceList();
}

function markAllPresent() {
    currentAttendanceRecords = currentAttendanceRecords.map(r => ({ ...r, status: 'present' }));
    displayAttendanceList();
    showToast('All students marked as present');
}

async function saveAttendance() {
    const date = document.getElementById('attendanceDate')?.value;
    if (!date) { showToast('Select date', 'error'); return; }
    
    showLoading();
    try {
        const res = await fetch(`${API}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ date, attendance_records: currentAttendanceRecords.map(r => ({ student_id: r.student_id, status: r.status })) })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast('Attendance saved successfully');
        await loadStudentsForAttendance();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

// ==========================================
// FEE MANAGEMENT (Accountant/Reception)
// ==========================================

async function loadFeeManagement() {
    showLoading();
    try {
        const res = await fetch(`${API}/fees`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const fees = data.data || [];
        
        let html = `
            <div class="form-container">
                <h3><i class="fas fa-plus-circle"></i> Add Fee Record</h3>
                <div class="form-row">
                    <div class="form-group"><label>Student ID</label><input type="text" id="fee_student_id" placeholder="Student ID"></div>
                    <div class="form-group"><label>Fee Type</label><input type="text" id="fee_type" placeholder="Tuition Fee"></div>
                    <div class="form-group"><label>Amount</label><input type="number" id="fee_amount" placeholder="Amount"></div>
                    <div class="form-group"><label>Due Date</label><input type="date" id="fee_due_date"></div>
                </div>
                <button class="btn btn-primary" onclick="createFeeRecord()"><i class="fas fa-save"></i> Add Fee</button>
            </div>
            <div class="table-container">
                <h3><i class="fas fa-list"></i> Fee Records</h3>
                <table>
                    <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Paid</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        ${fees.map(f => `
                            <tr>
                                <td>${escapeHtml(f.student_name)}</span>
                                <td>${escapeHtml(f.fee_type)}</span>
                                <td>${f.amount} RWF</span>
                                <td>${f.paid_amount || 0} RWF</span>
                                <td>${new Date(f.due_date).toLocaleDateString()}</span>
                                <td><span class="badge ${f.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">${f.payment_status}</span></span>
                                <td><button class="btn btn-success btn-sm" onclick="recordPayment(${f.id})"><i class="fas fa-money-bill-wave"></i> Record Payment</button></span>
                            </tr>
                        `).join('')}
                        ${fees.length === 0 ? '<tr><td colspan="7">No fee records found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load fees', 'error');
    }
}

async function createFeeRecord() {
    const data = {
        student_id: document.getElementById('fee_student_id')?.value,
        fee_type: document.getElementById('fee_type')?.value,
        amount: parseFloat(document.getElementById('fee_amount')?.value),
        due_date: document.getElementById('fee_due_date')?.value
    };
    
    if (!data.student_id || !data.fee_type || !data.amount || !data.due_date) {
        showToast('Fill all fields', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/fees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        showToast('Fee record added successfully');
        loadFeeManagement();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

async function recordPayment(feeId) {
    const amount = prompt('Enter payment amount:');
    if (!amount) return;
    
    showLoading();
    try {
        const res = await fetch(`${API}/fees/${feeId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ amount: parseFloat(amount), payment_method: 'cash' })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast('Payment recorded successfully');
        loadFeeManagement();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

// ==========================================
// USER MANAGEMENT (Admin Only)
// ==========================================

async function loadUserManagement() {
    const user = getUser();
    if (user?.role !== 'admin') {
        document.getElementById('pageContent').innerHTML = '<div class="form-container"><h3><i class="fas fa-lock"></i> Access Denied</h3><p>This area is restricted to administrators only.</p></div>';
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/auth/users`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const users = data.data || [];
        
        let html = `
            <div class="form-container">
                <h3><i class="fas fa-user-plus"></i> Add New User</h3>
                <div class="form-row">
                    <div class="form-group"><label>Username</label><input type="text" id="new_username" placeholder="Username"></div>
                    <div class="form-group"><label>Password</label><input type="password" id="new_password" placeholder="Password"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="new_email" placeholder="Email"></div>
                    <div class="form-group"><label>Full Name</label><input type="text" id="new_fullname" placeholder="Full Name"></div>
                    <div class="form-group"><label>Role</label>
                        <select id="new_role">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="reception">Reception</option>
                            <option value="accountant">Accountant</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="createUser()"><i class="fas fa-save"></i> Create User</button>
            </div>
            <div class="table-container">
                <h3><i class="fas fa-users"></i> System Users</h3>
                <table>
                    <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${escapeHtml(u.username)}</span>
                                <td>${escapeHtml(u.full_name)}</span>
                                <td>${escapeHtml(u.email)}</span>
                                <td><span class="badge badge-${u.role}">${u.role}</span></span>
                                <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></span>
                                <td>
                                    <button class="btn btn-warning btn-sm" onclick="resetUserPassword(${u.id}, '${escapeHtml(u.username)}')"><i class="fas fa-key"></i> Reset Pwd</button>
                                    <button class="btn btn-danger btn-sm" onclick="toggleUserStatus(${u.id}, ${!u.is_active})">${u.is_active ? '<i class="fas fa-ban"></i> Deactivate' : '<i class="fas fa-check"></i> Activate'}</button>
                                </span
                            </tr>
                        `).join('')}
                        ${users.length === 0 ? '<tr><td colspan="6">No users found</td>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load users', 'error');
    }
}

async function createUser() {
    const data = {
        username: document.getElementById('new_username')?.value,
        password: document.getElementById('new_password')?.value,
        email: document.getElementById('new_email')?.value,
        full_name: document.getElementById('new_fullname')?.value,
        role: document.getElementById('new_role')?.value
    };
    
    if (!data.username || !data.password || !data.email || !data.full_name || !data.role) {
        showToast('Fill all fields', 'error');
        return;
    }
    
    if (data.password.length < 4) {
        showToast('Password must be at least 4 characters', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        showToast('User created successfully');
        loadUserManagement();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
}

window.resetUserPassword = async function(userId, username) {
    const newPassword = prompt(`Enter new password for "${username}":`);
    if (!newPassword || newPassword.length < 4) {
        if (newPassword) showToast('Password must be at least 4 characters', 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await fetch(`${API}/auth/reset-password/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ password: newPassword })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast(`Password reset for ${username} successfully`);
        loadUserManagement();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
};

window.toggleUserStatus = async function(userId, activate) {
    const action = activate ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    showLoading();
    try {
        const res = await fetch(`${API}/auth/toggle-status/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ is_active: activate })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast(`User ${action}d successfully`);
        loadUserManagement();
    } catch (error) {
        showToast(error.message, 'error');
    }
    hideLoading();
};

// ==========================================
// RECEPTION FUNCTIONS
// ==========================================

function showRegisterStudentForm() {
    showAddStudentModal();
}

async function loadCollectFees() {
    loadFeeManagement();
}

async function loadPaymentHistory() {
    loadFeeManagement();
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// ==========================================
// PAGE INITIALIZATION
// ==========================================

// Make functions global
window.showAddStudentModal = showAddStudentModal;
window.closeModal = closeModal;
window.addStudent = addStudent;
window.deleteStudent = deleteStudent;
window.loadStudentsForAttendance = loadStudentsForAttendance;
window.setAttendanceStatus = setAttendanceStatus;
window.markAllPresent = markAllPresent;
window.saveAttendance = saveAttendance;
window.createAssignment = createAssignment;
window.showSubmitAssignmentModal = showSubmitAssignmentModal;
window.submitAssignment = submitAssignment;
window.createFeeRecord = createFeeRecord;
window.recordPayment = recordPayment;
window.showAddMarksModal = showAddMarksModal;
window.addMarks = addMarks;
window.createUser = createUser;
window.resetUserPassword = resetUserPassword;
window.toggleUserStatus = toggleUserStatus;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Login page
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', e => { 
                e.preventDefault(); 
                login(); 
            });
        }
    }
    
    // Dashboard page
    if (path.includes('dashboard')) {
        const token = getToken();
        if (!token) { 
            window.location.href = 'index.html'; 
            return; 
        }
        
        const user = getUser();
        if (user) {
            document.getElementById('userName').innerText = user.full_name;
            document.getElementById('userRole').innerText = user.role.toUpperCase();
        }
        
        setupNavigation();
        loadDashboard();
    }
});