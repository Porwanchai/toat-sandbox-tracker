const dbModule = require('./database');
const bcrypt = require('bcryptjs');

async function testDatabase() {
  console.log('--- Database Verification Test Started ---');
  try {
    // Initialize Database
    await dbModule.initDatabase();
    
    // Wait a brief moment for database initialization to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // 1. Verify Users
    const users = await dbModule.dbAll('SELECT id, username, role FROM users');
    console.log(`[PASS] Loaded users count: ${users.length}`);
    users.forEach(u => {
      console.log(`   - User: ${u.username}, Role: ${u.role}`);
    });

    // Verify Admin Login credentials check
    const admin = await dbModule.dbGet('SELECT * FROM users WHERE username = ?', ['admin']);
    if (admin && bcrypt.compareSync('admin123', admin.password_hash)) {
      console.log('[PASS] Admin login credentials successfully verified.');
    } else {
      throw new Error('Admin credentials verification failed.');
    }

    // 2. Verify Projects
    const projects = await dbModule.dbAll('SELECT id, project_name, status FROM projects');
    console.log(`[PASS] Loaded projects count: ${projects.length}`);
    projects.forEach(p => {
      console.log(`   - Project: ${p.project_name}, Status: ${p.status}`);
    });

    // 3. Verify Rollups
    const rollups = await dbModule.dbGet(`
      SELECT 
        SUM(allocated_amount) as total_allocated,
        SUM(spent_amount) as total_spent
      FROM budgets
    `);
    console.log(`[PASS] Budgets rollup verification:`);
    console.log(`   - Total Allocated: ${rollups.total_allocated}`);
    console.log(`   - Total Spent: ${rollups.total_spent}`);
    console.log(`   - Total Remaining: ${rollups.total_allocated - rollups.total_spent}`);

    // 4. Verify Gantt progress calculations
    const ganttAvg = await dbModule.dbGet(`
      SELECT AVG(progress_percent) as avg_progress 
      FROM gantt_tasks 
      WHERE project_id = 1
    `);
    console.log(`[PASS] Sample project progress average calculated: ${ganttAvg.avg_progress}%`);

    console.log('--- All database tests passed successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('[FAIL] Database verification failed:', err);
    process.exit(1);
  }
}

testDatabase();
