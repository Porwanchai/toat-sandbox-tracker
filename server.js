const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const dbModule = require('./database');

const { dbRun, dbGet, dbAll, initDatabase } = dbModule;

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Initialize Database
initDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session Configuration
app.use(session({
  secret: 'toat-sandbox-super-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false // Set to true if running over HTTPS
  }
}));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Serve static directories
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Helper Middlewares
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

// GET logged-in user profile
app.get('/api/auth/me', async (req, res) => {
  if (req.session.user) {
    try {
      const user = await dbGet('SELECT id, username, email, role, allowed_views, is_approved FROM users WHERE id = ?', [req.session.user.id]);
      if (!user || user.is_approved !== 1) {
        req.session.destroy();
        return res.status(401).json({ error: 'Session invalid or unapproved' });
      }
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter username and password' });
  }
  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.is_approved !== 1) {
      return res.status(403).json({ error: 'บัญชีนี้ยังไม่ได้รับการอนุมัติสิทธิ์เข้าใช้งานจากผู้ดูแลระบบ (Admin)' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      allowed_views: user.allowed_views
    };
    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register (Default role: Project Submitter / Staff)
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, employee_id, division, department, line_id, phone_number } = req.body;
  if (!username || !email || !password || !employee_id || !division || !department || !line_id || !phone_number) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }
  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' });
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const role = 'Project Submitter'; // Default registration role

    await dbRun('INSERT INTO users (username, email, password_hash, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)', [
      username, email, hash, role, employee_id, division, department, line_id, phone_number, 'dashboard,projects-list'
    ]);
    res.status(201).json({ message: 'ลงทะเบียนสำเร็จ รอผู้ดูแลระบบ (Admin) อนุมัติสิทธิ์เข้าใช้งาน' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Mock Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please provide email address' });
  }
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }
    // Simulate recovery link
    console.log(`[PASSWORD RECOVERY SIMULATION] Recovery link sent to ${email} for user: ${user.username}`);
    res.json({ message: 'Password recovery link has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// PROJECT ENDPOINTS
// ----------------------------------------------------

// Helper: Check if user has access to project (Read access - allowed for any logged-in user)
async function checkProjectAccess(userId, role, projectId) {
  return true;
}

// Helper: Check if user has permission to edit project (Write access)
async function checkProjectEditAccess(userId, role, projectId) {
  if (role === 'Admin') return true;
  if (role === 'Executive') return false; // Executive can never edit
  
  // Project Submitter (Staff) can only edit assigned projects
  const assignment = await dbGet(
    'SELECT 1 FROM project_assignments WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return !!assignment;
}

// Get project summary / stats cards
app.get('/api/projects/stats', requireLogin, async (req, res) => {
  const { id: userId, role } = req.session.user;
  try {
    let budgetQuery = `
      SELECT 
        SUM(allocated_amount) as total_allocated,
        SUM(spent_amount) as total_spent,
        (SUM(allocated_amount) - SUM(spent_amount)) as total_remaining
      FROM budgets b
    `;
    let statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM projects p
    `;
    let queryParams = [];

    if (role === 'Project Submitter') {
      budgetQuery += ` JOIN project_assignments pa ON b.project_id = pa.project_id WHERE pa.user_id = ?`;
      statusQuery += ` JOIN project_assignments pa ON p.id = pa.project_id WHERE pa.user_id = ? GROUP BY status`;
      queryParams = [userId];
    } else {
      statusQuery += ` GROUP BY status`;
    }

    const budgetStats = await dbGet(budgetQuery, queryParams);
    const statusCounts = await dbAll(statusQuery, queryParams);

    // Format status counts
    const statusCountsMap = { 'Not Started': 0, 'In Progress': 0, 'Delayed': 0, 'Completed': 0 };
    statusCounts.forEach(row => {
      statusCountsMap[row.status] = row.count;
    });

    res.json({
      budget: {
        total_allocated: budgetStats.total_allocated || 0,
        total_spent: budgetStats.total_spent || 0,
        total_remaining: budgetStats.total_remaining || 0
      },
      status: statusCountsMap
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Projects (with overall completion rollup and report status for current cycle)
app.get('/api/projects', requireLogin, async (req, res) => {
  const { id: userId, role } = req.session.user;
  
  // Calculate current reporting cycle month (previous month)
  const now = new Date();
  let cycleYear = now.getFullYear();
  let cycleMonth = now.getMonth();
  if (cycleMonth === 0) {
    cycleMonth = 12;
    cycleYear -= 1;
  }
  const reportMonthYear = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`;

  try {
    let query = `
      SELECT 
        p.*, 
        (
          SELECT COALESCE(AVG(gt.progress_percent), 0) 
          FROM gantt_tasks gt 
          WHERE gt.project_id = p.id
        ) as overall_progress,
        (
          SELECT SUM(b.allocated_amount) 
          FROM budgets b 
          WHERE b.project_id = p.id
        ) as total_allocated,
        (
          SELECT SUM(b.spent_amount) 
          FROM budgets b 
          WHERE b.project_id = p.id
        ) as total_spent,
        (
          SELECT status 
          FROM monthly_reports mr 
          WHERE mr.project_id = p.id AND mr.report_month_year = ?
        ) as current_report_status
      FROM projects p
    `;
    let params = [reportMonthYear];

    const projects = await dbAll(query, params);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Project (Admin & Staff/Project Submitter can create)
app.post('/api/projects', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const { project_name, description, status, project_group } = req.body;
  if (!project_name) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  try {
    const result = await dbRun(
      'INSERT INTO projects (project_name, description, status, project_group) VALUES (?, ?, ?, ?)',
      [project_name, description, status || 'Not Started', project_group || 'โครงการ TOAT Sandbox']
    );
    const projectId = result.lastID;

    // Automatically assign creator to their project
    await dbRun('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [
      projectId, req.session.user.id
    ]);

    res.status(201).json({ message: 'Project created successfully', projectId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Project details
app.get('/api/projects/:id', requireLogin, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;

  try {
    const hasAccess = await checkProjectAccess(userId, role, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await dbGet(`
      SELECT 
        p.*,
        (SELECT COALESCE(AVG(progress_percent), 0) FROM gantt_tasks WHERE project_id = p.id) as overall_progress
      FROM projects p 
      WHERE p.id = ?
    `, [projectId]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const can_edit = await checkProjectEditAccess(userId, role, projectId);
    project.can_edit = can_edit ? 1 : 0;

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Project (Admin & Staff)
app.put('/api/projects/:id', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { project_name, description, status, project_group } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to edit this project.' });
    }

    await dbRun(
      'UPDATE projects SET project_name = ?, description = ?, status = ?, project_group = ? WHERE id = ?',
      [project_name, description, status, project_group || 'โครงการ TOAT Sandbox', projectId]
    );

    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Project (Admin only)
app.delete('/api/projects/:id', requireLogin, requireRole(['Admin']), async (req, res) => {
  const projectId = req.params.id;
  try {
    await dbRun('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// MEMBERS & STAKEHOLDERS ENDPOINTS
// ----------------------------------------------------

// Get project members
app.get('/api/projects/:id/members', requireLogin, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const hasAccess = await checkProjectAccess(userId, role, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const members = await dbAll('SELECT * FROM project_members WHERE project_id = ?', [projectId]);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const uploadMemberPhoto = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('photo')(req, res, next);
  }
  next();
};

// Add member
app.post('/api/projects/:id/members', requireLogin, requireRole(['Admin', 'Project Submitter']), uploadMemberPhoto, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { employee_id, full_name, nickname, position, division, department } = req.body;
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

  const employee_id_val = employee_id || '';
  const nickname_val = nickname || '';
  const position_val = position || '';
  const division_val = division || '';
  const department_val = department || '';

  if (!full_name) return res.status(400).json({ error: 'Full name is required' });

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun(
      'INSERT INTO project_members (project_id, employee_id, full_name, nickname, position, division, department, photo_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [projectId, employee_id_val, full_name, nickname_val, position_val, division_val, department_val, photo_path]
    );
    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member
app.delete('/api/projects/:id/members/:memberId', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const memberId = req.params.memberId;
  const { id: userId, role } = req.session.user;

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun('DELETE FROM project_members WHERE id = ? AND project_id = ?', [memberId, projectId]);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit member
app.put('/api/projects/:id/members/:memberId', requireLogin, requireRole(['Admin', 'Project Submitter']), uploadMemberPhoto, async (req, res) => {
  const projectId = req.params.id;
  const memberId = req.params.memberId;
  const { id: userId, role } = req.session.user;
  const { employee_id, full_name, nickname, position, division, department } = req.body;
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

  const employee_id_val = employee_id || '';
  const nickname_val = nickname || '';
  const position_val = position || '';
  const division_val = division || '';
  const department_val = department || '';

  if (!full_name) return res.status(400).json({ error: 'Full name is required' });

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    if (photo_path) {
      await dbRun(
        'UPDATE project_members SET employee_id = ?, full_name = ?, nickname = ?, position = ?, division = ?, department = ?, photo_path = ? WHERE id = ? AND project_id = ?',
        [employee_id_val, full_name, nickname_val, position_val, division_val, department_val, photo_path, memberId, projectId]
      );
    } else {
      await dbRun(
        'UPDATE project_members SET employee_id = ?, full_name = ?, nickname = ?, position = ?, division = ?, department = ? WHERE id = ? AND project_id = ?',
        [employee_id_val, full_name, nickname_val, position_val, division_val, department_val, memberId, projectId]
      );
    }
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stakeholders
app.get('/api/projects/:id/stakeholders', requireLogin, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const hasAccess = await checkProjectAccess(userId, role, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const stakeholders = await dbAll('SELECT * FROM project_stakeholders WHERE project_id = ?', [projectId]);
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add stakeholder
app.post('/api/projects/:id/stakeholders', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { employee_id, full_name, position, division, department, type } = req.body;
  const employee_id_val = employee_id || '';
  const position_val = position || '';
  const division_val = division || '';
  const department_val = department || '';

  if (!full_name || !type) return res.status(400).json({ error: 'Full name and type are required' });

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun(
      'INSERT INTO project_stakeholders (project_id, employee_id, full_name, position, division, department, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [projectId, employee_id_val, full_name, position_val, division_val, department_val, type]
    );
    res.status(201).json({ message: 'Stakeholder added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove stakeholder
app.delete('/api/projects/:id/stakeholders/:stakeholderId', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const stakeholderId = req.params.stakeholderId;
  const { id: userId, role } = req.session.user;

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun('DELETE FROM project_stakeholders WHERE id = ? AND project_id = ?', [stakeholderId, projectId]);
    res.json({ message: 'Stakeholder removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit stakeholder
app.put('/api/projects/:id/stakeholders/:stakeholderId', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const stakeholderId = req.params.stakeholderId;
  const { id: userId, role } = req.session.user;
  const { employee_id, full_name, position, division, department, type } = req.body;
  const employee_id_val = employee_id || '';
  const position_val = position || '';
  const division_val = division || '';
  const department_val = department || '';

  if (!full_name || !type) return res.status(400).json({ error: 'Full name and type are required' });

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun(
      'UPDATE project_stakeholders SET employee_id = ?, full_name = ?, position = ?, division = ?, department = ?, type = ? WHERE id = ? AND project_id = ?',
      [employee_id_val, full_name, position_val, division_val, department_val, type, stakeholderId, projectId]
    );
    res.json({ message: 'Stakeholder updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// BUDGET ENDPOINTS
// ----------------------------------------------------

// List Budgets (including roll-up calculation)
app.get('/api/projects/:id/budgets', requireLogin, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const hasAccess = await checkProjectAccess(userId, role, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // Select budget list, calculating remaining_amount inline
    const items = await dbAll(
      `SELECT *, (allocated_amount - spent_amount) as remaining_amount 
       FROM budgets 
       WHERE project_id = ?`,
      [projectId]
    );

    // Sum Rollups
    const rollups = await dbGet(
      `SELECT 
         COALESCE(SUM(allocated_amount), 0) as total_allocated,
         COALESCE(SUM(spent_amount), 0) as total_spent,
         COALESCE(SUM(allocated_amount) - SUM(spent_amount), 0) as total_remaining
       FROM budgets 
       WHERE project_id = ?`,
      [projectId]
    );

    res.json({ items, rollups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add budget item
app.post('/api/projects/:id/budgets', requireLogin, requireRole(['Admin', 'Project Submitter']), upload.fields([{ name: 'invoice' }, { name: 'approval_doc' }]), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { item_name, detail, budget_type, budget_type_other, owner_unit, allocated_amount, spent_amount, payment_type, remarks } = req.body;
  const invoice_file = (req.files && req.files['invoice']) ? '/uploads/' + req.files['invoice'][0].filename : null;
  const approval_document = (req.files && req.files['approval_doc']) ? '/uploads/' + req.files['approval_doc'][0].filename : null;

  if (!item_name || allocated_amount === undefined || spent_amount === undefined) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun(
      `INSERT INTO budgets (project_id, item_name, detail, budget_type, budget_type_other, owner_unit, allocated_amount, spent_amount, approval_document, payment_type, payment_evidence, remarks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, item_name, detail||null, budget_type||'งบลงทุน', budget_type_other||null, owner_unit||null,
       parseFloat(allocated_amount), parseFloat(spent_amount), approval_document, payment_type||'รายครั้ง (ครั้งเดียว)', invoice_file, remarks||null]
    );
    res.status(201).json({ message: 'Budget item added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete budget item
app.delete('/api/projects/:id/budgets/:budgetId', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const budgetId = req.params.budgetId;
  const { id: userId, role } = req.session.user;

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    // Clean up uploaded invoice file if exists
    const budget = await dbGet('SELECT invoice_file FROM budgets WHERE id = ?', [budgetId]);
    if (budget && budget.invoice_file) {
      const filePath = path.join(__dirname, budget.invoice_file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await dbRun('DELETE FROM budgets WHERE id = ? AND project_id = ?', [budgetId, projectId]);
    res.json({ message: 'Budget item removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit budget item
app.put('/api/projects/:id/budgets/:budgetId', requireLogin, requireRole(['Admin', 'Project Submitter']), upload.fields([{ name: 'invoice' }, { name: 'approval_doc' }]), async (req, res) => {
  const projectId = req.params.id;
  const budgetId = req.params.budgetId;
  const { id: userId, role } = req.session.user;
  const { item_name, detail, budget_type, budget_type_other, owner_unit, allocated_amount, spent_amount, payment_type, remarks } = req.body;
  const new_invoice = (req.files && req.files['invoice']) ? '/uploads/' + req.files['invoice'][0].filename : null;
  const new_approval_doc = (req.files && req.files['approval_doc']) ? '/uploads/' + req.files['approval_doc'][0].filename : null;

  if (!item_name || allocated_amount === undefined || spent_amount === undefined) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    const oldBudget = await dbGet('SELECT payment_evidence, approval_document FROM budgets WHERE id = ?', [budgetId]);
    const final_invoice = new_invoice || (oldBudget ? oldBudget.payment_evidence : null);
    const final_approval_doc = new_approval_doc || (oldBudget ? oldBudget.approval_document : null);

    // Clean up replaced files
    if (new_invoice && oldBudget && oldBudget.payment_evidence) {
      const fp = path.join(__dirname, 'public', oldBudget.payment_evidence);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    if (new_approval_doc && oldBudget && oldBudget.approval_document) {
      const fp = path.join(__dirname, 'public', oldBudget.approval_document);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await dbRun(
      `UPDATE budgets SET item_name=?, detail=?, budget_type=?, budget_type_other=?, owner_unit=?,
       allocated_amount=?, spent_amount=?, approval_document=?, payment_type=?, payment_evidence=?, remarks=?
       WHERE id=? AND project_id=?`,
      [item_name, detail||null, budget_type||'งบลงทุน', budget_type_other||null, owner_unit||null,
       parseFloat(allocated_amount), parseFloat(spent_amount), final_approval_doc, payment_type||'รายครั้ง (ครั้งเดียว)', final_invoice, remarks||null,
       budgetId, projectId]
    );
    res.json({ message: 'Budget item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// GANTT TASKS ENDPOINTS
// ----------------------------------------------------

// Get tasks
app.get('/api/projects/:id/gantt', requireLogin, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const hasAccess = await checkProjectAccess(userId, role, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const tasks = await dbAll(`
      SELECT gt.*, pm.full_name as assignee_name 
      FROM gantt_tasks gt 
      LEFT JOIN project_members pm ON gt.assigned_member_id = pm.id 
      WHERE gt.project_id = ? 
      ORDER BY gt.start_date ASC
    `, [projectId]);
    
    // Parse attachments JSON
    tasks.forEach(t => {
      try {
        t.attachments = t.attachments ? JSON.parse(t.attachments) : [];
      } catch (err) {
        t.attachments = [];
      }
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add/update task
app.post('/api/projects/:id/gantt', requireLogin, requireRole(['Admin', 'Project Submitter']), upload.array('attachments'), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { id, main_task, sub_task, start_date, end_date, progress_percent, assigned_member_id } = req.body;

  if (!main_task || !start_date || !end_date) {
    return res.status(400).json({ error: 'Main task, start date, and end date are required' });
  }

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    let files = [];
    if (req.files) {
      files = req.files.map(f => ({ name: f.originalname, url: '/uploads/' + f.filename }));
    }

    const memberId = assigned_member_id ? parseInt(assigned_member_id) : null;

    if (id) {
      // Edit mode. Retrieve previous attachments to merge
      const oldTask = await dbGet('SELECT attachments FROM gantt_tasks WHERE id = ?', [id]);
      let oldFiles = [];
      if (oldTask && oldTask.attachments) {
        try { oldFiles = JSON.parse(oldTask.attachments); } catch(e) {}
      }
      const mergedFiles = [...oldFiles, ...files];

      await dbRun(
        `UPDATE gantt_tasks 
         SET main_task = ?, sub_task = ?, start_date = ?, end_date = ?, progress_percent = ?, attachments = ?, assigned_member_id = ?, last_updated = CURRENT_TIMESTAMP 
         WHERE id = ? AND project_id = ?`,
        [main_task, sub_task, start_date, end_date, parseInt(progress_percent) || 0, JSON.stringify(mergedFiles), memberId, id, projectId]
      );
      res.json({ message: 'Task updated successfully' });
    } else {
      // Create mode
      await dbRun(
        `INSERT INTO gantt_tasks (project_id, main_task, sub_task, start_date, end_date, progress_percent, attachments, assigned_member_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, main_task, sub_task, start_date, end_date, parseInt(progress_percent) || 0, JSON.stringify(files), memberId]
      );
      res.status(201).json({ message: 'Task created successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
app.delete('/api/projects/:id/gantt/:taskId', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const taskId = req.params.taskId;
  const { id: userId, role } = req.session.user;

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    // Clean up task files
    const task = await dbGet('SELECT attachments FROM gantt_tasks WHERE id = ?', [taskId]);
    if (task && task.attachments) {
      try {
        const files = JSON.parse(task.attachments);
        files.forEach(f => {
          const filePath = path.join(__dirname, f.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      } catch (e) {}
    }

    await dbRun('DELETE FROM gantt_tasks WHERE id = ? AND project_id = ?', [taskId, projectId]);
    res.json({ message: 'Task removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// MONTHLY REPORT & COMMENT ENDPOINTS
// ----------------------------------------------------

// List reports
app.get('/api/projects/:id/reports', requireLogin, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const hasAccess = await checkProjectAccess(userId, role, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const reports = await dbAll('SELECT * FROM monthly_reports WHERE project_id = ? ORDER BY report_month_year DESC', [projectId]);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit/Create report
app.post('/api/projects/:id/reports', requireLogin, requireRole(['Admin', 'Project Submitter']), upload.single('report_file'), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { report_month_year, summary, issues_and_solutions, status } = req.body;
  const report_file = req.file ? '/uploads/' + req.file.filename : null;

  if (!report_month_year) return res.status(400).json({ error: 'Month/Year is required' });

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    const submitted_at = status === 'Submitted' ? new Date().toISOString() : null;

    // Check if report already exists (since project_id + month is unique)
    const existing = await dbGet('SELECT id FROM monthly_reports WHERE project_id = ? AND report_month_year = ?', [projectId, report_month_year]);
    
    if (existing) {
      // Update
      let query = `UPDATE monthly_reports SET summary = ?, issues_and_solutions = ?, status = ?`;
      let params = [summary, issues_and_solutions, status];
      if (report_file) {
        query += `, report_file = ?`;
        params.push(report_file);
      }
      if (submitted_at) {
        query += `, submitted_at = ?`;
        params.push(submitted_at);
      }
      query += ` WHERE id = ?`;
      params.push(existing.id);

      await dbRun(query, params);
      res.json({ message: 'Monthly report updated successfully' });
    } else {
      // Insert
      await dbRun(
        `INSERT INTO monthly_reports (project_id, report_month_year, summary, issues_and_solutions, report_file, submitted_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectId, report_month_year, summary, issues_and_solutions, report_file, submitted_at, status || 'Draft']
      );
      res.status(201).json({ message: 'Monthly report created successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific report details (including rollups, comments, and project details)
app.get('/api/reports/:reportId', requireLogin, async (req, res) => {
  const reportId = req.params.reportId;
  const { id: userId, role } = req.session.user;
  try {
    const report = await dbGet('SELECT * FROM monthly_reports WHERE id = ?', [reportId]);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const hasAccess = await checkProjectAccess(userId, role, report.project_id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const project = await dbGet(`
      SELECT 
        p.*, 
        (SELECT COALESCE(AVG(progress_percent), 0) FROM gantt_tasks WHERE project_id = p.id) as overall_progress
      FROM projects p 
      WHERE p.id = ?
    `, [report.project_id]);

    const budgets = await dbGet(
      `SELECT 
         COALESCE(SUM(allocated_amount), 0) as total_allocated,
         COALESCE(SUM(spent_amount), 0) as total_spent,
         COALESCE(SUM(allocated_amount) - SUM(spent_amount), 0) as total_remaining
       FROM budgets 
       WHERE project_id = ?`,
      [report.project_id]
    );

    const budgetItems = await dbAll(
      `SELECT *, (allocated_amount - spent_amount) as remaining_amount 
       FROM budgets 
       WHERE project_id = ?`,
      [report.project_id]
    );

    const comments = await dbAll('SELECT * FROM report_comments WHERE report_id = ? ORDER BY created_at ASC', [reportId]);

    res.json({ report, project, budgets, budgetItems, comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve / Change report status (Admin & Executive)
app.put('/api/reports/:reportId/status', requireLogin, requireRole(['Admin', 'Executive']), async (req, res) => {
  const reportId = req.params.reportId;
  const { status } = req.body;

  if (!status || !['Draft', 'Submitted', 'Approved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await dbRun('UPDATE monthly_reports SET status = ? WHERE id = ?', [status, reportId]);
    res.json({ message: `Report status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment (Executive & Admin, or Staff if they are assigned to the project to discuss feedback)
app.post('/api/reports/:reportId/comments', requireLogin, async (req, res) => {
  const reportId = req.params.reportId;
  const { comment_text } = req.body;
  const { username, role, id: userId } = req.session.user;

  if (!comment_text) return res.status(400).json({ error: 'Comment text is required' });

  try {
    const report = await dbGet('SELECT project_id FROM monthly_reports WHERE id = ?', [reportId]);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const hasAccess = await checkProjectAccess(userId, role, report.project_id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    await dbRun(
      'INSERT INTO report_comments (report_id, commenter_name, role, comment_text) VALUES (?, ?, ?, ?)',
      [reportId, username, role, comment_text]
    );
    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ADMIN PANEL ENDPOINTS
// ----------------------------------------------------

// List all users
app.get('/api/admin/users', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, email, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending approval users
app.get('/api/admin/pending-users', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, email, role, employee_id, division, department, line_id, phone_number, created_at FROM users WHERE is_approved = 0');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve user
app.put('/api/admin/users/:userId/approve', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  try {
    await dbRun('UPDATE users SET is_approved = 1 WHERE id = ?', [userId]);
    res.json({ message: 'อนุมัติสิทธิ์เข้าใช้งานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user / reject user
app.delete('/api/admin/users/:userId', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  try {
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'ปฏิเสธสิทธิ์และลบผู้ใช้งานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
app.put('/api/admin/users/:userId/role', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  const { role } = req.body;
  if (!role || !['Admin', 'Executive', 'Project Submitter'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Reset Password
app.put('/api/admin/users/:userId/reset-password', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user allowed views (Admin only)
app.put('/api/admin/users/:userId/views', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  const { allowed_views } = req.body;
  if (allowed_views === undefined) {
    return res.status(400).json({ error: 'allowed_views is required' });
  }
  try {
    await dbRun('UPDATE users SET allowed_views = ? WHERE id = ?', [allowed_views, userId]);
    res.json({ message: 'สิทธิ์การเข้าถึงเมนูใช้งานได้รับการอัปเดตแล้ว' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get configurations
app.get('/api/admin/settings', requireLogin, async (req, res) => {
  try {
    const deadline = await dbGet("SELECT value FROM settings WHERE key = 'report_deadline_day'");
    res.json({ report_deadline_day: deadline ? deadline.value : '5' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save configurations (Admin only)
app.post('/api/admin/settings', requireLogin, requireRole(['Admin']), async (req, res) => {
  const { report_deadline_day } = req.body;
  if (!report_deadline_day || parseInt(report_deadline_day) < 1 || parseInt(report_deadline_day) > 31) {
    return res.status(400).json({ error: 'Deadline must be a day between 1 and 31' });
  }
  try {
    await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('report_deadline_day', ?)", [report_deadline_day]);
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign project to staff user (Admin only)
app.post('/api/admin/assignments', requireLogin, requireRole(['Admin']), async (req, res) => {
  const { project_id, user_id } = req.body;
  if (!project_id || !user_id) {
    return res.status(400).json({ error: 'ต้องการข้อมูลโครงการและชื่อเจ้าหน้าที่' });
  }
  try {
    const user = await dbGet("SELECT id FROM users WHERE id = ? AND role = 'Project Submitter'", [user_id]);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้บทบาท Staff (Project Submitter) คนนี้' });
    }
    await dbRun('INSERT OR IGNORE INTO project_assignments (project_id, user_id) VALUES (?, ?)', [project_id, user.id]);
    res.json({ message: 'Project assigned to staff successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List project assignments
app.get('/api/admin/assignments', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const assignments = await dbAll(`
      SELECT pa.id, pa.project_id, p.project_name, u.username, u.email 
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      JOIN users u ON pa.user_id = u.id
    `);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project assignment
app.delete('/api/admin/assignments/:id', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    await dbRun('DELETE FROM project_assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// NOTIFICATION ENDPOINTS
// ----------------------------------------------------

// List notifications
app.get('/api/notifications', requireLogin, async (req, res) => {
  try {
    const notifications = await dbAll(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
app.post('/api/notifications/read', requireLogin, async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.user.id]);
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// AUTOMATION & DEADLINE ALERTS TRIGGER
// ----------------------------------------------------

async function runDeadlineCheck() {
  try {
    console.log('[DEADLINE CHECKER] Running deadline scanner...');
    
    // Get deadline setting
    const deadlineSetting = await dbGet("SELECT value FROM settings WHERE key = 'report_deadline_day'");
    const deadlineDay = parseInt(deadlineSetting ? deadlineSetting.value : '5');
    
    const now = new Date();
    const currentDay = now.getDate();
    
    // The previous month cycle that must have reports submitted
    // E.g., if today is June 10, the cycle is May (2026-05)
    let cycleYear = now.getFullYear();
    let cycleMonth = now.getMonth(); // 0-indexed, so 5 means June. We subtract 1 for previous month.
    
    if (cycleMonth === 0) {
      cycleMonth = 12;
      cycleYear -= 1;
    }
    
    const reportMonthYear = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`;
    console.log(`[DEADLINE CHECKER] Current Date: Day ${currentDay}. Deadline Day: ${deadlineDay}. Checking report cycle: ${reportMonthYear}`);
    
    // Scan all active projects (excluding completed ones)
    const activeProjects = await dbAll("SELECT id, project_name FROM projects WHERE status != 'Completed'");
    
    let alertCount = 0;
    for (const project of activeProjects) {
      // Check if a report for this project and cycle has been submitted/approved
      const report = await dbGet(
        `SELECT id FROM monthly_reports 
         WHERE project_id = ? AND report_month_year = ? AND status IN ('Submitted', 'Approved')`,
        [project.id, reportMonthYear]
      );
      
      if (!report) {
        // Report is missing/not submitted! Send notification to assigned staff
        const staff = await dbAll(
          `SELECT u.id, u.username, u.email 
           FROM project_assignments pa
           JOIN users u ON pa.user_id = u.id
           WHERE pa.project_id = ? AND u.role = 'Project Submitter'`,
          [project.id]
        );
        
        for (const user of staff) {
          const msg = `ระบบแจ้งเตือน: โครงการ "${project.project_name}" ยังไม่ได้จัดทำและส่งรายงานประจำเดือนสำหรับรอบการทำงาน ${reportMonthYear} (กำหนดส่งภายในวันที่ ${deadlineDay} ของเดือนนี้) กรุณาดำเนินการจัดส่งผ่านระบบโดยด่วน`;
          
          // In-App Notification
          await dbRun('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [user.id, msg]);
          
          // Simulated Email Trigger
          console.log(`\n=================== [SIMULATED EMAIL SENT] ===================`);
          console.log(`To: ${user.email} (${user.username})`);
          console.log(`Subject: [TOAT Sandbox] แจ้งเตือนด่วน: กรุณาส่งรายงานประจำเดือนรอบ ${reportMonthYear}`);
          console.log(`Body:\nเรียนคุณ ${user.username},\n\nโครงการ "${project.project_name}" ที่อยู่ในความดูแลของคุณยังไม่ได้รับการยื่นส่งรายงานสำหรับรอบการทำงานประจำเดือน ${reportMonthYear} ซึ่งผ่านกำหนดเวลาส่ง (วันที่ ${deadlineDay} ของเดือนนี้) เรียบร้อยแล้ว\n\nกรุณาเข้าสู่ระบบ TOAT Sandbox เพื่อทำการสรุปข้อมูลโครงการและกดส่งรายงานโดยด่วนที่สุด\n\nขอแสดงความนับถือ,\nฝ่ายบริหารโครงการ TOAT Sandbox`);
          console.log(`============================================================\n`);
          
          alertCount++;
        }
      }
    }
    console.log(`[DEADLINE CHECKER] Scanning complete. Triggered ${alertCount} alert notification(s).`);
    return alertCount;
  } catch (error) {
    console.error('Error in running deadline check:', error);
    throw error;
  }
}

// REST API to manually trigger deadline check (for Admin and Testing)
app.post('/api/admin/trigger-deadline-check', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const alertsTriggered = await runDeadlineCheck();
    res.json({ message: 'สแกนตรวจสอบเสร็จสิ้น', alertsTriggered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Background Cron-like Scheduler (runs every 12 hours)
setInterval(runDeadlineCheck, 12 * 60 * 60 * 1000);

// Run a deadline check on server start (after 10 seconds to allow DB initialization to settle)
setTimeout(() => {
  runDeadlineCheck().catch(err => console.error('Initial startup deadline check failed:', err));
}, 10000);

// Default wildcard route to serve Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
