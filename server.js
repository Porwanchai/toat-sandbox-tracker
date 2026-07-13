const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dbModule = require('./database');

const { dbRun, dbGet, dbAll, initDatabase } = dbModule;

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Helper: Convert uploaded file to Base64 and clean up from disk
function fileToBase64(file) {
  if (!file) return null;
  try {
    const data = fs.readFileSync(file.path);
    const base64 = data.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    // Clean up file from disk
    fs.unlinkSync(file.path);
    return dataUrl;
  } catch (err) {
    console.error('Failed to convert file to base64:', err);
    return null;
  }
}

// Nodemailer Transporter Configuration (for Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Helper: Send email
async function sendEmailNotification(to, subject, text, html) {
  // Option 1: Brevo HTTP API (Recommended for Cloud Hosting like Render)
  if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'TOAT Sandbox Tracker',
            email: process.env.BREVO_SENDER_EMAIL
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html || text.replace(/\n/g, '<br>')
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || JSON.stringify(responseData));
      }
      console.log(`Email sent successfully via Brevo HTTP API: ${responseData.messageId}`);
      return { success: true, messageId: responseData.messageId };
    } catch (error) {
      console.error('Failed to send email via Brevo:', error);
      throw error;
    }
  }

  // Option 2: Standard SMTP (for local development or paid tier)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n=================== [SIMULATED EMAIL SENT] ===================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log(`===============================================================\n`);
    return { success: true, messageId: 'simulated-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"TOAT Sandbox Tracker" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    });
    console.log(`Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Helper: Get all Admin emails (or fallback to SMTP_USER if sandbox)
async function getAdminEmails() {
  try {
    const admins = await dbAll("SELECT email FROM users WHERE role = 'Admin'");
    const adminEmails = [];
    for (const admin of admins) {
      if (admin.email) {
        if (admin.email.endsWith('@toat.sandbox')) {
          if (process.env.SMTP_USER && !adminEmails.includes(process.env.SMTP_USER)) {
            adminEmails.push(process.env.SMTP_USER);
          }
        } else {
          if (!adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
          }
        }
      }
    }
    if (adminEmails.length === 0 && process.env.SMTP_USER) {
      adminEmails.push(process.env.SMTP_USER);
    }
    return adminEmails;
  } catch (error) {
    console.error('Error in getAdminEmails:', error);
    return process.env.SMTP_USER ? [process.env.SMTP_USER] : [];
  }
}

// Helper: Notify Admin and Staff about new report submission
async function notifyReportSubmission(projectId, reportMonthYear, reporterName) {
  try {
    const project = await dbGet('SELECT project_name FROM projects WHERE id = ?', [projectId]);
    if (!project) return;

    // Get all Admin Emails
    const adminEmails = await getAdminEmails();

    // Send email to all Admins
    for (const adminEmail of adminEmails) {
      const subject = `[TOAT Sandbox] มีการส่งรายงานความคืบหน้าโครงการ: ${project.project_name}`;
      const text = `เรียน ผู้ดูแลระบบ,\n\nโครงการ "${project.project_name}" ได้ทำการบันทึกและยื่นส่งรายงานความคืบหน้าประจำรอบเดือน ${reportMonthYear} เรียบร้อยแล้ว\n\n- ผู้รายงาน: ${reporterName}\n- สถานะ: ยื่นส่งแล้ว (Submitted)\n\nกรุณาเข้าสู่ระบบ TOAT Sandbox เพื่อทำการตรวจสอบและพิจารณาอนุมัติรายงานดังกล่าว.\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
      sendEmailNotification(adminEmail, subject, text).catch(err => console.error(`Failed to notify admin ${adminEmail} on report submission:`, err));
    }

    // Query all staff assigned to the project
    const assignedUsers = await dbAll(`
      SELECT u.email, u.username FROM users u
      JOIN project_assignments pa ON u.id = pa.user_id
      WHERE pa.project_id = ?
    `, [projectId]);

    for (const user of assignedUsers) {
      if (user.email && !user.email.endsWith('@toat.sandbox')) {
        const subject = `[TOAT Sandbox] ยืนยันการส่งรายงานโครงการ: ${project.project_name}`;
        const text = `เรียน คุณ ${user.username} (ทีมงานผู้ดูแลโครงการ),\n\nระบบได้รับข้อมูลการบันทึกและยื่นส่งรายงานความคืบหน้าประจำรอบเดือน ${reportMonthYear} ของโครงการ "${project.project_name}" เรียบร้อยแล้ว\n\n- ผู้รายงาน: ${reporterName}\n- สถานะ: ยื่นส่งแล้ว (Submitted)\n\nคุณสามารถเข้าสู่ระบบเพื่อติดตามสถานะการอนุมัติและการให้คำแนะนำของผู้บริหาร/ผู้ดูแลระบบได้ตลอดเวลา.\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
        sendEmailNotification(user.email, subject, text).catch(err => console.error(`Failed to notify user ${user.username} on report submission:`, err));
      }
    }

    // Query all custom report notification emails
    const customEmails = await dbAll("SELECT email FROM report_notification_emails");
    for (const item of customEmails) {
      if (item.email) {
        const subject = `[TOAT Sandbox] แจ้งเตือน: มีการส่งรายงานความคืบหน้าโครงการ: ${project.project_name}`;
        const text = `เรียน ผู้เกี่ยวข้อง,\n\nโครงการ "${project.project_name}" ได้ทำการบันทึกและยื่นส่งรายงานความคืบหน้าประจำรอบเดือน ${reportMonthYear} เรียบร้อยแล้ว\n\n- ผู้รายงาน: ${reporterName}\n- สถานะ: ยื่นส่งแล้ว (Submitted)\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
        sendEmailNotification(item.email, subject, text).catch(err => console.error(`Failed to notify custom email ${item.email} on report submission:`, err));
      }
    }
  } catch (error) {
    console.error('Error in notifyReportSubmission:', error);
  }
}

// Helper: Notify Staff about report status updates
async function notifyReportStatusUpdate(reportId, status) {
  try {
    const report = await dbGet('SELECT project_id, report_month_year FROM monthly_reports WHERE id = ?', [reportId]);
    if (!report) return;

    const project = await dbGet('SELECT project_name FROM projects WHERE id = ?', [report.project_id]);
    if (!project) return;

    const statusMap = { 
      'Approved': 'อนุมัติแล้ว (Approved)', 
      'Submitted': 'ยื่นส่งแล้ว (Submitted)', 
      'Draft': 'ส่งกลับมาแก้ไข (Draft/Needs Revision)' 
    };
    const statusText = statusMap[status] || status;

    const assignedUsers = await dbAll(`
      SELECT u.email, u.username FROM users u
      JOIN project_assignments pa ON u.id = pa.user_id
      WHERE pa.project_id = ?
    `, [report.project_id]);

    for (const user of assignedUsers) {
      if (user.email && !user.email.endsWith('@toat.sandbox')) {
        const subject = `[TOAT Sandbox] อัปเดตสถานะรายงานโครงการ: ${project.project_name}`;
        const text = `เรียน คุณ ${user.username} (ทีมงานผู้ดูแลโครงการ),\n\nรายงานความคืบหน้าประจำรอบเดือน ${report.report_month_year} ของโครงการ "${project.project_name}" ได้รับการปรับปรุงสถานะโดยผู้ดูแลระบบ/ผู้บริหารเรียบร้อยแล้ว:\n\n- สถานะใหม่: ${statusText}\n\nกรุณาเข้าสู่ระบบ TOAT Sandbox เพื่อตรวจสอบรายละเอียดหรือข้อเสนอแนะความเห็นเพิ่มเติม.\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
        sendEmailNotification(user.email, subject, text).catch(err => console.error(`Failed to notify user ${user.username} on status update:`, err));
      }
    }

    // Query all custom report notification emails
    const customEmails = await dbAll("SELECT email FROM report_notification_emails");
    for (const item of customEmails) {
      if (item.email) {
        const subject = `[TOAT Sandbox] แจ้งเตือน: อัปเดตสถานะรายงานโครงการ: ${project.project_name}`;
        const text = `เรียน ผู้เกี่ยวข้อง,\n\nรายงานความคืบหน้าประจำรอบเดือน ${report.report_month_year} ของโครงการ "${project.project_name}" ได้รับการปรับปรุงสถานะโดยผู้ดูแลระบบ/ผู้บริหารเรียบร้อยแล้ว:\n\n- สถานะใหม่: ${statusText}\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
        sendEmailNotification(item.email, subject, text).catch(err => console.error(`Failed to notify custom email ${item.email} on status update:`, err));
      }
    }
  } catch (error) {
    console.error('Error in notifyReportStatusUpdate:', error);
  }
}

// Helper: Notify Admin or Staff about comments added
async function notifyCommentAdded(reportId, commenterName, commenterRole, commentText) {
  try {
    const report = await dbGet('SELECT project_id, report_month_year FROM monthly_reports WHERE id = ?', [reportId]);
    if (!report) return;

    const project = await dbGet('SELECT project_name FROM projects WHERE id = ?', [report.project_id]);
    if (!project) return;

    if (commenterRole === 'Admin' || commenterRole === 'Executive') {
      // Notify staff
      const assignedUsers = await dbAll(`
        SELECT u.email, u.username FROM users u
        JOIN project_assignments pa ON u.id = pa.user_id
        WHERE pa.project_id = ?
      `, [report.project_id]);

      for (const user of assignedUsers) {
        if (user.email && !user.email.endsWith('@toat.sandbox')) {
          const subject = `[TOAT Sandbox] ข้อเสนอแนะใหม่ในรายงานโครงการ: ${project.project_name}`;
          const text = `เรียน คุณ ${user.username} (ทีมงานผู้ดูแลโครงการ),\n\nคุณ ${commenterName} (${commenterRole}) ได้เพิ่มข้อเสนอแนะ/ความคิดเห็นใหม่ในรายงานประจำเดือน ${report.report_month_year} ของโครงการ "${project.project_name}":\n\n"${commentText}"\n\nกรุณาเข้าสู่ระบบ TOAT Sandbox เพื่อตรวจสอบรายละเอียดหรือตอบกลับข้อเสนอแนะ.\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
          sendEmailNotification(user.email, subject, text).catch(err => console.error(`Failed to notify user ${user.username} on new comment:`, err));
        }
      }
    } else {
      // Notify all Admins
      const adminEmails = await getAdminEmails();

      for (const adminEmail of adminEmails) {
        const subject = `[TOAT Sandbox] มีการตอบกลับข้อเสนอแนะในรายงานโครงการ: ${project.project_name}`;
        const text = `เรียน ผู้ดูแลระบบ,\n\nคุณ ${commenterName} ได้เพิ่มความคิดเห็น/ตอบกลับในรายงานประจำเดือน ${report.report_month_year} ของโครงการ "${project.project_name}":\n\n"${commentText}"\n\nกรุณาเข้าสู่ระบบ TOAT Sandbox เพื่อตรวจสอบความคิดเห็นดังกล่าว.\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
        sendEmailNotification(adminEmail, subject, text).catch(err => console.error(`Failed to notify admin ${adminEmail} on new comment:`, err));
      }
    }
  } catch (error) {
    console.error('Error in notifyCommentAdded:', error);
  }
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
  rolling: true, // Reset cookie maxAge on every response
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours default (will be overridden on login)
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

// Debug Database Connection Status
app.get('/api/debug/db-status', (req, res) => {
  res.json({
    isUsingTurso: dbModule.isUsingTurso,
    dbUrl: dbModule.dbUrl,
    hasUrlEnv: !!process.env.TURSO_DATABASE_URL,
    hasTokenEnv: !!process.env.TURSO_AUTH_TOKEN
  });
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

    // Dynamically set cookie maxAge based on role
    if (user.role === 'Admin') {
      req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year (unlimited)
    } else {
      req.session.cookie.maxAge = 10 * 60 * 1000; // 10 minutes
    }

    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register (Default role: Project Submitter / Staff)
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, employee_id, division, department, line_id, phone_number, user_type, registered_project } = req.body;
  if (!username || !email || !password || !employee_id || !division || !department || !line_id || !phone_number || !user_type) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }
  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' });
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    let role = 'Project Submitter';
    let regProj = null;
    let allowedViews = 'dashboard,projects-list';

    if (user_type === 'Executive') {
      role = 'Executive';
    } else if (user_type === 'ProjectStaff') {
      role = 'Project Submitter';
      regProj = registered_project || null;
    } else {
      role = 'Project Submitter';
    }

    await dbRun('INSERT INTO users (username, email, password_hash, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views, registered_project) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)', [
      username, email, hash, role, employee_id, division, department, line_id, phone_number, allowedViews, regProj
    ]);

    // Send email to all Admins
    try {
      const adminEmails = await getAdminEmails();
      const subject = `[TOAT Sandbox] มีผู้ลงทะเบียนใหม่รอการอนุมัติ: ${username}`;
      const userTypeLabel = user_type === 'Executive' ? 'ผู้บริหาร' : (user_type === 'SandboxStaff' ? 'เจ้าหน้าที่ sandbox' : 'เจ้าหน้าที่โครงการ');
      const projLabel = regProj ? `\n- โครงการที่ขอสิทธิ์เข้าถึง: ${regProj}` : '';
      const text = `เรียน ผู้ดูแลระบบ,\n\nมีผู้ใช้งานใหม่ลงทะเบียนสมัครเข้าระบบ TOAT Sandbox Tracker และกำลังรอการอนุมัติสิทธิ์เข้าใช้งาน:\n\n- ชื่อผู้ใช้: ${username}\n- อีเมล: ${email}\n- บทบาท/ตำแหน่งที่ลงทะเบียน: ${userTypeLabel}${projLabel}\n- รหัสพนักงาน: ${employee_id}\n- กอง/ฝ่าย: ${department} / ${division}\n- เบอร์โทรศัพท์: ${phone_number}\n- Line ID: ${line_id}\n\nกรุณาเข้าสู่ระบบในหน้าจัดการระบบ (Admin Panel) เพื่อตรวจสอบและดำเนินการอนุมัติสิทธิ์การใช้งาน.\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
      
      for (const adminEmail of adminEmails) {
        sendEmailNotification(adminEmail, subject, text).catch(err => console.error(`Failed to notify admin ${adminEmail} about new user registration:`, err));
      }
    } catch (err) {
      console.error('Failed to notify admin about new user registration:', err);
    }

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
    
    // Send password recovery link email
    const subject = `[TOAT Sandbox] คำขอกู้คืนรหัสผ่านของคุณ`;
    const text = `เรียน คุณ ${user.username},\n\nคุณได้ร้องขอลิงก์สำหรับกู้คืนรหัสผ่านในระบบ TOAT Sandbox Tracker\n\nสามารถใช้ข้อมูลบัญชีผู้ใช้หรือเข้าสู่ระบบเพื่อแก้ไขโปรไฟล์/เปลี่ยนรหัสผ่านในภายหลัง หรือหากระบบออนไลน์ต้องการรีเซ็ตกรุณาติดต่อแอดมินโดยตรง\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
    await sendEmailNotification(email, subject, text);

    res.json({ message: 'Password recovery link has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile Info & Avatar
app.put('/api/users/profile', requireLogin, uploadUserProfilePhoto, async (req, res) => {
  const { email, employee_id, division, department, phone_number, line_id } = req.body;
  const userId = req.session.user.id;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const photo_path = req.file ? fileToBase64(req.file) : null;

  try {
    if (photo_path) {
      await dbRun(
        `UPDATE users SET 
          email = ?, 
          employee_id = ?, 
          division = ?, 
          department = ?, 
          phone_number = ?, 
          line_id = ?, 
          photo_path = ? 
        WHERE id = ?`,
        [email, employee_id || '', division || '', department || '', phone_number || '', line_id || '', photo_path, userId]
      );
    } else {
      await dbRun(
        `UPDATE users SET 
          email = ?, 
          employee_id = ?, 
          division = ?, 
          department = ?, 
          phone_number = ?, 
          line_id = ? 
        WHERE id = ?`,
        [email, employee_id || '', division || '', department || '', phone_number || '', line_id || '', userId]
      );
    }

    // Refresh user details in session
    const updatedUser = await dbGet('SELECT id, username, email, role, photo_path, allowed_views, is_approved FROM users WHERE id = ?', [userId]);
    req.session.user = updatedUser;

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password
app.put('/api/users/change-password', requireLogin, async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.session.user.id;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    const user = await dbGet('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(new_password, salt);

    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// PROJECT ENDPOINTS
// ----------------------------------------------------

// Helper: Check if user has access to project (Read access - allowed for all logged-in users)
async function checkProjectAccess(userId, role, projectId) {
  return true;
}

// Helper: Check if user has permission to edit project (Write access)
async function checkProjectEditAccess(userId, role, projectId) {
  if (role === 'Admin') return true;
  if (role === 'Executive') return false; // Executive can never edit
  
  // Project Submitter (Staff) can edit only if they have Write permission assigned
  const assignment = await dbGet(
    "SELECT 1 FROM project_assignments WHERE project_id = ? AND user_id = ? AND permission_type = 'Write'",
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
        SUM(b.allocated_amount) as total_allocated,
        SUM(b.spent_amount) as total_spent,
        (SUM(b.allocated_amount) - SUM(b.spent_amount)) as total_remaining
      FROM budgets b
      JOIN projects p ON b.project_id = p.id
      WHERE p.is_hidden = 0
    `;
    let statusQuery = `
      SELECT p.status, COUNT(*) as count 
      FROM projects p
      WHERE p.is_hidden = 0
    `;
    let queryParams = [];

    statusQuery += ` GROUP BY p.status`;

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
          SELECT COALESCE(
            AVG(CASE WHEN gt.sub_task IS NOT NULL AND gt.sub_task != '' THEN gt.progress_percent ELSE NULL END),
            AVG(gt.progress_percent),
            0
          )
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
        ) as current_report_status,
        (
          SELECT id 
          FROM monthly_reports mr 
          WHERE mr.project_id = p.id AND mr.report_month_year = ?
        ) as current_report_id,
        (
          CASE 
            WHEN ? = 'Admin' THEN 1
            WHEN ? = 'Executive' THEN 0
            ELSE EXISTS (
              SELECT 1 FROM project_assignments pa 
              WHERE pa.project_id = p.id AND pa.user_id = ? AND pa.permission_type = 'Write'
            )
          END
        ) as can_edit
      FROM projects p
    `;
    let params = [reportMonthYear, reportMonthYear, role, role, userId];

    const projects = await dbAll(query, params);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Project (Admin & Staff/Project Submitter can create)
app.post('/api/projects', requireLogin, requireRole(['Admin', 'Project Submitter']), uploadProjectLogo, async (req, res) => {
  const { 
    project_name, 
    description, 
    objectives, 
    scope, 
    targets, 
    strategic_alignment, 
    values_alignment, 
    status, 
    project_group 
  } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const logo_path = req.file ? fileToBase64(req.file) : null;

  try {
    const result = await dbRun(
      `INSERT INTO projects (
        project_name, 
        description, 
        objectives, 
        scope, 
        targets, 
        strategic_alignment, 
        values_alignment, 
        logo_path, 
        status, 
        project_group
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_name, 
        description || '', 
        objectives || '', 
        scope || '', 
        targets || '', 
        strategic_alignment || '', 
        values_alignment || '', 
        logo_path, 
        status || 'Not Started', 
        project_group || 'โครงการ TOAT Sandbox'
      ]
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
        (
          SELECT COALESCE(
            AVG(CASE WHEN sub_task IS NOT NULL AND sub_task != '' THEN progress_percent ELSE NULL END),
            AVG(progress_percent),
            0
          )
          FROM gantt_tasks 
          WHERE project_id = p.id
        ) as overall_progress
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
app.put('/api/projects/:id', requireLogin, requireRole(['Admin', 'Project Submitter']), uploadProjectLogo, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { 
    project_name, 
    description, 
    objectives, 
    scope, 
    targets, 
    strategic_alignment, 
    values_alignment, 
    status, 
    project_group 
  } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const logo_path = req.file ? fileToBase64(req.file) : null;

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to edit this project.' });
    }

    if (logo_path) {
      await dbRun(
        `UPDATE projects SET 
          project_name = ?, 
          description = ?, 
          objectives = ?, 
          scope = ?, 
          targets = ?, 
          strategic_alignment = ?, 
          values_alignment = ?, 
          logo_path = ?, 
          status = ?, 
          project_group = ? 
        WHERE id = ?`,
        [
          project_name, 
          description || '', 
          objectives || '', 
          scope || '', 
          targets || '', 
          strategic_alignment || '', 
          values_alignment || '', 
          logo_path, 
          status, 
          project_group || 'โครงการ TOAT Sandbox', 
          projectId
        ]
      );
    } else {
      await dbRun(
        `UPDATE projects SET 
          project_name = ?, 
          description = ?, 
          objectives = ?, 
          scope = ?, 
          targets = ?, 
          strategic_alignment = ?, 
          values_alignment = ?, 
          status = ?, 
          project_group = ? 
        WHERE id = ?`,
        [
          project_name, 
          description || '', 
          objectives || '', 
          scope || '', 
          targets || '', 
          strategic_alignment || '', 
          values_alignment || '', 
          status, 
          project_group || 'โครงการ TOAT Sandbox', 
          projectId
        ]
      );
    }

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

// Toggle project visibility (Hide/Unhide)
app.put('/api/projects/:id/toggle-hide', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun('UPDATE projects SET is_hidden = 1 - COALESCE(is_hidden, 0) WHERE id = ?', [projectId]);
    res.json({ message: 'Project visibility toggled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle project suspension (Suspend/Resume)
app.put('/api/projects/:id/toggle-suspend', requireLogin, requireRole(['Admin', 'Project Submitter']), async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    await dbRun('UPDATE projects SET is_suspended = 1 - COALESCE(is_suspended, 0) WHERE id = ?', [projectId]);
    res.json({ message: 'Project suspension status toggled successfully' });
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

function uploadMemberPhoto(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('photo')(req, res, next);
  }
  next();
}

function uploadProjectLogo(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('logo')(req, res, next);
  }
  next();
}

function uploadUserProfilePhoto(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('profile_photo')(req, res, next);
  }
  next();
}

// Add member
app.post('/api/projects/:id/members', requireLogin, requireRole(['Admin', 'Project Submitter']), uploadMemberPhoto, async (req, res) => {
  const projectId = req.params.id;
  const { id: userId, role } = req.session.user;
  const { employee_id, full_name, nickname, position, division, department } = req.body;
  const photo_path = req.file ? fileToBase64(req.file) : null;

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
  const photo_path = req.file ? fileToBase64(req.file) : null;

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
  const invoice_file = (req.files && req.files['invoice']) ? fileToBase64(req.files['invoice'][0]) : null;
  const approval_document = (req.files && req.files['approval_doc']) ? fileToBase64(req.files['approval_doc'][0]) : null;

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
    if (budget && budget.invoice_file && budget.invoice_file.startsWith('/uploads/')) {
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
  const new_invoice = (req.files && req.files['invoice']) ? fileToBase64(req.files['invoice'][0]) : null;
  const new_approval_doc = (req.files && req.files['approval_doc']) ? fileToBase64(req.files['approval_doc'][0]) : null;

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
    if (new_invoice && oldBudget && oldBudget.payment_evidence && oldBudget.payment_evidence.startsWith('/uploads/')) {
      const fp = path.join(__dirname, 'public', oldBudget.payment_evidence);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    if (new_approval_doc && oldBudget && oldBudget.approval_document && oldBudget.approval_document.startsWith('/uploads/')) {
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
      files = req.files.map(f => {
        const url = fileToBase64(f);
        return { name: f.originalname, url };
      });
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
          if (f.url && f.url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, f.url);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
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
  const { id: userId, role, username } = req.session.user;
  const { 
    report_month_year, 
    summary, 
    issues_and_solutions, 
    activities_planned, 
    activities_unplanned, 
    issues_obstacles, 
    solutions, 
    reporter_name, 
    status 
  } = req.body;
  const report_file = req.file ? fileToBase64(req.file) : null;
  const report_file_name = req.file ? req.file.originalname : null;

  if (!report_month_year) return res.status(400).json({ error: 'Month/Year is required' });

  try {
    const canEdit = await checkProjectEditAccess(userId, role, projectId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    const submitted_at = status === 'Submitted' ? new Date().toISOString() : null;

    // Create a composite string for issues_and_solutions to maintain backward compatibility
    const issues_and_solutions_composite = issues_obstacles 
      ? `${issues_obstacles}${solutions ? '\n\nแนวทางแก้ไข:\n' + solutions : ''}` 
      : (issues_and_solutions || '');

    // Check if report already exists (since project_id + month is unique)
    const existing = await dbGet('SELECT id FROM monthly_reports WHERE project_id = ? AND report_month_year = ?', [projectId, report_month_year]);
    
    if (existing) {
      // Update
      let query = `UPDATE monthly_reports SET 
        summary = ?, 
        issues_and_solutions = ?, 
        activities_planned = ?, 
        activities_unplanned = ?, 
        issues_obstacles = ?, 
        solutions = ?, 
        reporter_name = ?, 
        status = ?`;
      let params = [
        summary, 
        issues_and_solutions_composite, 
        activities_planned, 
        activities_unplanned, 
        issues_obstacles, 
        solutions, 
        reporter_name, 
        status
      ];
      if (report_file) {
        query += `, report_file = ?, report_file_name = ?`;
        params.push(report_file);
        params.push(report_file_name);
      }
      if (submitted_at) {
        query += `, submitted_at = ?`;
        params.push(submitted_at);
      }
      query += ` WHERE id = ?`;
      params.push(existing.id);

      await dbRun(query, params);
      
      if (status === 'Submitted') {
        notifyReportSubmission(projectId, report_month_year, reporter_name || username);
      }
      
      res.json({ message: 'Monthly report updated successfully' });
    } else {
      // Insert
      await dbRun(
        `INSERT INTO monthly_reports (
          project_id, 
          report_month_year, 
          summary, 
          issues_and_solutions, 
          activities_planned, 
          activities_unplanned, 
          issues_obstacles, 
          solutions, 
          reporter_name, 
          report_file,
          report_file_name,
          submitted_at, 
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId, 
          report_month_year, 
          summary, 
          issues_and_solutions_composite, 
          activities_planned, 
          activities_unplanned, 
          issues_obstacles, 
          solutions, 
          reporter_name, 
          report_file,
          report_file_name,
          submitted_at, 
          status || 'Draft'
        ]
      );

      if (status === 'Submitted') {
        notifyReportSubmission(projectId, report_month_year, reporter_name || username);
      }

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
  const { status, comment } = req.body;
  const { username, role } = req.session.user;

  if (!status || !['Draft', 'Submitted', 'Approved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // If status is 'Draft' (Reject / improvement request), comment is required!
  if (status === 'Draft' && (!comment || !comment.trim())) {
    return res.status(400).json({ error: 'กรุณาระบุความคิดเห็น / เหตุผลที่ต้องการให้ปรับปรุงรายงาน' });
  }

  try {
    await dbRun('UPDATE monthly_reports SET status = ? WHERE id = ?', [status, reportId]);
    
    // If a comment is provided, insert it into report_comments table
    if (comment && comment.trim()) {
      await dbRun(
        'INSERT INTO report_comments (report_id, commenter_name, role, comment_text) VALUES (?, ?, ?, ?)',
        [reportId, username, role, comment.trim()]
      );
      notifyCommentAdded(reportId, username, role, comment.trim());
    }

    // Notify staff assigned to the project about status changes
    notifyReportStatusUpdate(reportId, status);
    
    res.json({ message: `Report status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send report via email to a specific recipient
app.post('/api/reports/:reportId/send-email', requireLogin, async (req, res) => {
  const reportId = req.params.reportId;
  const { email: recipientEmail } = req.body;
  const { id: userId, role } = req.session.user;

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: 'กรุณาระบุอีเมลที่ถูกต้อง' });
  }

  try {
    const report = await dbGet('SELECT * FROM monthly_reports WHERE id = ?', [reportId]);
    if (!report) return res.status(404).json({ error: 'ไม่พบรายงาน' });

    const hasAccess = await checkProjectAccess(userId, role, report.project_id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const project = await dbGet('SELECT project_name FROM projects WHERE id = ?', [report.project_id]);
    const projectName = project ? project.project_name : 'ไม่ระบุชื่อโครงการ';

    const subject = `[TOAT Sandbox] รายงานสรุปความคืบหน้าโครงการ "${projectName}" รอบเดือน ${report.report_month_year}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Sarabun', Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px 32px; color: #fff; }
    .header h1 { font-size: 1.25rem; margin: 0 0 4px; }
    .header p { color: #94a3b8; margin: 0; font-size: 0.9rem; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .badge-submitted { background: #dbeafe; color: #1d4ed8; }
    .badge-approved  { background: #d1fae5; color: #065f46; }
    .badge-draft     { background: #f1f5f9; color: #475569; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; background: #f7fafc; padding: 20px 32px; border-bottom: 1px solid #e2e8f0; }
    .meta-item span { color: #64748b; font-size: 0.8rem; display: block; }
    .meta-item strong { font-size: 0.92rem; }
    .section { padding: 20px 32px; border-bottom: 1px solid #f1f5f9; }
    .section h3 { font-size: 0.92rem; color: #2563eb; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .section p { color: #334155; font-size: 0.9rem; line-height: 1.6; margin: 0; white-space: pre-wrap; }
    .budget-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .budget-table th { background: #1e293b; color: #fff; padding: 8px 12px; text-align: right; }
    .budget-table th:first-child { text-align: left; }
    .budget-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; }
    .budget-table td:first-child { text-align: left; }
    .footer { background: #f8fafc; padding: 16px 32px; text-align: center; color: #94a3b8; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 รายงานสรุปความคืบหน้าโครงการประจำเดือน</h1>
      <p>ฝ่ายบริหารโครงการเทคโนโลยีและนวัตกรรม (TOAT Sandbox)</p>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><span>ชื่อโครงการ</span><strong>${projectName}</strong></div>
      <div class="meta-item"><span>รอบรายงานประจำเดือน</span><strong>${report.report_month_year}</strong></div>
      <div class="meta-item"><span>ผู้รายงานผล</span><strong>${report.reporter_name || 'ไม่ระบุ'}</strong></div>
      <div class="meta-item"><span>สถานะรายงาน</span>
        <span class="badge badge-${(report.status || 'draft').toLowerCase()}">${report.status || 'Draft'}</span>
      </div>
    </div>
    <div class="section">
      <h3>1. สรุปสาระสำคัญ (Project Summary)</h3>
      <p>${report.summary || 'ไม่มีข้อมูล'}</p>
    </div>
    <div class="section">
      <h3>2. กิจกรรมที่ดำเนินได้ตามแผน</h3>
      <p>${report.activities_planned || 'ไม่มีข้อมูล'}</p>
    </div>
    <div class="section">
      <h3>3. กิจกรรมที่ไม่สามารถดำเนินงานได้</h3>
      <p>${report.activities_unplanned || 'ไม่มีข้อมูล'}</p>
    </div>
    <div class="section">
      <h3>4. ปัญหา อุปสรรค</h3>
      <p>${report.issues_obstacles || 'ไม่มีปัญหา อุปสรรค'}</p>
    </div>
    <div class="section">
      <h3>5. แนวทางการแก้ไขปัญหา</h3>
      <p>${report.solutions || 'ไม่มีข้อมูล'}</p>
    </div>
    <div class="footer">
      <p>อีเมลนี้ส่งโดยอัตโนมัติจากระบบ TOAT Sandbox Project Tracker<br>
      กรุณาเข้าสู่ระบบเพื่อดูรายงานฉบับเต็มพร้อมข้อมูลงบประมาณและเอกสารแนบ</p>
    </div>
  </div>
</body>
</html>`;

    const text = `รายงานสรุปความคืบหน้าโครงการประจำเดือน\nโครงการ: ${projectName}\nรอบเดือน: ${report.report_month_year}\nผู้รายงาน: ${report.reporter_name || 'ไม่ระบุ'}\nสถานะ: ${report.status || 'Draft'}\n\nสรุป:\n${report.summary || '-'}\n\nกิจกรรมตามแผน:\n${report.activities_planned || '-'}\n\nปัญหา อุปสรรค:\n${report.issues_obstacles || '-'}\n\nแนวทางแก้ไข:\n${report.solutions || '-'}`;

    await sendEmailNotification(recipientEmail, subject, text, html);
    res.json({ message: `ส่งรายงานไปยัง ${recipientEmail} เรียบร้อยแล้ว` });
  } catch (error) {
    console.error('Failed to send report email:', error);
    res.status(500).json({ error: 'ไม่สามารถส่งอีเมลได้: ' + error.message });
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
    
    // Notify appropriate users (Admin or project staff) about new comments
    notifyCommentAdded(reportId, username, role, comment_text);
    
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
    const users = await dbAll('SELECT id, username, email, role, employee_id, division, department, line_id, phone_number, is_approved, allowed_views, registered_project, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending approval users
app.get('/api/admin/pending-users', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, email, role, employee_id, division, department, line_id, phone_number, registered_project, created_at FROM users WHERE is_approved = 0');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve user
app.put('/api/admin/users/:userId/approve', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await dbGet('SELECT username, email FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้นี้ในระบบ' });
    }
    await dbRun('UPDATE users SET is_approved = 1 WHERE id = ?', [userId]);

    // Send approval notification email
    const subject = `[TOAT Sandbox] บัญชีผู้ใช้ของคุณได้รับการอนุมัติสิทธิ์เข้าใช้งานแล้ว`;
    const text = `เรียน คุณ ${user.username},\n\nบัญชีผู้ใช้ของคุณได้รับการอนุมัติสิทธิ์การเข้าใช้งานระบบ TOAT Sandbox Tracker จากผู้ดูแลระบบเรียบร้อยแล้ว\n\nคุณสามารถลงชื่อเข้าใช้งานระบบได้ทันที\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
    sendEmailNotification(user.email, subject, text);

    res.json({ message: 'อนุมัติสิทธิ์เข้าใช้งานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user / reject user
app.delete('/api/admin/users/:userId', requireLogin, requireRole(['Admin']), async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await dbGet('SELECT username, email, is_approved FROM users WHERE id = ?', [userId]);
    if (user && user.is_approved === 0) {
      // Send rejection notification email
      const subject = `[TOAT Sandbox] บัญชีผู้ใช้ของคุณไม่ผ่านการอนุมัติสิทธิ์เข้าใช้งาน`;
      const text = `เรียน คุณ ${user.username},\n\nคำขอสมัครบัญชีผู้ใช้ระบบ TOAT Sandbox Tracker ของคุณ ไม่ผ่านการอนุมัติสิทธิ์การเข้าใช้งานจากผู้ดูแลระบบ\n\nหากคุณเชื่อว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบโดยตรง\n\nขอแสดงความนับถือ,\nระบบ TOAT Sandbox Tracker`;
      sendEmailNotification(user.email, subject, text);
    }
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

// Assign project to user (Admin only)
app.post('/api/admin/assignments', requireLogin, requireRole(['Admin']), async (req, res) => {
  const { project_id, user_id, permission_type } = req.body;
  if (!project_id || !user_id) {
    return res.status(400).json({ error: 'ต้องการข้อมูลโครงการและชื่อเจ้าหน้าที่' });
  }
  const permType = permission_type === 'Read' ? 'Read' : 'Write';
  try {
    const user = await dbGet("SELECT id, role FROM users WHERE id = ? AND role IN ('Project Submitter', 'Executive')", [user_id]);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้บทบาท Staff หรือ Executive คนนี้' });
    }
    await dbRun('INSERT OR REPLACE INTO project_assignments (project_id, user_id, permission_type) VALUES (?, ?, ?)', [project_id, user.id, permType]);
    res.json({ message: 'Project assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List project assignments
app.get('/api/admin/assignments', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const assignments = await dbAll(`
      SELECT pa.id, pa.project_id, pa.permission_type, p.project_name, u.username, u.email, u.role
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

// Get report notification emails list
app.get('/api/admin/notification-emails', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    const list = await dbAll('SELECT * FROM report_notification_emails ORDER BY created_at DESC');
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add report notification email
app.post('/api/admin/notification-emails', requireLogin, requireRole(['Admin']), async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'กรุณาระบุรูปแบบอีเมลที่ถูกต้อง' });
  }
  try {
    await dbRun('INSERT INTO report_notification_emails (email) VALUES (?)', [email]);
    res.json({ message: 'เพิ่มอีเมลรับการแจ้งเตือนสำเร็จ' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกเพิ่มในระบบเรียบร้อยแล้ว' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete report notification email
app.delete('/api/admin/notification-emails/:id', requireLogin, requireRole(['Admin']), async (req, res) => {
  try {
    await dbRun('DELETE FROM report_notification_emails WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบอีเมลรับการแจ้งเตือนสำเร็จ' });
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
          
          // Email Notification
          const subject = `[TOAT Sandbox] แจ้งเตือนด่วน: กรุณาส่งรายงานประจำเดือนรอบ ${reportMonthYear}`;
          const text = `เรียนคุณ ${user.username},\n\nโครงการ "${project.project_name}" ที่อยู่ในความดูแลของคุณยังไม่ได้รับการยื่นส่งรายงานสำหรับรอบการทำงานประจำเดือน ${reportMonthYear} ซึ่งผ่านกำหนดเวลาส่ง (วันที่ ${deadlineDay} ของเดือนนี้) เรียบร้อยแล้ว\n\nกรุณาเข้าสู่ระบบ TOAT Sandbox เพื่อทำการสรุปข้อมูลโครงการและกดส่งรายงานโดยด่วนที่สุด\n\nขอแสดงความนับถือ,\nฝ่ายบริหารโครงการ TOAT Sandbox`;
          await sendEmailNotification(user.email, subject, text);
          
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

// REST API to test email configuration and get live SMTP/HTTP feedback
app.post('/api/admin/test-email', requireLogin, requireRole(['Admin']), async (req, res) => {
  const { toEmail } = req.body;
  if (!toEmail) {
    return res.status(400).json({ error: 'กรุณาระบุอีเมลผู้รับ' });
  }

  const hasBrevo = !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
  const hasSMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!hasBrevo && !hasSMTP) {
    return res.status(400).json({ 
      error: 'ไม่พบการตั้งค่าช่องทางส่งอีเมล' ,
      details: 'กรุณาตั้งค่าความปลอดภัยใน Render Environment Variables เช่น BREVO_API_KEY และ BREVO_SENDER_EMAIL (แนะนำ) หรือ SMTP_USER และ SMTP_PASS'
    });
  }

  try {
    const subject = `[TOAT Sandbox] อีเมลทดสอบระบบ`;
    const text = `นี่คืออีเมลทดสอบความถูกต้องของการส่งอีเมลบนระบบ TOAT Sandbox Tracker\n\n- ช่องทางส่ง: ${hasBrevo ? 'Brevo HTTP API (Port 443)' : 'Gmail SMTP (Port 465)'}\n- ผู้ส่ง: ${hasBrevo ? process.env.BREVO_SENDER_EMAIL : process.env.SMTP_USER}\n- เวลาส่ง: ${new Date().toLocaleString('th-TH')}\n\nหากคุณได้รับข้อความนี้ แสดงว่าการส่งอีเมลใช้งานได้อย่างสมบูรณ์!`;
    
    const result = await sendEmailNotification(toEmail, subject, text);

    res.json({ 
      success: true, 
      message: 'ส่งอีเมลทดสอบเรียบร้อยแล้ว!', 
      channel: hasBrevo ? 'Brevo HTTP API' : 'Gmail SMTP',
      messageId: result.messageId, 
      response: result.response || 'Successfully sent via HTTP request'
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ 
      error: 'ส่งอีเมลทดสอบล้มเหลว', 
      details: error.message, 
      code: error.code,
      stack: error.stack
    });
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
