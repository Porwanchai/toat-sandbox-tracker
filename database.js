const { createClient } = require('@libsql/client');
const path = require('path');
const bcrypt = require('bcryptjs');

// Support process.env.TURSO_DATABASE_URL or fallback to local sqlite file
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.resolve(__dirname, 'db.sqlite3')}`;
const dbToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbToken
});

console.log('Connected to the Database (Turso/libSQL).');

// Helper functions wrapping libsql client for clean async/await code
const dbRun = async (sql, params = []) => {
  const result = await client.execute({ sql, args: params });
  return {
    lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
    changes: result.rowsAffected
  };
};

const dbGet = async (sql, params = []) => {
  const result = await client.execute({ sql, args: params });
  return result.rows[0];
};

const dbAll = async (sql, params = []) => {
  const result = await client.execute({ sql, args: params });
  return result.rows;
};

// Initialize Tables
async function initDatabase() {
  try {
    // 1. Users Table
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('Admin', 'Executive', 'Project Submitter')) NOT NULL,
      employee_id TEXT,
      division TEXT,
      department TEXT,
      line_id TEXT,
      phone_number TEXT,
      is_approved INTEGER DEFAULT 0,
      allowed_views TEXT DEFAULT 'dashboard,projects-list',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Projects Table
    await dbRun(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      description TEXT,
      status TEXT CHECK(status IN ('Not Started', 'In Progress', 'Delayed', 'Completed')) NOT NULL DEFAULT 'Not Started',
      project_group TEXT DEFAULT 'โครงการ TOAT Sandbox',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Project Members Table
    await dbRun(`CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      employee_id TEXT,
      full_name TEXT NOT NULL,
      nickname TEXT,
      position TEXT,
      division TEXT,
      department TEXT,
      photo_path TEXT,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`);

    // 4. Project Stakeholders Table
    await dbRun(`CREATE TABLE IF NOT EXISTS project_stakeholders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      employee_id TEXT,
      full_name TEXT NOT NULL,
      position TEXT,
      division TEXT,
      department TEXT,
      type TEXT CHECK(type IN ('Sponsor', 'Advisor')) NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`);

    // 5. Budgets Table
    await dbRun(`CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      allocated_amount REAL NOT NULL,
      spent_amount REAL NOT NULL,
      invoice_file TEXT,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`);

    // 6. Gantt Tasks Table
    await dbRun(`CREATE TABLE IF NOT EXISTS gantt_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      main_task TEXT NOT NULL,
      sub_task TEXT,
      start_date TEXT NOT NULL, -- YYYY-MM-DD
      end_date TEXT NOT NULL,   -- YYYY-MM-DD
      progress_percent INTEGER CHECK(progress_percent BETWEEN 0 AND 100) DEFAULT 0,
      attachments TEXT, -- Store list of file details in JSON
      assigned_member_id INTEGER,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_member_id) REFERENCES project_members (id) ON DELETE SET NULL
    )`);

    // 7. Monthly Reports Table
    await dbRun(`CREATE TABLE IF NOT EXISTS monthly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      report_month_year TEXT NOT NULL, -- YYYY-MM
      summary TEXT,
      issues_and_solutions TEXT,
      report_file TEXT,
      submitted_at DATETIME,
      status TEXT CHECK(status IN ('Draft', 'Submitted', 'Approved')) NOT NULL DEFAULT 'Draft',
      UNIQUE(project_id, report_month_year),
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`);

    // 8. Report Comments Table
    await dbRun(`CREATE TABLE IF NOT EXISTS report_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      commenter_name TEXT NOT NULL,
      role TEXT NOT NULL,
      comment_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES monthly_reports (id) ON DELETE CASCADE
    )`);

    // 9. Project Assignments Table (to restrict Staff access to assigned projects)
    await dbRun(`CREATE TABLE IF NOT EXISTS project_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 10. Settings Table
    await dbRun(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // 11. Notifications Table
    await dbRun(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0, -- 0 = Unread, 1 = Read
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 12. Run Migrations for Round 3 (Project Members & Stakeholders columns)
    const pmColumns = await dbAll("PRAGMA table_info(project_members)");
    if (!pmColumns.some(c => c.name === 'employee_id')) {
      await dbRun("ALTER TABLE project_members ADD COLUMN employee_id TEXT");
    }
    if (!pmColumns.some(c => c.name === 'division')) {
      await dbRun("ALTER TABLE project_members ADD COLUMN division TEXT");
    }

    const psColumns = await dbAll("PRAGMA table_info(project_stakeholders)");
    if (!psColumns.some(c => c.name === 'employee_id')) {
      await dbRun("ALTER TABLE project_stakeholders ADD COLUMN employee_id TEXT");
    }
    if (!psColumns.some(c => c.name === 'division')) {
      await dbRun("ALTER TABLE project_stakeholders ADD COLUMN division TEXT");
    }
    if (!psColumns.some(c => c.name === 'department')) {
      await dbRun("ALTER TABLE project_stakeholders ADD COLUMN department TEXT");
    }

    // 13. Run Migrations for Round 4 (project_group and photo_path columns)
    const projectsColumns = await dbAll("PRAGMA table_info(projects)");
    if (!projectsColumns.some(c => c.name === 'project_group')) {
      await dbRun("ALTER TABLE projects ADD COLUMN project_group TEXT DEFAULT 'โครงการ TOAT Sandbox'");
    }

    if (!pmColumns.some(c => c.name === 'photo_path')) {
      await dbRun("ALTER TABLE project_members ADD COLUMN photo_path TEXT");
    }

    // 14. Run Migrations for Round 7 (Extended Budget Fields)
    const budgetColumns = await dbAll("PRAGMA table_info(budgets)");
    if (!budgetColumns.some(c => c.name === 'detail')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN detail TEXT");
    }
    if (!budgetColumns.some(c => c.name === 'budget_type')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN budget_type TEXT DEFAULT 'งบลงทุน'");
    }
    if (!budgetColumns.some(c => c.name === 'budget_type_other')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN budget_type_other TEXT");
    }
    if (!budgetColumns.some(c => c.name === 'owner_unit')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN owner_unit TEXT");
    }
    if (!budgetColumns.some(c => c.name === 'approval_document')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN approval_document TEXT");
    }
    if (!budgetColumns.some(c => c.name === 'payment_type')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN payment_type TEXT DEFAULT 'โอนเงิน'");
    }
    if (!budgetColumns.some(c => c.name === 'payment_evidence')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN payment_evidence TEXT");
    }
    if (!budgetColumns.some(c => c.name === 'remarks')) {
      await dbRun("ALTER TABLE budgets ADD COLUMN remarks TEXT");
    }

    console.log('All database tables initialized.');
    await seedData();

  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Seed Initial Data
async function seedData() {
  try {
    // 1. Seed Users
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('Seeding default users...');
      const salt = bcrypt.genSaltSync(10);
      const adminHash = bcrypt.hashSync('admin123', salt);
      const execHash = bcrypt.hashSync('executive123', salt);
      const staffHash = bcrypt.hashSync('staff123', salt);

      await dbRun('INSERT INTO users (username, email, password_hash, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)', [
        'admin', 'admin@toat.sandbox', adminHash, 'Admin', 'EMP001', 'บริหาร', 'ศูนย์พัฒนาเทคโนโลยี', 'admin.line', '0812345678', 'dashboard,projects-list,admin-panel'
      ]);
      await dbRun('INSERT INTO users (username, email, password_hash, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)', [
        'executive', 'executive@toat.sandbox', execHash, 'Executive', 'EMP002', 'บริหารจัดการ', 'ฝ่ายยุทธศาสตร์', 'exec.line', '0823456789', 'dashboard,projects-list'
      ]);
      await dbRun('INSERT INTO users (username, email, password_hash, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)', [
        'staff', 'staff@toat.sandbox', staffHash, 'Project Submitter', 'EMP003', 'วิศวกรรมพลังงาน', 'ส่วนพัฒนาทดสอบ', 'staff.line', '0834567890', 'dashboard,projects-list'
      ]);
      console.log('Default users seeded.');
    }

    // 2. Seed Settings
    const settingCount = await dbGet('SELECT COUNT(*) as count FROM settings WHERE key = ?', ['report_deadline_day']);
    if (settingCount.count === 0) {
      await dbRun('INSERT INTO settings (key, value) VALUES (?, ?)', ['report_deadline_day', '5']);
      console.log('Default deadline setting seeded (5th day of the next month).');
    }

    // 3. Seed Sample Project
    const projectCount = await dbGet('SELECT COUNT(*) as count FROM projects');
    if (projectCount.count === 0) {
      console.log('Seeding sample project...');
      
      // Insert Project
      const projectResult = await dbRun(
        'INSERT INTO projects (project_name, description, status) VALUES (?, ?, ?)',
        [
          'ระบบอนุรักษ์พลังงาน TOAT Solar Sandbox',
          'โครงการทดสอบและติดตั้งแผงโซลาร์เซลล์อัจฉริยะสำหรับอาคารสำนักงานใหญ่ เพื่อส่งเสริมการใช้พลังงานสะอาดและลดต้นทุนทางไฟฟ้าในระยะยาว',
          'In Progress'
        ]
      );
      const projectId = projectResult.lastID;

      // Assign to Staff (user_id = 3)
      await dbRun('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projectId, 3]);

      // Insert Members
      await dbRun('INSERT INTO project_members (project_id, full_name, nickname, position, department) VALUES (?, ?, ?, ?, ?)', [
        projectId, 'สมชาย รักดี', 'ชาย', 'Project Lead', 'Engineering'
      ]);
      await dbRun('INSERT INTO project_members (project_id, full_name, nickname, position, department) VALUES (?, ?, ?, ?, ?)', [
        projectId, 'สมศรี มีสุข', 'ศรี', 'System Analyst', 'IT'
      ]);

      // Insert Stakeholders
      await dbRun('INSERT INTO project_stakeholders (project_id, full_name, position, type) VALUES (?, ?, ?, ?)', [
        projectId, 'ดร. ประเสริฐ ยอดเยี่ยม', 'Chief Executive Officer', 'Sponsor'
      ]);
      await dbRun('INSERT INTO project_stakeholders (project_id, full_name, position, type) VALUES (?, ?, ?, ?)', [
        projectId, 'รศ. ดร. วิชัย เรียนรู้', 'Technical Advisor', 'Advisor'
      ]);

      // Insert Budgets
      await dbRun('INSERT INTO budgets (project_id, item_name, allocated_amount, spent_amount) VALUES (?, ?, ?, ?)', [
        projectId, 'แผงโซลาร์เซลล์ Monocrystalline 450W', 150000.0, 120000.0
      ]);
      await dbRun('INSERT INTO budgets (project_id, item_name, allocated_amount, spent_amount) VALUES (?, ?, ?, ?)', [
        projectId, 'อินเวอร์เตอร์ Hybrid 10kW', 80000.0, 75000.0
      ]);
      await dbRun('INSERT INTO budgets (project_id, item_name, allocated_amount, spent_amount) VALUES (?, ?, ?, ?)', [
        projectId, 'ค่าแรงติดตั้งและเดินสายไฟ', 50000.0, 0.0
      ]);

      // Insert Gantt Tasks
      await dbRun('INSERT INTO gantt_tasks (project_id, main_task, sub_task, start_date, end_date, progress_percent) VALUES (?, ?, ?, ?, ?, ?)', [
        projectId, 'สำรวจพื้นที่และออกแบบระบบ', 'สำรวจโครงสร้างหลังคาและมุมแสงตกกระทบ', '2026-06-01', '2026-06-07', 100
      ]);
      await dbRun('INSERT INTO gantt_tasks (project_id, main_task, sub_task, start_date, end_date, progress_percent) VALUES (?, ?, ?, ?, ?, ?)', [
        projectId, 'จัดซื้ออุปกรณ์', 'สั่งซื้อแผงโซลาร์เซลล์และอินเวอร์เตอร์', '2026-06-08', '2026-06-15', 80
      ]);
      await dbRun('INSERT INTO gantt_tasks (project_id, main_task, sub_task, start_date, end_date, progress_percent) VALUES (?, ?, ?, ?, ?, ?)', [
        projectId, 'ติดตั้งระบบ', 'ยึดโครงขาแผงและติดตั้งแผงโซลาร์เซลล์', '2026-06-16', '2026-06-25', 0
      ]);

      // Insert Monthly Report
      const reportResult = await dbRun(
        'INSERT INTO monthly_reports (project_id, report_month_year, summary, issues_and_solutions, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          projectId,
          '2026-05',
          'ขั้นตอนสำรวจและออกแบบเสร็จสมบูรณ์เรียบร้อยแล้ว อยู่ระหว่างขั้นตอนการจัดซื้อและขนส่งอุปกรณ์หลัก ทีมงานพร้อมติดตั้งเมื่อของส่งถึงหน้างาน',
          'พบปัญหาขนส่งแผงโซลาร์เซลล์ล่าช้ากว่ากำหนดเดิมเล็กน้อยเนื่องจากติดพายุฝน ได้ประสานงานขอขนส่งด่วนเป็นกรณีพิเศษเรียบร้อย คาดว่ากระทบแผนรวมไม่เกิน 2 วัน',
          '2026-06-09 10:00:00',
          'Submitted'
        ]
      );
      const reportId = reportResult.lastID;

      // Insert Comment
      await dbRun('INSERT INTO report_comments (report_id, commenter_name, role, comment_text) VALUES (?, ?, ?, ?)', [
        reportId, 'executive', 'Executive', 'การบริหารจัดการขั้นตอนและแผนรองรับความเสี่ยงดีมากครับ ขอรบกวนช่วยควบคุมงบประมาณในระยะถัดไปให้เป็นไปตามแผนด้วยครับ'
      ]);

      console.log('Sample project seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

module.exports = {
  db: client,
  dbRun,
  dbGet,
  dbAll,
  initDatabase
};
