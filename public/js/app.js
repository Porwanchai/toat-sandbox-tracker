/* ==========================================================================
   APP CONTROLLER: TOAT SANDBOX PROJECT PROGRESS TRACKER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    currentUser: null,
    activeView: 'dashboard',
    activeProjectId: null,
    activeReportId: null,
    historyStack: [],
    projects: [],
    tasks: [],
    notifications: [],
    overallChart: null,
    canEditActiveProject: false,
    lastStats: {}
  };

  // DOM Elements cache
  const elements = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    forgotForm: document.getElementById('forgot-form'),
    
    goRegister: document.getElementById('go-register'),
    goForgot: document.getElementById('go-forgot'),
    goLoginFromReg: document.getElementById('go-login-from-reg'),
    goLoginFromForgot: document.getElementById('go-login-from-forgot'),
    
    displayUsername: document.getElementById('display-username'),
    displayRole: document.getElementById('display-role'),
    logoutBtn: document.getElementById('logout-btn'),
    
    navLinks: document.querySelectorAll('.nav-link'),
    adminOnlyNav: document.querySelector('.admin-only'),
    
    notiToggle: document.getElementById('notification-toggle'),
    notiBadge: document.getElementById('noti-badge'),
    notiDropdown: document.getElementById('noti-dropdown'),
    notiList: document.getElementById('noti-list'),
    clearNotiBtn: document.getElementById('clear-notifications'),
    
    backHomeBtn: document.getElementById('back-home-btn'),
    backPrevBtn: document.getElementById('back-prev-btn'),
    systemTimeText: document.getElementById('current-system-time'),
    
    // KPI elements
    kpiAllocated: document.getElementById('kpi-total-allocated'),
    kpiSpent: document.getElementById('kpi-total-spent'),
    kpiRemaining: document.getElementById('kpi-total-remaining'),
    kpiStatusNotStarted: document.getElementById('kpi-status-not-started'),
    kpiStatusInProgress: document.getElementById('kpi-status-in-progress'),
    kpiStatusDelayed: document.getElementById('kpi-status-delayed'),
    kpiStatusCompleted: document.getElementById('kpi-status-completed'),
    dashboardProjectsBody: document.getElementById('dashboard-projects-body'),
    downloadDashboardReportBtn: document.getElementById('download-dashboard-report-btn'),
    overallProgressPieChart: document.getElementById('overall-progress-pie-chart'),
    chartCenterPercentage: document.getElementById('chart-center-percentage'),
    listReportedProjects: document.getElementById('list-reported-projects'),
    listUnreportedProjects: document.getElementById('list-unreported-projects'),
    countReportedLbl: document.getElementById('count-reported-lbl'),
    countUnreportedLbl: document.getElementById('count-unreported-lbl'),
    executiveSummaryCycleLbl: document.getElementById('executive-summary-cycle-lbl'),
    groupListSandbox: document.getElementById('group-list-sandbox'),
    groupListProposal: document.getElementById('group-list-proposal'),
    groupListProduction: document.getElementById('group-list-production'),
    
    // Project Cards
    projectCardsContainer: document.getElementById('project-cards-container'),
    openCreateProjectModalBtn: document.getElementById('open-create-project-modal-btn'),
    showHiddenProjectsChk: document.getElementById('show-hidden-projects-chk'),
    
    // Workspace View
    wsProjectName: document.getElementById('ws-project-name'),
    wsProjectDesc: document.getElementById('ws-project-desc'),
    wsProjectStatus: document.getElementById('ws-project-status'),
    wsEditProjectBtn: document.getElementById('ws-edit-project-btn'),
    wsOverallProgressText: document.getElementById('ws-overall-progress-text'),
    wsOverallProgressFill: document.getElementById('ws-overall-progress-fill'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    wsMembersTableBody: document.getElementById('ws-members-table-body'),
    addMemberBtn: document.getElementById('add-member-btn'),
    wsStakeholdersTableBody: document.getElementById('ws-stakeholders-table-body'),
    addStakeholderBtn: document.getElementById('add-stakeholder-btn'),
    
    wsBudgetTableBody: document.getElementById('ws-budget-table-body'),
    addBudgetItemBtn: document.getElementById('add-budget-item-btn'),
    wsBudgetAllocated: document.getElementById('ws-budget-total-allocated'),
    wsBudgetSpent: document.getElementById('ws-budget-total-spent'),
    wsBudgetRemaining: document.getElementById('ws-budget-total-remaining'),
    
    ganttTimelineHeader: document.getElementById('gantt-timeline-header'),
    ganttTimelineQuarterHeader: document.getElementById('gantt-timeline-quarter-header'),
    ganttChartRows: document.getElementById('gantt-chart-rows'),
    addGanttTaskBtn: document.getElementById('add-gantt-task-btn'),
    wsGanttTableBody: document.getElementById('ws-gantt-table-body'),
    
    wsReportsTableBody: document.getElementById('ws-reports-table-body'),
    createMonthlyReportBtn: document.getElementById('create-monthly-report-btn'),
    
    // Report Detail View
    repProjName: document.getElementById('rep-proj-name'),
    repMonthYear: document.getElementById('rep-month-year'),
    repProjStatus: document.getElementById('rep-proj-status'),
    repProjProgress: document.getElementById('rep-proj-progress'),
    repSubmittedAt: document.getElementById('rep-submitted-at'),
    repStatus: document.getElementById('rep-status'),
    repSummaryText: document.getElementById('rep-summary-text'),
    repIssuesText: document.getElementById('rep-issues-text'),
    repBudgetAllocated: document.getElementById('rep-budget-allocated'),
    repBudgetSpent: document.getElementById('rep-budget-spent'),
    repBudgetRemaining: document.getElementById('rep-budget-remaining'),
    repBudgetItemsBody: document.getElementById('rep-budget-items-body'),
    repAttachmentLink: document.getElementById('rep-attachment-link'),
    backToWorkspaceBtn: document.getElementById('back-to-workspace-btn'),
    printPdfReportBtn: document.getElementById('print-pdf-report-btn'),
    execStatusChangeBox: document.getElementById('exec-status-change-box'),
    btnApproveReport: document.getElementById('btn-approve-report'),
    btnRejectReport: document.getElementById('btn-reject-report'),
    reportCommentsList: document.getElementById('report-comments-list'),
    addCommentForm: document.getElementById('add-comment-form'),
    commentTextInput: document.getElementById('comment-text-input'),
    
    // Admin View
    adminUsersTableBody: document.getElementById('admin-users-table-body'),
    adminProjectsTableBody: document.getElementById('admin-projects-table-body'),
    adminCreateProjectBtn: document.getElementById('admin-create-project-btn'),
    adminDeadlineDay: document.getElementById('admin-deadline-day'),
    adminDeadlineForm: document.getElementById('admin-deadline-form'),
    adminManualTriggerBtn: document.getElementById('admin-manual-trigger-btn'),
    triggerResultLog: document.getElementById('trigger-result-log'),
    adminTestEmailInput: document.getElementById('admin-test-email-input'),
    adminTestEmailBtn: document.getElementById('admin-test-email-btn'),
    emailTestResultLog: document.getElementById('email-test-result-log'),
    assignProjectId: document.getElementById('assign-project-id'),
    assignUserId: document.getElementById('assign-user-id'),
    adminAssignForm: document.getElementById('admin-assign-form'),
    adminAssignmentsTableBody: document.getElementById('admin-assignments-table-body'),
    modalPendingApprovals: document.getElementById('modal-pending-approvals'),
    pendingUsersTableBody: document.getElementById('pending-users-table-body'),
    
    // Modals
    modalCreateProject: document.getElementById('modal-create-project'),
    formCreateProject: document.getElementById('form-create-project'),
    modalAddMember: document.getElementById('modal-add-member'),
    formAddMember: document.getElementById('form-add-member'),
    modalAddStakeholder: document.getElementById('modal-add-stakeholder'),
    formAddStakeholder: document.getElementById('form-add-stakeholder'),
    modalAddBudget: document.getElementById('modal-add-budget'),
    formAddBudget: document.getElementById('form-add-budget'),
    modalViewUserDetails: document.getElementById('modal-view-user-details'),
    modalAddGanttTask: document.getElementById('modal-add-gantt-task'),
    formAddGanttTask: document.getElementById('form-add-gantt-task'),
    modalCreateMonthlyReport: document.getElementById('modal-create-monthly-report'),
    formCreateMonthlyReport: document.getElementById('form-create-monthly-report')
  };

  // ----------------------------------------------------
  // IDLE TIMEOUT MONITOR (5 minutes)
  // ----------------------------------------------------
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  let idleTimer = null;
  let lastResetTime = 0;

  function resetIdleTimer() {
    const now = Date.now();
    // Throttle checks to once per second to reduce CPU usage on mouse move events
    if (now - lastResetTime < 1000) {
      return;
    }
    lastResetTime = now;

    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    if (state.currentUser) {
      idleTimer = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
    }
  }

  async function handleIdleTimeout() {
    if (!state.currentUser) return;
    
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }

    // 1. Immediately clear user state and hide application container
    // to prevent sensitive info leaks while the alert dialog is blocking execution
    state.currentUser = null;
    state.historyStack = [];

    elements.authContainer.classList.remove('hidden');
    elements.appContainer.classList.add('hidden');
    elements.loginForm.classList.remove('hidden');
    elements.registerForm.classList.add('hidden');
    elements.forgotForm.classList.add('hidden');

    // 2. Alert the user (blocking alert)
    alert('หมดเวลาเข้าระบบเนื่องจากไม่มีการเคลื่อนไหวเกิน 5 นาที กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    
    // 3. Clear session on backend server
    try {
      await API.auth.logout();
    } catch (err) {
      console.error('Logout failed during idle timeout:', err);
    }
  }

  // Setup activity listeners
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  // Helper: Format Currency
  function formatTHB(amount) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  }

  // Helper: Format Date
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Helper: Format Thai Month-Year
  function formatThaiMonthYear(monthYearStr) {
    if (!monthYearStr) return '-';
    const [year, month] = monthYearStr.split('-');
    const monthsThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthName = monthsThai[parseInt(month) - 1];
    const yearBE = parseInt(year) + 543;
    return `${monthName} ${yearBE}`;
  }

  // Helper: Format Thai Full Date & Time
  function formatThaiDate(date) {
    const monthsThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const day = date.getDate();
    const monthName = monthsThai[date.getMonth()];
    const yearBE = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${monthName} ${yearBE} เวลา ${hours}:${minutes} น.`;
  }

  // System time clock ticking
  function updateClock() {
    const now = new Date();
    elements.systemTimeText.textContent = now.toLocaleDateString('th-TH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ----------------------------------------------------
  // ROUTING & VIEW NAVIGATION WITH HISTORY
  // ----------------------------------------------------

  function showView(viewName, skipHistoryPush = false) {
    // Check view permissions
    if (state.currentUser) {
      const allowedViews = (state.currentUser.allowed_views || '').split(',').map(v => v.trim());
      // Admin always has access to all views.
      // If a view is not in allowedViews, block access (except project-workspace and report-detail which are sub-views of projects-list)
      const isSubView = ['project-workspace', 'report-detail'].includes(viewName);
      if (state.currentUser.role !== 'Admin' && !allowedViews.includes(viewName) && !isSubView) {
        alert('คุณไม่มีสิทธิ์เข้าใช้งานหน้าต่างนี้');
        return;
      }
    }

    // 1. Manage history stack for back-to-previous button
    if (!skipHistoryPush && state.activeView && state.activeView !== viewName) {
      state.historyStack.push(state.activeView);
    }

    // 2. Hide all views and show target view
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
    });
    
    const targetViewEl = document.getElementById(`view-${viewName}`);
    if (targetViewEl) {
      targetViewEl.classList.remove('hidden');
    }

    state.activeView = viewName;

    // 3. Update sidebar active nav links
    elements.navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Hide dropdowns when changing views
    elements.notiDropdown.classList.add('hidden');

    // 4. Load view specific data
    switch (viewName) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'projects-list':
        loadProjectsListData();
        break;
      case 'project-workspace':
        loadWorkspaceData();
        break;
      case 'admin-panel':
        loadAdminPanelData();
        break;
    }
  }

  // Global Back navigation events
  elements.backHomeBtn.addEventListener('click', () => {
    state.historyStack = []; // Clear stack
    showView('dashboard');
  });

  elements.backPrevBtn.addEventListener('click', () => {
    if (state.historyStack.length > 0) {
      const prevView = state.historyStack.pop();
      showView(prevView, true); // True to avoid pushing back onto history stack
    } else {
      // Default fallback if no history
      showView('dashboard');
    }
  });

  // ----------------------------------------------------
  // NATIVE MODALS LIGHT-DISMISS FALLBACK
  // ----------------------------------------------------

  // Feature detect native <dialog closedby> support
  const supportsClosedBy = 'closedBy' in HTMLDialogElement.prototype;

  function initDialogFallback(dialog) {
    if (!supportsClosedBy && dialog) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return; // ignore clicks on content

        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );

        if (!isDialogContent) {
          dialog.close();
        }
      });
    }
  }

  // Apply fallback listener to all dialog modals
  document.querySelectorAll('dialog').forEach(initDialogFallback);

  // ----------------------------------------------------
  // AUTHENTICATION LOGIC
  // ----------------------------------------------------

  async function checkAuth() {
    try {
      const data = await API.auth.me();
      state.currentUser = data.user;
      elements.displayUsername.textContent = state.currentUser.username;
      elements.displayRole.textContent = state.currentUser.role;
      
      // Setup role badge classes
      elements.displayRole.className = `user-role badge ${state.currentUser.role.toLowerCase().replace(' ', '-')}`;

      // Render user avatar in sidebar
      const sidebarAvatar = document.getElementById('sidebar-user-avatar');
      const sidebarAvatarPlaceholder = document.getElementById('sidebar-user-avatar-placeholder');
      if (sidebarAvatar && sidebarAvatarPlaceholder) {
        if (state.currentUser.photo_path) {
          sidebarAvatar.src = state.currentUser.photo_path + '?t=' + new Date().getTime();
          sidebarAvatar.classList.remove('hidden');
          sidebarAvatarPlaceholder.classList.add('hidden');
        } else {
          sidebarAvatar.src = '';
          sidebarAvatar.classList.add('hidden');
          sidebarAvatarPlaceholder.classList.remove('hidden');
        }
      }

      // Parse allowed views list
      const allowedViews = (state.currentUser.allowed_views || '').split(',').map(v => v.trim());
      elements.navLinks.forEach(link => {
        const view = link.getAttribute('data-view');
        // Admin always has access to all views
        if (state.currentUser.role === 'Admin' || allowedViews.includes(view)) {
          link.parentElement.classList.remove('hidden');
        } else {
          link.parentElement.classList.add('hidden');
        }
      });

      if (state.currentUser.role === 'Admin') {
        checkPendingApprovals();
      }

      // Hide / Show views for creators
      if (state.currentUser.role === 'Executive') {
        elements.openCreateProjectModalBtn.classList.add('hidden');
      } else {
        elements.openCreateProjectModalBtn.classList.remove('hidden');
      }

      elements.authContainer.classList.add('hidden');
      elements.appContainer.classList.remove('hidden');
      showView('dashboard');
      loadNotifications();
      resetIdleTimer();
    } catch (err) {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      // Show login page
      elements.authContainer.classList.remove('hidden');
      elements.appContainer.classList.add('hidden');
      elements.loginForm.classList.remove('hidden');
      elements.registerForm.classList.add('hidden');
      elements.forgotForm.classList.add('hidden');
    }
  }

  // Handle Login
  elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    try {
      await API.auth.login(u, p);
      elements.loginForm.reset();
      checkAuth();
    } catch (err) {
      alert('เข้าสู่ระบบล้มเหลว: ' + err.message);
    }
  });

  // Handle Registration
  elements.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('register-username').value;
    const em = document.getElementById('register-email').value;
    const p = document.getElementById('register-password').value;
    const emp = document.getElementById('register-employee-id').value;
    const div = document.getElementById('register-division').value;
    const dept = document.getElementById('register-department').value;
    const line = document.getElementById('register-line-id').value;
    const tel = document.getElementById('register-phone-number').value;
    try {
      await API.auth.register(u, em, p, emp, div, dept, line, tel);
      alert('ลงทะเบียนสำเร็จแล้ว! บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติสิทธิ์เข้าใช้งาน');
      elements.registerForm.reset();
      // Switch to login
      elements.registerForm.classList.add('hidden');
      elements.loginForm.classList.remove('hidden');
    } catch (err) {
      alert('ลงทะเบียนล้มเหลว: ' + err.message);
    }
  });

  // Handle Forgot Password
  elements.forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = document.getElementById('forgot-email').value;
    try {
      const data = await API.auth.forgotPassword(em);
      alert(data.message);
      elements.forgotForm.reset();
      // Switch back to login
      elements.forgotForm.classList.add('hidden');
      elements.loginForm.classList.remove('hidden');
    } catch (err) {
      alert('ล้มเหลว: ' + err.message);
    }
  });

  // Handle Logout
  elements.logoutBtn.addEventListener('click', async () => {
    try {
      await API.auth.logout();
      state.currentUser = null;
      state.historyStack = [];
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      checkAuth();
    } catch (err) {
      alert(err.message);
    }
  });

  // Switch Auth Card Tabs
  elements.goRegister.addEventListener('click', (e) => {
    e.preventDefault();
    elements.loginForm.classList.add('hidden');
    elements.registerForm.classList.remove('hidden');
  });
  elements.goForgot.addEventListener('click', (e) => {
    e.preventDefault();
    elements.loginForm.classList.add('hidden');
    elements.forgotForm.classList.remove('hidden');
  });
  elements.goLoginFromReg.addEventListener('click', (e) => {
    e.preventDefault();
    elements.registerForm.classList.add('hidden');
    elements.loginForm.classList.remove('hidden');
  });
  elements.goLoginFromForgot.addEventListener('click', (e) => {
    e.preventDefault();
    elements.forgotForm.classList.add('hidden');
    elements.loginForm.classList.remove('hidden');
  });

  // ----------------------------------------------------
  // SIDEBAR NAVIGATION CLICK EVENT
  // ----------------------------------------------------
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      showView(view);
    });
  });

  // ----------------------------------------------------
  // NOTIFICATIONS LISTENER
  // ----------------------------------------------------
  elements.notiToggle.addEventListener('click', (e) => {
    e.preventDefault();
    elements.notiDropdown.classList.toggle('hidden');
  });

  async function loadNotifications() {
    try {
      const notifications = await API.notifications.list();
      state.notifications = notifications;

      if (notifications.length > 0) {
        elements.notiBadge.textContent = notifications.length;
        elements.notiBadge.classList.remove('hidden');
        
        elements.notiList.innerHTML = '';
        notifications.forEach(noti => {
          const li = document.createElement('li');
          li.innerHTML = `
            <div>${noti.message}</div>
            <small style="color:var(--text-muted);">${formatDate(noti.created_at)}</small>
          `;
          elements.notiList.appendChild(li);
        });
      } else {
        elements.notiBadge.classList.add('hidden');
        elements.notiList.innerHTML = '<li class="empty-noti">ไม่มีการแจ้งเตือนค้างอยู่</li>';
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }

  elements.clearNotiBtn.addEventListener('click', async () => {
    try {
      await API.notifications.clear();
      loadNotifications();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  });

  // Bind download dashboard executive report button
  elements.downloadDashboardReportBtn.addEventListener('click', () => {
    generateExecutivePDFReport();
  });

  function generateExecutivePDFReport() {
    const projects = state.projects || [];
    const stats = state.lastStats || {};

    // Date helpers
    const now = new Date();
    let cycleYear = now.getFullYear();
    let cycleMonth = now.getMonth();
    if (cycleMonth === 0) { cycleMonth = 12; cycleYear -= 1; }
    const reportMonthYear = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`;
    const cycleLbl = formatThaiMonthYear(reportMonthYear);
    const dateLbl = formatThaiDate(now);

    const totalAllocated = stats.budget ? formatTHB(stats.budget.total_allocated) : '฿0.00';
    const totalSpent = stats.budget ? formatTHB(stats.budget.total_spent) : '฿0.00';
    const totalRemaining = stats.budget ? formatTHB(stats.budget.total_remaining) : '฿0.00';
    const avgProgress = projects.length > 0
      ? Math.round(projects.reduce((a, p) => a + (p.overall_progress || 0), 0) / projects.length) : 0;

    const statusCounts = {
      notStarted: projects.filter(p => p.status === 'Not Started').length,
      inProgress: projects.filter(p => p.status === 'In Progress').length,
      delayed: projects.filter(p => p.status === 'Delayed').length,
      completed: projects.filter(p => p.status === 'Completed').length,
    };

    const reportedProjects = projects.filter(p => p.current_report_status);
    const unreportedProjects = projects.filter(p => !p.current_report_status);

    // Helpers
    function getReportStatusTh(s) {
      if (!s) return 'ยังไม่ส่งรายงาน';
      if (s === 'Approved') return 'อนุมัติแล้ว';
      if (s === 'Submitted') return 'ส่งแล้ว / รอตรวจ';
      if (s === 'Draft') return 'ร่าง (ยังไม่ส่ง)';
      if (s === 'Rejected') return 'ต้องแก้ไข';
      return s;
    }
    function getReportStatusColor(s) {
      if (!s) return '#dc2626';
      if (s === 'Approved') return '#059669';
      if (s === 'Submitted') return '#d97706';
      if (s === 'Draft') return '#6b7280';
      if (s === 'Rejected') return '#dc2626';
      return '#374151';
    }
    function getProjectStatusTh(s) {
      const m = { 'Not Started': 'ยังไม่เริ่ม', 'In Progress': 'กำลังดำเนินการ', 'Delayed': 'ล่าช้า', 'Completed': 'เสร็จสิ้น' };
      return m[s] || s;
    }
    function progressColor(pct) {
      if (pct >= 80) return '#059669';
      if (pct >= 50) return '#2563eb';
      if (pct >= 20) return '#d97706';
      return '#dc2626';
    }
    function progressBar(pct) {
      const c = progressColor(pct);
      return `<div style="display:flex;align-items:center;gap:6px;">
        <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${c};border-radius:4px;"></div>
        </div>
        <span style="font-size:0.78rem;font-weight:700;color:${c};min-width:30px;">${pct}%</span>
      </div>`;
    }

    // Build main projects table rows
    const projectRows = projects.map((p, i) => {
      const pct = Math.round(p.overall_progress || 0);
      const rc = getReportStatusColor(p.current_report_status);
      const rt = getReportStatusTh(p.current_report_status);
      return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};page-break-inside:avoid;">
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:0.82rem;color:#111827;">${p.project_name}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:0.78rem;color:#374151;">${p.project_group || 'TOAT Sandbox'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:0.78rem;">${getProjectStatusTh(p.status)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${progressBar(pct)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:0.78rem;">${formatTHB(p.total_allocated || 0)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:0.78rem;color:#dc2626;">${formatTHB(p.total_spent || 0)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="background:${rc}18;color:${rc};padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:700;border:1px solid ${rc}44;white-space:nowrap;">${rt}</span>
        </td>
      </tr>`;
    }).join('');

    // Build group detail cards
    const groupDefs = [
      { name: 'โครงการ TOAT Sandbox', color: '#1d4ed8', light: '#eff6ff', icon: '🔬' },
      { name: 'โครงการอยู่ระหว่างนำเสนอ', color: '#b45309', light: '#fef3c7', icon: '📋' },
      { name: 'โครงการเดิมที่ดำเนินงานจริง', color: '#065f46', light: '#d1fae5', icon: '✅' },
    ];
    const groupSections = groupDefs.map(g => {
      const list = projects.filter(p => p.project_group === g.name);
      if (list.length === 0) return `
        <div style="page-break-inside:avoid;margin-bottom:1.5rem;">
          <div style="background:${g.light};border-left:4px solid ${g.color};padding:10px 14px;border-radius:0 6px 6px 0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:800;color:${g.color};font-size:0.9rem;">${g.icon} ${g.name}</span>
            <span style="font-size:0.78rem;color:#6b7280;">ไม่มีโครงการในกลุ่มนี้</span>
          </div>
        </div>`;
      const rows = list.map((p, i) => {
        const pct = Math.round(p.overall_progress || 0);
        const rem = (p.total_allocated || 0) - (p.total_spent || 0);
        return `<tr style="background:${i%2===0?'#ffffff':'#f8fafc'};page-break-inside:avoid;">
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:0.8rem;color:#111827;">${p.project_name}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;">${progressBar(pct)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:0.78rem;">${formatTHB(p.total_allocated||0)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:0.78rem;color:#dc2626;">${formatTHB(p.total_spent||0)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:0.78rem;font-weight:700;color:${rem>=0?'#059669':'#dc2626'};">${formatTHB(rem)}</td>
        </tr>`;
      }).join('');
      return `
        <div style="page-break-inside:avoid;margin-bottom:2rem;">
          <div style="background:${g.light};border-left:4px solid ${g.color};padding:10px 14px;border-radius:0 6px 6px 0;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:800;color:${g.color};font-size:0.9rem;">${g.icon} ${g.name}</span>
            <span style="background:white;color:${g.color};border:1px solid ${g.color}44;padding:2px 10px;border-radius:12px;font-size:0.78rem;font-weight:700;">${list.length} โครงการ</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
            <thead>
              <tr style="background:${g.color};color:white;">
                <th style="padding:7px 10px;text-align:left;font-weight:700;width:35%;">ชื่อโครงการ</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;min-width:130px;">ความคืบหน้า</th>
                <th style="padding:7px 10px;text-align:right;font-weight:700;">งบจัดสรร</th>
                <th style="padding:7px 10px;text-align:right;font-weight:700;">เบิกจ่าย</th>
                <th style="padding:7px 10px;text-align:right;font-weight:700;">งบคงเหลือ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');

    // Unreported warning list
    const unreportedList = unreportedProjects.length === 0
      ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;font-size:0.85rem;color:#065f46;font-weight:600;">✅ ทุกโครงการส่งรายงานครบถ้วนแล้วในรอบนี้</div>`
      : `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;">
          <div style="font-weight:700;color:#854d0e;font-size:0.85rem;margin-bottom:6px;">⚠️ โครงการที่ยังไม่ส่งรายงานรอบ ${cycleLbl}:</div>
          <ul style="padding-left:1.2rem;margin:0;font-size:0.82rem;color:#713f12;">
            ${unreportedProjects.map(p => `<li style="margin-bottom:2px;">${p.project_name}</li>`).join('')}
          </ul>
        </div>`;

    // SVG progress ring
    const circumference = 2 * Math.PI * 42;
    const dashOffset = circumference * (1 - avgProgress / 100);
    const ringColor = progressColor(avgProgress);

    // ─── Full HTML document ───
    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>รายงานสรุปผู้บริหาร TOAT Sandbox – ${cycleLbl}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Sarabun', 'Tahoma', 'Arial', sans-serif;
      background: #e8edf3;
      color: #111827;
      line-height: 1.65;
      font-size: 14px;
    }

    /* ── Screen toolbar ── */
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 999;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      padding: 10px 28px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 3px 20px rgba(0,0,0,0.35);
    }
    .toolbar-left { display: flex; align-items: center; gap: 12px; }
    .toolbar-badge {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
      color: white; font-size: 0.75rem; font-weight: 700;
      padding: 3px 10px; border-radius: 20px; letter-spacing: 0.05em;
    }
    .toolbar-title { color: #e2e8f0; font-size: 0.92rem; font-weight: 600; }
    .toolbar-title strong { color: #60a5fa; }
    .btn-print {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
      color: white; border: none; padding: 8px 22px;
      border-radius: 8px; font-size: 0.85rem; font-weight: 700;
      cursor: pointer; font-family: inherit;
      box-shadow: 0 4px 14px rgba(37,99,235,0.45);
      transition: all 0.2s; margin-left: 8px;
    }
    .btn-print:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.55); }
    .btn-close {
      background: rgba(255,255,255,0.1); color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 8px 16px; border-radius: 8px; font-size: 0.85rem;
      cursor: pointer; font-family: inherit; transition: all 0.2s;
    }
    .btn-close:hover { background: rgba(255,255,255,0.2); }

    /* ── Page wrapper ── */
    .page-wrap { margin-top: 56px; padding: 28px 20px; max-width: 980px; margin-left: auto; margin-right: auto; }

    /* ── A4 page card ── */
    .a4 {
      background: white; padding: 44px 52px;
      margin-bottom: 28px; position: relative;
      border-radius: 3px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .a4::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px;
      background: linear-gradient(90deg, #1d4ed8 0%, #0ea5e9 45%, #7c3aed 100%);
    }
    .a4::after {
      content: ''; position: absolute; top: 5px; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, rgba(29,78,216,0.2) 0%, rgba(14,165,233,0.1) 100%);
    }

    /* ── Cover ── */
    .cover { text-align: center; padding: 20px 0 10px; }
    .cover-logo {
      width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px;
      background: linear-gradient(135deg, #1d4ed8, #7c3aed);
      display: flex; align-items: center; justify-content: center;
      font-size: 2.2rem; color: white; font-weight: 900;
      box-shadow: 0 8px 24px rgba(29,78,216,0.35);
    }
    .cover-org { font-size: 0.85rem; color: #6b7280; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; margin-bottom: 6px; }
    .cover-title { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1.2; margin-bottom: 8px; }
    .cover-subtitle { font-size: 1.05rem; color: #2563eb; font-weight: 700; }
    .cover-divider { width: 60px; height: 4px; background: linear-gradient(90deg,#2563eb,#7c3aed); border-radius: 2px; margin: 20px auto; }
    .cover-info-box {
      display: inline-flex; flex-direction: column; gap: 7px;
      background: #f8fafc; border: 1px solid #e2e8f0;
      padding: 18px 32px; border-radius: 12px;
      font-size: 0.88rem; color: #374151; text-align: left;
    }
    .cover-info-row { display: flex; gap: 8px; }
    .cover-info-label { color: #6b7280; min-width: 130px; }
    .cover-info-value { font-weight: 700; color: #111827; }
    .cover-secret { margin-top: 20px; font-size: 0.72rem; color: #9ca3af; letter-spacing: 0.15em; text-transform: uppercase; }
    .cover-kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 28px; }
    .cover-kpi {
      border-radius: 12px; padding: 16px 12px; text-align: center;
      border: 1px solid;
    }
    .cover-kpi-value { font-size: 0.95rem; font-weight: 800; line-height: 1.2; }
    .cover-kpi-label { font-size: 0.68rem; margin-top: 4px; font-weight: 500; color: #6b7280; }

    /* ── Section title ── */
    .sec-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 1rem; font-weight: 800; color: #0f172a;
      padding-bottom: 10px; margin-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .sec-num {
      width: 26px; height: 26px; border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
      color: white; font-size: 0.75rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    /* ── Progress + budget block ── */
    .overview-block {
      display: flex; gap: 24px; align-items: center;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 20px 24px; margin-bottom: 20px;
    }
    .ring-wrap { position: relative; width: 96px; height: 96px; flex-shrink: 0; }
    .ring-wrap svg { transform: rotate(-90deg); }
    .ring-center {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .ring-pct { font-size: 1.25rem; font-weight: 800; }
    .ring-sub { font-size: 0.5rem; color: #6b7280; }
    .budget-stack { flex: 1; display: flex; flex-direction: column; gap: 9px; }
    .budget-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 14px; border-radius: 8px;
    }
    .budget-lbl { font-size: 0.82rem; color: #374151; }
    .budget-val { font-size: 0.9rem; font-weight: 800; }

    /* ── KPI 4-col ── */
    .kpi4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .kpi-card { border-radius: 10px; padding: 14px 10px; text-align: center; border: 1px solid; }
    .kpi-val { font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
    .kpi-lbl { font-size: 0.7rem; font-weight: 600; margin-top: 4px; }

    /* ── Report status 2-col ── */
    .status2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .status-card {
      display: flex; align-items: center; gap: 14px;
      border-radius: 10px; padding: 14px 16px; border: 1px solid;
    }
    .status-icon { font-size: 1.6rem; flex-shrink: 0; }
    .status-count { font-size: 1.4rem; font-weight: 800; line-height: 1.1; }
    .status-lbl { font-size: 0.75rem; font-weight: 600; }

    /* ── Table ── */
    .report-table { width: 100%; border-collapse: collapse; }
    .report-table thead th {
      background: #0f172a; color: white;
      padding: 9px 10px; font-size: 0.78rem; font-weight: 700; text-align: left;
    }
    .report-table thead th:first-child { border-radius: 6px 0 0 0; }
    .report-table thead th:last-child { border-radius: 0 6px 0 0; }
    .report-table tbody tr { page-break-inside: avoid; }

    /* ── Page footer ── */
    .page-foot {
      margin-top: 28px; padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.7rem; color: #9ca3af;
    }

    /* ── Decorative circles (cover) ── */
    .deco { position: absolute; border-radius: 50%; pointer-events: none; }

    /* ── Print ── */
    @media print {
      @page { size: A4 portrait; margin: 10mm 12mm; }
      body { background: white; }
      .toolbar { display: none !important; }
      .page-wrap { margin-top: 0; padding: 0; max-width: 100%; }
      .a4 {
        padding: 18mm 16mm; margin-bottom: 0;
        box-shadow: none; border-radius: 0;
        page-break-after: always;
      }
      .a4:last-child { page-break-after: auto; }
      .a4::before { height: 4px; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      .sec-title, .overview-block, .kpi4, .status2, .status-card { page-break-inside: avoid; }
      .cover-kpi-row { grid-template-columns: repeat(3,1fr); }
    }
  </style>
</head>
<body>

<!-- ── Screen toolbar ── -->
<div class="toolbar">
  <div class="toolbar-left">
    <span class="toolbar-badge">TOAT SANDBOX</span>
    <span class="toolbar-title">รายงานสรุปผู้บริหาร – <strong>${cycleLbl}</strong></span>
  </div>
  <div>
    <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
    <button class="btn-close" onclick="window.close()">✕ ปิด</button>
  </div>
</div>

<div class="page-wrap">

<!-- ═════════════════════════════════════
     หน้า 1 — ปกรายงาน
═════════════════════════════════════ -->
<div class="a4">
  <div class="deco" style="width:240px;height:240px;background:radial-gradient(circle,rgba(37,99,235,0.07),transparent 70%);top:-60px;right:-60px;"></div>
  <div class="deco" style="width:180px;height:180px;background:radial-gradient(circle,rgba(124,58,237,0.06),transparent 70%);bottom:-50px;left:-50px;"></div>

  <div class="cover">
    <img src="/images/logo.png" alt="TOAT Sandbox Logo" style="height: 110px; margin-bottom: 1.5rem; object-fit: contain;">
    <div class="cover-title">เอกสารรายงานสรุป<br>สำหรับผู้บริหาร</div>
    <div class="cover-subtitle">Executive Summary Report — TOAT Sandbox</div>
    <div class="cover-divider"></div>
    <div class="cover-info-box">
      <div class="cover-info-row">
        <span class="cover-info-label">รอบรายงานประจำเดือน</span>
        <span class="cover-info-value">${cycleLbl}</span>
      </div>
      <div class="cover-info-row">
        <span class="cover-info-label">วันที่จัดทำเอกสาร</span>
        <span class="cover-info-value">${dateLbl}</span>
      </div>
      <div class="cover-info-row">
        <span class="cover-info-label">จำนวนโครงการในระบบ</span>
        <span class="cover-info-value">${projects.length} โครงการ</span>
      </div>
      <div class="cover-info-row">
        <span class="cover-info-label">ความคืบหน้าเฉลี่ย</span>
        <span class="cover-info-value" style="color:${ringColor};">${avgProgress}%</span>
      </div>
    </div>
    <div class="cover-kpi-row">
      <div class="cover-kpi" style="background:#eff6ff;border-color:#bfdbfe;">
        <div class="cover-kpi-value" style="color:#1d4ed8;">${totalAllocated}</div>
        <div class="cover-kpi-label">💰 งบจัดสรรรวม</div>
      </div>
      <div class="cover-kpi" style="background:#fef2f2;border-color:#fecaca;">
        <div class="cover-kpi-value" style="color:#dc2626;">${totalSpent}</div>
        <div class="cover-kpi-label">📤 เบิกจ่ายแล้ว</div>
      </div>
      <div class="cover-kpi" style="background:#f0fdf4;border-color:#bbf7d0;">
        <div class="cover-kpi-value" style="color:#059669;">${totalRemaining}</div>
        <div class="cover-kpi-label">🏦 งบคงเหลือ</div>
      </div>
    </div>
    <div class="cover-secret">เอกสารสงวน · สำหรับผู้บริหาร · Confidential</div>
  </div>

  <div class="page-foot">
    <span>TOAT Sandbox · Project Tracking &amp; Management System</span>
    <span>หน้า 1 / 3</span>
  </div>
</div>

<!-- ═════════════════════════════════════
     หน้า 2 — ดัชนีชี้วัดและสรุปการส่งรายงาน
═════════════════════════════════════ -->
<div class="a4">

  <!-- Section 1: ภาพรวมความคืบหน้าและงบประมาณ -->
  <div class="sec-title">
    <span class="sec-num">1</span>
    <span>📊 ดัชนีความคืบหน้าและภาพรวมงบประมาณโครงการ</span>
  </div>
  <div class="overview-block">
    <div class="ring-wrap">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="42" fill="none" stroke="#e5e7eb" stroke-width="10"/>
        <circle cx="48" cy="48" r="42" fill="none" stroke="${ringColor}" stroke-width="10"
          stroke-dasharray="${(avgProgress / 100 * circumference).toFixed(2)} ${circumference.toFixed(2)}"
          stroke-dashoffset="0" stroke-linecap="round"/>
      </svg>
      <div class="ring-center">
        <span class="ring-pct" style="color:${ringColor};">${avgProgress}%</span>
        <span class="ring-sub">ความคืบหน้าเฉลี่ย</span>
      </div>
    </div>
    <div class="budget-stack">
      <div class="budget-row" style="background:#eff6ff;">
        <span class="budget-lbl">💰 งบประมาณจัดสรรรวมทั้งหมด</span>
        <span class="budget-val" style="color:#1d4ed8;">${totalAllocated}</span>
      </div>
      <div class="budget-row" style="background:#fef2f2;">
        <span class="budget-lbl">📤 งบประมาณเบิกจ่ายจริงทั้งหมด</span>
        <span class="budget-val" style="color:#dc2626;">${totalSpent}</span>
      </div>
      <div class="budget-row" style="background:#f0fdf4;">
        <span class="budget-lbl">🏦 งบประมาณคงเหลือสะสม</span>
        <span class="budget-val" style="color:#059669;">${totalRemaining}</span>
      </div>
    </div>
  </div>

  <!-- Section 2: สถานะโครงการ -->
  <div class="sec-title" style="margin-top:22px;">
    <span class="sec-num" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);">2</span>
    <span>📌 สถานะโครงการแยกตามประเภท</span>
  </div>
  <div class="kpi4">
    <div class="kpi-card" style="background:#f8fafc;border-color:#cbd5e1;">
      <div class="kpi-val" style="color:#475569;">${statusCounts.notStarted}</div>
      <div class="kpi-lbl" style="color:#64748b;">⬜ ยังไม่เริ่ม</div>
    </div>
    <div class="kpi-card" style="background:#eff6ff;border-color:#bfdbfe;">
      <div class="kpi-val" style="color:#2563eb;">${statusCounts.inProgress}</div>
      <div class="kpi-lbl" style="color:#1d4ed8;">🔵 กำลังดำเนินการ</div>
    </div>
    <div class="kpi-card" style="background:#fff7ed;border-color:#fed7aa;">
      <div class="kpi-val" style="color:#c2410c;">${statusCounts.delayed}</div>
      <div class="kpi-lbl" style="color:#9a3412;">🔴 ดำเนินการล่าช้า</div>
    </div>
    <div class="kpi-card" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="kpi-val" style="color:#059669;">${statusCounts.completed}</div>
      <div class="kpi-lbl" style="color:#065f46;">✅ เสร็จสิ้นแล้ว</div>
    </div>
  </div>

  <!-- Section 3: สถานะการส่งรายงาน -->
  <div class="sec-title" style="margin-top:22px;">
    <span class="sec-num" style="background:linear-gradient(135deg,#0891b2,#0ea5e9);">3</span>
    <span>📋 สรุปสถานะการส่งรายงานประจำรอบเดือน (${cycleLbl})</span>
  </div>
  <div class="status2">
    <div class="status-card" style="background:#f0fdf4;border-color:#86efac;">
      <div class="status-icon">✅</div>
      <div>
        <div class="status-count" style="color:#059669;">${reportedProjects.length}</div>
        <div class="status-lbl" style="color:#065f46;">โครงการส่งรายงานแล้ว</div>
      </div>
    </div>
    <div class="status-card" style="background:#fef2f2;border-color:#fca5a5;">
      <div class="status-icon">⚠️</div>
      <div>
        <div class="status-count" style="color:#dc2626;">${unreportedProjects.length}</div>
        <div class="status-lbl" style="color:#7f1d1d;">โครงการยังค้างส่งรายงาน</div>
      </div>
    </div>
  </div>
  ${unreportedList}

  <div class="page-foot">
    <span>TOAT Sandbox · Project Tracking &amp; Management System · ${cycleLbl}</span>
    <span>หน้า 2 / 3</span>
  </div>
</div>

<!-- ═════════════════════════════════════
     หน้า 3 — ตารางโครงการทั้งหมด
═════════════════════════════════════ -->
<div class="a4">
  <div class="sec-title">
    <span class="sec-num" style="background:linear-gradient(135deg,#0891b2,#0ea5e9);">4</span>
    <span>📑 ตารางสรุปรายชื่อและสถานะโครงการทั้งหมด</span>
  </div>
  <table class="report-table">
    <thead>
      <tr>
        <th style="width:26%;">ชื่อโครงการ</th>
        <th style="width:17%;">กลุ่มโครงการ</th>
        <th style="width:10%;">สถานะ</th>
        <th style="width:16%;min-width:110px;">ความคืบหน้า</th>
        <th style="width:12%;text-align:right;">งบจัดสรร</th>
        <th style="width:10%;text-align:right;">เบิกจ่าย</th>
        <th style="width:11%;text-align:center;">รายงาน</th>
      </tr>
    </thead>
    <tbody>
      ${projects.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:20px;color:#6b7280;font-style:italic;">ไม่มีข้อมูลโครงการในระบบ</td></tr>`
        : projectRows}
    </tbody>
  </table>

  <div style="margin-top:22px;">
    <div class="sec-title">
      <span class="sec-num" style="background:linear-gradient(135deg,#059669,#10b981);">5</span>
      <span>📁 รายละเอียดโครงการแยกตามกลุ่ม</span>
    </div>
    ${groupSections}
  </div>

  <div class="page-foot">
    <span>TOAT Sandbox · Project Tracking &amp; Management System · ${cycleLbl}</span>
    <span>หน้า 3 / 3</span>
  </div>
</div>

</div><!-- end page-wrap -->
</body>
</html>`;

    // Open in popup window
    const win = window.open('', '_blank', 'width=1100,height=820,scrollbars=yes,resizable=yes');
    if (!win) {
      alert('กรุณาอนุญาต Popup จากเบราว์เซอร์ก่อน แล้วลองใหม่อีกครั้ง');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // Close notifications dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.notiToggle.contains(e.target) && !elements.notiDropdown.contains(e.target)) {
      elements.notiDropdown.classList.add('hidden');
    }
  });

  // ----------------------------------------------------
  // 1. EXECUTIVE DASHBOARD DATA LOAD
  // ----------------------------------------------------
  async function loadDashboardData() {
    try {
      // 1. Load Metric rollups
      const stats = await API.projects.getStats();
      elements.kpiAllocated.textContent = formatTHB(stats.budget.total_allocated);
      elements.kpiSpent.textContent = formatTHB(stats.budget.total_spent);
      elements.kpiRemaining.textContent = formatTHB(stats.budget.total_remaining);

      // Status Counts
      elements.kpiStatusNotStarted.textContent = stats.status['Not Started'] || 0;
      elements.kpiStatusInProgress.textContent = stats.status['In Progress'] || 0;
      elements.kpiStatusDelayed.textContent = stats.status['Delayed'] || 0;
      elements.kpiStatusCompleted.textContent = stats.status['Completed'] || 0;

      // 2. Load Projects Progress Table
      let projects = await API.projects.list();
      projects = projects.filter(p => !p.is_hidden);
      state.projects = projects;
      state.lastStats = stats; // Save for report generator
      
      elements.dashboardProjectsBody.innerHTML = '';
      if (projects.length === 0) {
        elements.dashboardProjectsBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่พบโครงการในระบบ</td></tr>';
        
        // Clear summary report lists as well
        elements.listReportedProjects.innerHTML = '<li style="color: var(--text-muted);">ไม่มีโครงการ</li>';
        elements.listUnreportedProjects.innerHTML = '<li style="color: var(--text-muted);">ไม่มีโครงการค้างส่ง</li>';
        elements.countReportedLbl.textContent = '0';
        elements.countUnreportedLbl.textContent = '0';
        
        // Clear project groups
        elements.groupListSandbox.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">ไม่มีโครงการในกลุ่มนี้</div>';
        elements.groupListProposal.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">ไม่มีโครงการในกลุ่มนี้</div>';
        elements.groupListProduction.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">ไม่มีโครงการในกลุ่มนี้</div>';
        return;
      }

      projects.forEach(p => {
        const tr = document.createElement('tr');
        const progress = Math.round(p.overall_progress);
        const statusClass = p.status.toLowerCase().replace(' ', '-');

        tr.innerHTML = `
          <td><strong>${p.project_name}</strong></td>
          <td><span class="badge ${statusClass}">${p.status}</span></td>
          <td class="project-progress-col">
            <div class="progress-container">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: ${progress}%;"></div>
              </div>
              <span>${progress}%</span>
            </div>
          </td>
          <td>${formatTHB(p.total_allocated || 0)}</td>
          <td>${formatTHB(p.total_spent || 0)}</td>
          <td>
            <button class="btn btn-secondary btn-xs open-workspace-btn" data-id="${p.id}">
              <i class="fa-solid fa-square-poll-horizontal"></i> จัดการโครงการ
            </button>
          </td>
        `;
        elements.dashboardProjectsBody.appendChild(tr);
      });

      // Bind Workspace click triggers
      document.querySelectorAll('.open-workspace-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-id');
          state.activeProjectId = pid;
          showView('project-workspace');
        });
      });

      // 3. Compute overall progress average
      const avgProgress = projects.length > 0
        ? Math.round(projects.reduce((acc, p) => acc + (p.overall_progress || 0), 0) / projects.length)
        : 0;
      elements.chartCenterPercentage.textContent = avgProgress + '%';

      // 4. Update Doughnut Chart using Chart.js
      if (state.overallChart) {
        state.overallChart.destroy();
      }
      state.overallChart = new Chart(elements.overallProgressPieChart, {
        type: 'doughnut',
        data: {
          labels: ['ความคืบหน้าเฉลี่ย', 'ส่วนที่เหลือ'],
          datasets: [{
            data: [avgProgress, 100 - avgProgress],
            backgroundColor: ['#00d2ff', 'rgba(255, 255, 255, 0.1)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '80%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });

      // 5. Update Monthly Report Submission Status
      const now = new Date();
      let cycleYear = now.getFullYear();
      let cycleMonth = now.getMonth();
      if (cycleMonth === 0) {
        cycleMonth = 12;
        cycleYear -= 1;
      }
      const reportMonthYear = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`;
      elements.executiveSummaryCycleLbl.textContent = 'รอบรายงาน: ' + formatThaiMonthYear(reportMonthYear);

      const reportedProjects = [];
      const unreportedProjects = [];
      projects.forEach(p => {
        if (p.current_report_status) {
          reportedProjects.push(p);
        } else {
          unreportedProjects.push(p);
        }
      });

      // Render Reported
      elements.listReportedProjects.innerHTML = '';
      elements.countReportedLbl.textContent = reportedProjects.length;
      if (reportedProjects.length === 0) {
        elements.listReportedProjects.innerHTML = '<li style="color: var(--text-muted);">ไม่มีโครงการ</li>';
      } else {
        reportedProjects.forEach(p => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          li.style.alignItems = 'center';
          li.style.width = '100%';
          
          let statusText = p.current_report_status;
          let statusColor = 'var(--text-muted)';
          if (p.current_report_status === 'Approved') {
            statusText = 'อนุมัติแล้ว';
            statusColor = 'var(--success)';
          } else if (p.current_report_status === 'Pending') {
            statusText = 'รอตรวจทาน';
            statusColor = 'var(--warning)';
          } else if (p.current_report_status === 'Rejected') {
            statusText = 'ต้องแก้ไข';
            statusColor = 'var(--danger)';
          }

          li.innerHTML = `
            <span class="li-project-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;" title="${p.project_name}">
              <i class="fa-solid fa-circle-check" style="color: var(--success); margin-right: 5px;"></i> ${p.project_name}
            </span>
            <span style="font-size: 0.75rem; color: ${statusColor}; font-weight: bold; white-space: nowrap;">${statusText}</span>
          `;
          elements.listReportedProjects.appendChild(li);
        });
      }

      // Render Unreported
      elements.listUnreportedProjects.innerHTML = '';
      elements.countUnreportedLbl.textContent = unreportedProjects.length;
      if (unreportedProjects.length === 0) {
        elements.listUnreportedProjects.innerHTML = '<li style="color: var(--text-muted);">ไม่มีโครงการค้างส่ง</li>';
      } else {
        unreportedProjects.forEach(p => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          li.style.alignItems = 'center';
          li.style.width = '100%';

          li.innerHTML = `
            <span class="li-project-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%;" title="${p.project_name}">
              <i class="fa-solid fa-circle-xmark" style="color: var(--danger); margin-right: 5px;"></i> ${p.project_name}
            </span>
            <span class="li-project-pct" style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;">(ค้างส่ง)</span>
          `;
          elements.listUnreportedProjects.appendChild(li);
        });
      }

      // 6. Update Project Groups Lists (3 Rows)
      const sandboxProjects = projects.filter(p => p.project_group === 'โครงการ TOAT Sandbox');
      const proposalProjects = projects.filter(p => p.project_group === 'โครงการอยู่ระหว่างนำเสนอ');
      const productionProjects = projects.filter(p => p.project_group === 'โครงการเดิมที่ดำเนินงานจริง');

      function renderGroupList(container, list) {
        container.innerHTML = '';
        if (list.length === 0) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">ไม่มีโครงการในกลุ่มนี้</div>';
          return;
        }
        list.forEach(p => {
          const card = document.createElement('div');
          card.className = 'project-group-card glassmorphism';
          card.style.cssText = `
            padding: 0.75rem 1rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            min-width: 200px;
            flex-grow: 1;
            max-width: calc(33% - 0.5rem);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
          `;
          
          card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(255, 255, 255, 0.1)';
            card.style.transform = 'translateY(-2px)';
          });
          card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(255, 255, 255, 0.05)';
            card.style.transform = 'translateY(0)';
          });
          card.addEventListener('click', () => {
            state.activeProjectId = p.id;
            showView('project-workspace');
          });

          const progress = Math.round(p.overall_progress || 0);
          const logoHtml = p.logo_path 
            ? `<img src="${p.logo_path}" alt="Logo" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">`
            : `<div style="width: 24px; height: 24px; border-radius: 4px; background: rgba(37,99,235,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;"><i class="fa-solid fa-rocket"></i></div>`;

          card.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 0.4rem; min-width: 0;">
              ${logoHtml}
              <div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;" title="${p.project_name}">
                ${p.project_name}
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
              <span class="badge ${p.status.toLowerCase().replace(' ', '-')}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${p.status}</span>
              <span style="font-weight: bold; color: var(--primary);">${progress}%</span>
            </div>
            <div class="progress-track" style="height: 4px; margin-top: 0.4rem; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
              <div class="progress-fill" style="width: ${progress}%; height: 100%; background: var(--primary); border-radius: 2px;"></div>
            </div>
          `;
          container.appendChild(card);
        });
      }

      renderGroupList(elements.groupListSandbox, sandboxProjects);
      renderGroupList(elements.groupListProposal, proposalProjects);
      renderGroupList(elements.groupListProduction, productionProjects);

      // 7. Populate A4 print sheet
      const printCycleLbl = document.getElementById('print-report-cycle-lbl');
      if (printCycleLbl) printCycleLbl.textContent = 'รายงานประจำเดือน ' + formatThaiMonthYear(reportMonthYear);

      const printDateLbl = document.getElementById('print-report-date-lbl');
      if (printDateLbl) printDateLbl.textContent = 'ดาวน์โหลดเมื่อวันที่ ' + formatThaiDate(new Date());

      const printOverallProgressText = document.getElementById('print-overall-progress-text');
      if (printOverallProgressText) printOverallProgressText.textContent = avgProgress + '%';

      const printTotalAllocatedLbl = document.getElementById('print-total-allocated-lbl');
      if (printTotalAllocatedLbl) printTotalAllocatedLbl.textContent = formatTHB(stats.budget.total_allocated);

      const printTotalSpentLbl = document.getElementById('print-total-spent-lbl');
      if (printTotalSpentLbl) printTotalSpentLbl.textContent = formatTHB(stats.budget.total_spent);

      const printTotalRemainingLbl = document.getElementById('print-total-remaining-lbl');
      if (printTotalRemainingLbl) printTotalRemainingLbl.textContent = formatTHB(stats.budget.total_remaining);

      const printTotalProjectsCount = document.getElementById('print-total-projects-count');
      if (printTotalProjectsCount) printTotalProjectsCount.textContent = projects.length;

      // Print status table body
      const tableBody = document.getElementById('print-report-status-table-body');
      if (tableBody) {
        tableBody.innerHTML = '';
        projects.forEach(p => {
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid #ddd';
          
          let statusText = 'ยังไม่รายงาน';
          let statusColor = '#d93025'; // red
          if (p.current_report_status) {
            if (p.current_report_status === 'Approved') {
              statusText = 'อนุมัติแล้ว';
              statusColor = '#188038'; // green
            } else if (p.current_report_status === 'Pending') {
              statusText = 'รอตรวจทาน';
              statusColor = '#f2994a'; // orange
            } else if (p.current_report_status === 'Rejected') {
              statusText = 'ต้องแก้ไข';
              statusColor = '#d93025'; // red
            }
          }

          tr.innerHTML = `
            <td style="padding: 0.6rem; border: 1px solid #ddd; font-weight: bold;">${p.project_name}</td>
            <td style="padding: 0.6rem; border: 1px solid #ddd;">${p.project_group || 'โครงการ TOAT Sandbox'}</td>
            <td style="padding: 0.6rem; border: 1px solid #ddd; font-weight: bold; text-align: center;">${Math.round(p.overall_progress || 0)}%</td>
            <td style="padding: 0.6rem; border: 1px solid #ddd; font-weight: bold; color: ${statusColor};">${statusText}</td>
          `;
          tableBody.appendChild(tr);
        });
      }

      // Print grouped projects detail
      const groupedContainer = document.getElementById('print-grouped-projects-container');
      if (groupedContainer) {
        groupedContainer.innerHTML = '';
        const groups = [
          { name: 'โครงการ TOAT Sandbox', list: sandboxProjects, color: '#1a73e8' },
          { name: 'โครงการอยู่ระหว่างนำเสนอ', list: proposalProjects, color: '#f2994a' },
          { name: 'โครงการเดิมที่ดำเนินงานจริง', list: productionProjects, color: '#188038' }
        ];
        groups.forEach(g => {
          const gDiv = document.createElement('div');
          gDiv.style.marginBottom = '1rem';
          gDiv.innerHTML = `
            <h3 style="font-size: 1.05rem; color: ${g.color}; border-bottom: 1px solid ${g.color}; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">${g.name} (${g.list.length} โครงการ)</h3>
          `;
          if (g.list.length === 0) {
            gDiv.innerHTML += `<p style="font-size: 0.85rem; color: #777; font-style: italic; margin: 0.25rem 0;">ไม่มีโครงการในกลุ่มนี้</p>`;
          } else {
            const ul = document.createElement('ul');
            ul.style.paddingLeft = '1.2rem';
            ul.style.margin = '0';
            g.list.forEach(p => {
              const li = document.createElement('li');
              li.style.fontSize = '0.85rem';
              li.style.marginBottom = '0.3rem';
              li.innerHTML = `<strong>${p.project_name}</strong> - ความคืบหน้า: <strong>${Math.round(p.overall_progress || 0)}%</strong>, งบจัดสรร: ${formatTHB(p.total_allocated || 0)}, ใช้ไป: ${formatTHB(p.total_spent || 0)}`;
              ul.appendChild(li);
            });
            gDiv.appendChild(ul);
          }
          groupedContainer.appendChild(gDiv);
        });
      }

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดแดชบอร์ด: ' + err.message);
    }
  }

  // ----------------------------------------------------
  // 2. PROJECTS LIST VIEW
  // ----------------------------------------------------
  async function loadProjectsListData() {
    try {
      const projects = await API.projects.list();
      elements.projectCardsContainer.innerHTML = '';

      const showHidden = elements.showHiddenProjectsChk ? elements.showHiddenProjectsChk.checked : false;
      const filteredProjects = projects.filter(p => showHidden || !p.is_hidden);

      if (filteredProjects.length === 0) {
        elements.projectCardsContainer.innerHTML = '<div class="text-center" style="grid-column: 1/-1;">ไม่มีข้อมูลโครงการ</div>';
        return;
      }

      filteredProjects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card glassmorphism' + (p.is_hidden ? ' is-hidden' : '');
        const progress = Math.round(p.overall_progress);
        
        let statusBadgeText = p.status;
        let statusClass = p.status.toLowerCase().replace(' ', '-');
        if (p.is_suspended) {
          statusBadgeText = 'พักการดำเนินการ';
          statusClass = 'suspended';
        } else {
          const statusTrans = { 'Not Started': 'ยังไม่เริ่ม', 'In Progress': 'กำลังดำเนินการ', 'Delayed': 'ล่าช้า', 'Completed': 'เสร็จสิ้น' };
          statusBadgeText = statusTrans[p.status] || p.status;
        }

        const canManage = p.can_edit === 1 || state.currentUser.role === 'Admin';
        const isAdmin = state.currentUser.role === 'Admin';

        const logoHtml = p.logo_path 
          ? `<img src="${p.logo_path}" alt="Logo" class="project-card-logo" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-card); flex-shrink: 0;">`
          : `<div class="project-card-logo-placeholder" style="width: 48px; height: 48px; border-radius: 8px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; border: 1px solid var(--border-card); flex-shrink: 0;"><i class="fa-solid fa-rocket"></i></div>`;

        card.innerHTML = `
          <div class="project-card-header">
            <div style="display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0;">
              ${logoHtml}
              <div style="min-width: 0; flex: 1;">
                <h3 style="margin: 0; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.project_name}">${p.project_name}</h3>
                <div style="display:flex; gap:0.25rem; margin-top:0.25rem; flex-wrap:wrap;">
                  <span class="badge ${statusClass}">${statusBadgeText}</span>
                  ${p.is_hidden ? `<span class="badge hidden-status"><i class="fa-solid fa-eye-slash"></i> ซ่อนอยู่</span>` : ''}
                </div>
              </div>
            </div>
            ${canManage ? `
              <div class="project-card-actions">
                <button class="btn-icon edit-proj-btn" data-id="${p.id}" title="แก้ไขโครงการ"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-icon suspend-proj-btn ${p.is_suspended ? 'active' : ''}" data-id="${p.id}" title="${p.is_suspended ? 'เปิดดำเนินการต่อ' : 'พักการดำเนินการ'}">
                  <i class="fa-solid ${p.is_suspended ? 'fa-play' : 'fa-pause'}"></i>
                </button>
                <button class="btn-icon hide-proj-btn ${p.is_hidden ? 'active' : ''}" data-id="${p.id}" title="${p.is_hidden ? 'แสดงโครงการ' : 'ปิดตา/ซ่อนโครงการ'}">
                  <i class="fa-solid ${p.is_hidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
                ${isAdmin ? `
                  <button class="btn-icon delete-proj-btn" data-id="${p.id}" title="ลบโครงการ"><i class="fa-solid fa-trash-can"></i></button>
                ` : ''}
              </div>
            ` : ''}
          </div>
          <p class="project-card-desc">${p.description || 'ไม่มีคำอธิบายโครงการ'}</p>
          
          <div style="margin-bottom: 1rem;">
            <div class="progress-info" style="font-size: 0.75rem;">
              <span>ความคืบหน้า</span>
              <span>${progress}%</span>
            </div>
            <div class="progress-track" style="height: 6px;">
              <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
          </div>

          <div class="project-card-footer">
            <div class="project-card-budget">
              <span>งบจัดสรร</span>
              <strong>${formatTHB(p.total_allocated || 0)}</strong>
            </div>
            <button class="btn btn-primary btn-sm open-workspace-btn" data-id="${p.id}">
              เข้าทำงาน <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        `;
        elements.projectCardsContainer.appendChild(card);
      });

      // Bind click triggers
      document.querySelectorAll('.project-card .open-workspace-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-id');
          state.activeProjectId = pid;
          showView('project-workspace');
        });
      });

      // Bind edit triggers
      document.querySelectorAll('.project-card .edit-proj-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const pid = btn.getAttribute('data-id');
          try {
            const p = await API.projects.get(pid);
            document.getElementById('edit-project-id').value = p.id;
            document.getElementById('proj-name-input').value = p.project_name;
            document.getElementById('proj-desc-input').value = p.description || '';
            document.getElementById('proj-objectives-input').value = p.objectives || '';
            document.getElementById('proj-scope-input').value = p.scope || '';
            document.getElementById('proj-targets-input').value = p.targets || '';
            document.getElementById('proj-strategic-input').value = p.strategic_alignment || '';
            document.getElementById('proj-values-input').value = p.values_alignment || '';
            document.getElementById('proj-status-input').value = p.status;
            document.getElementById('proj-group-input').value = p.project_group || 'โครงการ TOAT Sandbox';
            document.getElementById('proj-logo-input').value = ''; // Reset file input
            elements.modalCreateProject.showModal();
          } catch (err) {
            alert('ไม่สามารถโหลดข้อมูลโครงการได้: ' + err.message);
          }
        });
      });

      // Bind suspend triggers
      document.querySelectorAll('.project-card .suspend-proj-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const pid = btn.getAttribute('data-id');
          try {
            await API.projects.toggleSuspend(pid);
            loadProjectsListData();
          } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
          }
        });
      });

      // Bind hide triggers
      document.querySelectorAll('.project-card .hide-proj-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const pid = btn.getAttribute('data-id');
          try {
            await API.projects.toggleHide(pid);
            loadProjectsListData();
          } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
          }
        });
      });

      // Bind delete triggers
      document.querySelectorAll('.project-card .delete-proj-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const pid = btn.getAttribute('data-id');
          if (confirm('คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การลบโครงการจะลบข้อมูลที่เกี่ยวข้องทั้งหมด เช่น สมาชิก งบประมาณ และแผนงาน Gantt')) {
            try {
              await API.projects.delete(pid);
              alert('ลบโครงการเรียบร้อยแล้ว');
              loadProjectsListData();
              if (state.currentUser.role === 'Admin') {
                loadAdminPanelData();
              }
            } catch (err) {
              alert('เกิดข้อผิดพลาด: ' + err.message);
            }
          }
        });
      });

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดรายการโครงการ: ' + err.message);
    }
  }

  // Bind change event to showHiddenProjectsChk if it exists
  if (elements.showHiddenProjectsChk) {
    elements.showHiddenProjectsChk.addEventListener('change', () => {
      loadProjectsListData();
    });
  }

  // Create Project Modal controls
  elements.openCreateProjectModalBtn.addEventListener('click', () => {
    elements.formCreateProject.reset();
    document.getElementById('edit-project-id').value = '';
    elements.modalCreateProject.showModal();
  });

  elements.adminCreateProjectBtn.addEventListener('click', () => {
    elements.formCreateProject.reset();
    document.getElementById('edit-project-id').value = '';
    elements.modalCreateProject.showModal();
  });

  elements.wsEditProjectBtn.addEventListener('click', async () => {
    const pid = state.activeProjectId;
    if (!pid) return;

    try {
      const p = await API.projects.get(pid);
      document.getElementById('edit-project-id').value = p.id;
      document.getElementById('proj-name-input').value = p.project_name;
      document.getElementById('proj-desc-input').value = p.description || '';
      document.getElementById('proj-objectives-input').value = p.objectives || '';
      document.getElementById('proj-scope-input').value = p.scope || '';
      document.getElementById('proj-targets-input').value = p.targets || '';
      document.getElementById('proj-strategic-input').value = p.strategic_alignment || '';
      document.getElementById('proj-values-input').value = p.values_alignment || '';
      document.getElementById('proj-status-input').value = p.status;
      document.getElementById('proj-group-input').value = p.project_group || 'โครงการ TOAT Sandbox';
      document.getElementById('proj-logo-input').value = ''; // Reset file input
      
      elements.modalCreateProject.showModal();
    } catch (err) {
      alert('ไม่สามารถโหลดข้อมูลโครงการได้: ' + err.message);
    }
  });

  elements.formCreateProject.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = document.getElementById('edit-project-id').value;
    const name = document.getElementById('proj-name-input').value;
    const desc = document.getElementById('proj-desc-input').value;
    const objectives = document.getElementById('proj-objectives-input').value;
    const scope = document.getElementById('proj-scope-input').value;
    const targets = document.getElementById('proj-targets-input').value;
    const strategic = document.getElementById('proj-strategic-input').value;
    const values = document.getElementById('proj-values-input').value;
    const status = document.getElementById('proj-status-input').value;
    const project_group = document.getElementById('proj-group-input').value;
    const logoFile = document.getElementById('proj-logo-input').files[0];

    const formData = new FormData();
    formData.append('project_name', name);
    formData.append('description', desc);
    formData.append('objectives', objectives);
    formData.append('scope', scope);
    formData.append('targets', targets);
    formData.append('strategic_alignment', strategic);
    formData.append('values_alignment', values);
    formData.append('status', status);
    formData.append('project_group', project_group);
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      if (pid) {
        await API.projects.update(pid, formData);
        alert('อัปเดตข้อมูลโครงการสำเร็จแล้ว');
        if (state.activeProjectId == pid) {
          loadWorkspaceData();
        }
      } else {
        await API.projects.create(formData);
        alert('สร้างโครงการใหม่สำเร็จแล้ว');
      }
      elements.modalCreateProject.close();
      loadProjectsListData();
      if (state.currentUser.role === 'Admin') {
        loadAdminPanelData();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  });

  // ----------------------------------------------------
  // 3. PROJECT WORKSPACE VIEW
  // ----------------------------------------------------

  // Workspace internal tabs handler
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const paneId = btn.getAttribute('data-tab');
      document.getElementById(paneId).classList.add('active');
    });
  });

  async function loadWorkspaceData() {
    const pid = state.activeProjectId;
    if (!pid) return;

    try {
      // 1. Get Project Detail
      const p = await API.projects.get(pid);
      elements.wsProjectName.textContent = p.project_name;
      
      // Update logo display
      const wsLogo = document.getElementById('ws-project-logo');
      const wsLogoPlaceholder = document.getElementById('ws-project-logo-placeholder');
      if (wsLogo && wsLogoPlaceholder) {
        if (p.logo_path) {
          wsLogo.src = p.logo_path;
          wsLogo.classList.remove('hidden');
          wsLogoPlaceholder.classList.add('hidden');
        } else {
          wsLogo.classList.add('hidden');
          wsLogoPlaceholder.classList.remove('hidden');
        }
      }

      // Update group badge
      const wsGroupBadge = document.getElementById('ws-project-group-badge');
      if (wsGroupBadge) {
        wsGroupBadge.textContent = p.project_group || 'โครงการ TOAT Sandbox';
      }

      // Update 6 details fields
      const descEl = document.getElementById('ws-project-desc');
      const objEl = document.getElementById('ws-project-objectives');
      const scopeEl = document.getElementById('ws-project-scope');
      const targetsEl = document.getElementById('ws-project-targets');
      const strategicEl = document.getElementById('ws-project-strategic');
      const valuesEl = document.getElementById('ws-project-values');

      if (descEl) descEl.textContent = p.description || 'ไม่มีรายละเอียดโครงการ';
      if (objEl) objEl.textContent = p.objectives || 'ไม่มีข้อมูลวัตถุประสงค์';
      if (scopeEl) scopeEl.textContent = p.scope || 'ไม่มีข้อมูลขอบเขต';
      if (targetsEl) targetsEl.textContent = p.targets || 'ไม่มีข้อมูลเป้าหมาย';
      if (strategicEl) strategicEl.textContent = p.strategic_alignment || 'ไม่มีข้อมูลยุทธศาสตร์องค์กร';
      if (valuesEl) valuesEl.textContent = p.values_alignment || 'ไม่มีข้อมูลค่านิยม TOAT';
      
      const statusClass = p.status.toLowerCase().replace(' ', '-');
      elements.wsProjectStatus.className = `workspace-project-status badge ${statusClass}`;
      elements.wsProjectStatus.textContent = p.status;

      const progress = Math.round(p.overall_progress);
      elements.wsOverallProgressText.textContent = `${progress}%`;
      elements.wsOverallProgressFill.style.width = `${progress}%`;

      // Role restrictions inside workspace: check can_edit returned from server
      state.canEditActiveProject = (p.can_edit === 1);
      const canEdit = state.canEditActiveProject;

      if (!canEdit) {
        elements.wsEditProjectBtn.classList.add('hidden');
        elements.addMemberBtn.classList.add('hidden');
        elements.addStakeholderBtn.classList.add('hidden');
        elements.addBudgetItemBtn.classList.add('hidden');
        elements.addGanttTaskBtn.classList.add('hidden');
        elements.createMonthlyReportBtn.classList.add('hidden');
      } else {
        elements.wsEditProjectBtn.classList.remove('hidden');
        elements.addMemberBtn.classList.remove('hidden');
        elements.addStakeholderBtn.classList.remove('hidden');
        elements.addBudgetItemBtn.classList.remove('hidden');
        elements.addGanttTaskBtn.classList.remove('hidden');
        elements.createMonthlyReportBtn.classList.remove('hidden');
      }

      // Load individual tab details
      loadTeamTab(pid);
      loadBudgetTab(pid);
      loadGanttTab(pid);
      loadReportsTab(pid);

    } catch (err) {
      alert('ไม่สามารถเปิดพื้นที่ทำงานได้: ' + err.message);
      showView('dashboard');
    }
  }

  // --- TAB 1: TEAM ---
  async function loadTeamTab(pid) {
    try {
      const canEdit = state.canEditActiveProject;
      
      // Members
      const members = await API.members.list(pid);
      elements.wsMembersTableBody.innerHTML = '';
      if (members.length === 0) {
        elements.wsMembersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">ยังไม่มีข้อมูลสมาชิกในทีม</td></tr>';
      } else {
        members.forEach(m => {
          const tr = document.createElement('tr');
          const photoTd = m.photo_path 
            ? `<td><img src="${m.photo_path}" class="member-avatar-img" alt="${m.full_name}"></td>`
            : `<td><div class="member-avatar-placeholder"><i class="fa-solid fa-user"></i></div></td>`;
          tr.innerHTML = `
            ${photoTd}
            <td>${m.employee_id || '-'}</td>
            <td>${m.full_name}</td>
            <td>${m.position}</td>
            <td>${m.division || '-'}</td>
            <td>${m.department || '-'}</td>
            <td>
              ${canEdit ? `
                <div style="display:flex; gap:0.25rem;">
                  <button class="btn btn-warning btn-xs edit-member-btn" data-id="${m.id}" data-empid="${m.employee_id || ''}" data-name="${m.full_name}" data-nickname="${m.nickname || ''}" data-position="${m.position || ''}" data-division="${m.division || ''}" data-dept="${m.department || ''}">แก้ไข</button>
                  <button class="btn btn-danger btn-xs rm-member-btn" data-id="${m.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              ` : '-'}
            </td>
          `;
          elements.wsMembersTableBody.appendChild(tr);
        });
      }

      // Stakeholders
      const stakeholders = await API.stakeholders.list(pid);
      elements.wsStakeholdersTableBody.innerHTML = '';
      if (stakeholders.length === 0) {
        elements.wsStakeholdersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">ยังไม่มีข้อมูลผู้เกี่ยวข้อง</td></tr>';
      } else {
        stakeholders.forEach(s => {
          const tr = document.createElement('tr');
          const isSponsor = s.type === 'Sponsor' || s.type === 'สปอนเซอร์โครงการ' || (s.type && s.type.toLowerCase() === 'sponsor');
          const typeBadge = isSponsor ? 'approved' : 'in-progress';
          const typeText = isSponsor ? 'สปอนเซอร์โครงการ' : 'ที่ปรึกษาโครงการ';
          tr.innerHTML = `
            <td>${s.employee_id || '-'}</td>
            <td>${s.full_name}</td>
            <td>${s.position || '-'}</td>
            <td>${s.division || '-'}</td>
            <td>${s.department || '-'}</td>
            <td><span class="badge ${typeBadge}">${typeText}</span></td>
            <td>
              ${canEdit ? `
                <div style="display:flex; gap:0.25rem;">
                  <button class="btn btn-warning btn-xs edit-stakeholder-btn" data-id="${s.id}" data-empid="${s.employee_id || ''}" data-name="${s.full_name}" data-position="${s.position || ''}" data-division="${s.division || ''}" data-dept="${s.department || ''}" data-type="${s.type}">แก้ไข</button>
                  <button class="btn btn-danger btn-xs rm-stakeholder-btn" data-id="${s.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              ` : '-'}
            </td>
          `;
          elements.wsStakeholdersTableBody.appendChild(tr);
        });
      }

      // Bind Team remove & edit events
      if (canEdit) {
        document.querySelectorAll('.edit-member-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.getElementById('edit-member-id').value = btn.getAttribute('data-id');
            document.getElementById('mem-empid-input').value = btn.getAttribute('data-empid');
            document.getElementById('mem-name-input').value = btn.getAttribute('data-name');
            document.getElementById('mem-position-input').value = btn.getAttribute('data-position');
            document.getElementById('mem-division-input').value = btn.getAttribute('data-division');
            document.getElementById('mem-dept-input').value = btn.getAttribute('data-dept');
            document.getElementById('mem-photo-input').value = '';
            elements.modalAddMember.showModal();
          });
        });

        document.querySelectorAll('.rm-member-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('คุณต้องการลบรายชื่อสมาชิกท่านนี้หรือไม่?')) {
              await API.members.delete(pid, btn.getAttribute('data-id'));
              loadTeamTab(pid);
            }
          });
        });

        document.querySelectorAll('.edit-stakeholder-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.getElementById('edit-stakeholder-id').value = btn.getAttribute('data-id');
            document.getElementById('stk-empid-input').value = btn.getAttribute('data-empid');
            document.getElementById('stk-name-input').value = btn.getAttribute('data-name');
            document.getElementById('stk-position-input').value = btn.getAttribute('data-position');
            document.getElementById('stk-division-input').value = btn.getAttribute('data-division');
            document.getElementById('stk-dept-input').value = btn.getAttribute('data-dept');
            let typeVal = btn.getAttribute('data-type') || '';
            if (typeVal === 'สปอนเซอร์โครงการ' || typeVal.toLowerCase() === 'sponsor') {
              typeVal = 'Sponsor';
            } else if (typeVal === 'ที่ปรึกษาโครงการ' || typeVal.toLowerCase() === 'advisor') {
              typeVal = 'Advisor';
            }
            document.getElementById('stk-type-input').value = typeVal;
            elements.modalAddStakeholder.showModal();
          });
        });

        document.querySelectorAll('.rm-stakeholder-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('คุณต้องการลบรายชื่อผู้มีส่วนเกี่ยวข้องท่านนี้หรือไม่?')) {
              await API.stakeholders.delete(pid, btn.getAttribute('data-id'));
              loadTeamTab(pid);
            }
          });
        });
      }

    } catch (err) {
      console.error(err);
    }
  }

  // --- TAB 2: BUDGETS ---
  async function loadBudgetTab(pid) {
    try {
      const canEdit = state.canEditActiveProject;
      const budgetData = await API.budgets.list(pid);
      
      // Rollups
      elements.wsBudgetAllocated.textContent = formatTHB(budgetData.rollups.total_allocated);
      elements.wsBudgetSpent.textContent = formatTHB(budgetData.rollups.total_spent);
      elements.wsBudgetRemaining.textContent = formatTHB(budgetData.rollups.total_remaining);

      // Remaining Color tuning
      if (budgetData.rollups.total_remaining < 0) {
        elements.wsBudgetRemaining.className = 'text-danger';
      } else {
        elements.wsBudgetRemaining.className = 'text-success';
      }

      elements.wsBudgetTableBody.innerHTML = '';
      if (budgetData.items.length === 0) {
        elements.wsBudgetTableBody.innerHTML = '<tr><td colspan="12" class="text-center">ยังไม่มีบันทึกข้อมูลด้านงบประมาณรายจ่าย</td></tr>';
      } else {
        budgetData.items.forEach(b => {
          const tr = document.createElement('tr');
          const remaining = b.remaining_amount;
          const remainingClass = remaining < 0 ? 'text-danger font-weight-700' : 'text-success';
          const remainingPct = b.allocated_amount > 0 ? ((remaining / b.allocated_amount) * 100).toFixed(1) : '0.0';
          const pctClass = parseFloat(remainingPct) < 0 ? 'text-danger' : parseFloat(remainingPct) < 20 ? 'text-warning' : 'text-success';

          // Budget type badge color
          const budgetTypeColors = {
            'งบลงทุน': '#6366f1',
            'งบค่าใช้สอย': '#0ea5e9',
            'งบปฏิบัติการพิเศษ': '#f59e0b',
            'อื่นๆ': '#8b5cf6'
          };
          const typeColor = budgetTypeColors[b.budget_type] || '#64748b';
          const typeLabel = (b.budget_type === 'อื่นๆ' && b.budget_type_other) ? `อื่นๆ: ${b.budget_type_other}` : (b.budget_type || '-');

          tr.innerHTML = `
            <td>
              <div style="font-weight:600; color: var(--text-primary);">${b.item_name}</div>
              ${b.detail ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${b.detail}</div>` : ''}
            </td>
            <td><span style="background:${typeColor}22; color:${typeColor}; padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:600; white-space:nowrap;">${typeLabel}</span></td>
            <td style="font-size:0.8rem; color:var(--text-secondary);">${b.owner_unit || '<span class="text-muted">-</span>'}</td>
            <td style="text-align:right; font-weight:600;">${formatTHB(b.allocated_amount)}</td>
            <td style="text-align:right; color:var(--danger);">${formatTHB(b.spent_amount)}</td>
            <td style="text-align:right;" class="${remainingClass}">${formatTHB(remaining)}</td>
            <td style="text-align:center;" class="${pctClass}"><strong>${remainingPct}%</strong></td>
            <td style="text-align:center;">
              ${b.approval_document 
                ? `<a href="${b.approval_document}" target="_blank" class="btn btn-secondary btn-xs"><i class="fa-solid fa-file-signature"></i> ดู</a>` 
                : '<span style="font-size:0.72rem; color:var(--text-muted);">ไม่มี</span>'}
            </td>
            <td style="text-align:center; font-size:0.8rem;">${b.payment_type || '-'}</td>
            <td style="text-align:center;">
              ${b.payment_evidence 
                ? `<a href="${b.payment_evidence}" target="_blank" class="btn btn-secondary btn-xs"><i class="fa-solid fa-receipt"></i> ดู</a>` 
                : '<span style="font-size:0.72rem; color:var(--text-muted);">ไม่มี</span>'}
            </td>
            <td style="font-size:0.78rem; color:var(--text-secondary); max-width:130px; word-break:break-word;">${b.remarks || '-'}</td>
            <td style="text-align:center;">
              ${canEdit ? `
                <div style="display:flex; gap:0.25rem; justify-content:center;">
                  <button class="btn btn-warning btn-xs edit-budget-btn" 
                    data-id="${b.id}" 
                    data-name="${encodeURIComponent(b.item_name)}" 
                    data-detail="${encodeURIComponent(b.detail||'')}"
                    data-budget-type="${encodeURIComponent(b.budget_type||'งบลงทุน')}"
                    data-budget-type-other="${encodeURIComponent(b.budget_type_other||'')}"
                    data-owner="${encodeURIComponent(b.owner_unit||'')}"
                    data-allocated="${b.allocated_amount}" 
                    data-spent="${b.spent_amount}"
                    data-payment-type="${encodeURIComponent(b.payment_type||'รายครั้ง (ครั้งเดียว)')}"
                    data-remarks="${encodeURIComponent(b.remarks||'')}"
                    data-approval="${b.approval_document||''}"
                    data-invoice="${b.payment_evidence||''}">แก้ไข</button>
                  <button class="btn btn-danger btn-xs rm-budget-btn" data-id="${b.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              ` : '-'}
            </td>
          `;
          elements.wsBudgetTableBody.appendChild(tr);
        });

        // Bind edits & deletes
        if (canEdit) {
          document.querySelectorAll('.edit-budget-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              document.getElementById('edit-budget-id').value = btn.getAttribute('data-id');
              document.getElementById('bud-name-input').value = decodeURIComponent(btn.getAttribute('data-name'));
              document.getElementById('bud-detail-input').value = decodeURIComponent(btn.getAttribute('data-detail'));
              document.getElementById('bud-type-input').value = decodeURIComponent(btn.getAttribute('data-budget-type'));
              document.getElementById('bud-type-other-input').value = decodeURIComponent(btn.getAttribute('data-budget-type-other'));
              document.getElementById('bud-owner-input').value = decodeURIComponent(btn.getAttribute('data-owner'));
              document.getElementById('bud-allocated-input').value = btn.getAttribute('data-allocated');
              document.getElementById('bud-spent-input').value = btn.getAttribute('data-spent');
              // Safely set payment type (handle legacy values from old data)
              const paymentTypeVal = decodeURIComponent(btn.getAttribute('data-payment-type'));
              const paymentTypeSelect = document.getElementById('bud-payment-type-input');
              const validPaymentTypes = Array.from(paymentTypeSelect.options).map(o => o.value);
              paymentTypeSelect.value = validPaymentTypes.includes(paymentTypeVal) ? paymentTypeVal : 'รายครั้ง (ครั้งเดียว)';
              document.getElementById('bud-remarks-input').value = decodeURIComponent(btn.getAttribute('data-remarks'));
              document.getElementById('bud-invoice-input').value = '';
              document.getElementById('bud-approval-doc-input').value = '';

              // Show existing file info
              const invUrl = btn.getAttribute('data-invoice');
              const approvalUrl = btn.getAttribute('data-approval');
              document.getElementById('bud-invoice-display').innerHTML = invUrl 
                ? `<a href="${invUrl}" target="_blank" style="color:var(--primary)">📎 ดูไฟล์หลักฐานเดิม</a> (อัปโหลดใหม่เพื่อแทนที่)`
                : '';
              document.getElementById('bud-approval-doc-display').innerHTML = approvalUrl 
                ? `<a href="${approvalUrl}" target="_blank" style="color:var(--primary)">📎 ดูเอกสารอนุมัติเดิม</a> (อัปโหลดใหม่เพื่อแทนที่)`
                : '';

              // Toggle other field visibility
              const typeSelect = document.getElementById('bud-type-input');
              const otherGroup = document.getElementById('bud-type-other-group');
              otherGroup.style.display = typeSelect.value === 'อื่นๆ' ? 'block' : 'none';

              // Update remaining display
              updateBudgetRemainingDisplay();
              elements.modalAddBudget.showModal();
            });
          });

          document.querySelectorAll('.rm-budget-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (confirm('คุณต้องการลบรายการงบประมาณรายจ่ายรายการนี้หรือไม่?')) {
                await API.budgets.delete(pid, btn.getAttribute('data-id'));
                loadBudgetTab(pid);
                loadWorkspaceData();
              }
            });
          });
        }
      }

    } catch (err) {
      console.error(err);
    }
  }

  // Helper: Update remaining display in budget modal
  function updateBudgetRemainingDisplay() {
    const allocated = parseFloat(document.getElementById('bud-allocated-input').value) || 0;
    const spent = parseFloat(document.getElementById('bud-spent-input').value) || 0;
    const remaining = allocated - spent;
    const pct = allocated > 0 ? ((remaining / allocated) * 100).toFixed(1) : '0.0';
    const display = document.getElementById('bud-remaining-display');
    if (!display) return;
    display.textContent = `${formatTHB(remaining)} (${pct}%)`;
    display.style.color = remaining < 0 ? 'var(--danger)' : 'var(--success)';
  }

  // Budget type toggle (show/hide "other" field)
  document.getElementById('bud-type-input').addEventListener('change', function() {
    const otherGroup = document.getElementById('bud-type-other-group');
    otherGroup.style.display = this.value === 'อื่นๆ' ? 'block' : 'none';
  });
  // Init visibility
  document.getElementById('bud-type-other-group').style.display = 'none';

  // Budget Modal trigger
  elements.addBudgetItemBtn.addEventListener('click', () => {
    elements.formAddBudget.reset();
    document.getElementById('edit-budget-id').value = '';
    document.getElementById('bud-invoice-display').innerHTML = '';
    document.getElementById('bud-approval-doc-display').innerHTML = '';
    document.getElementById('bud-type-other-group').style.display = 'none';
    document.getElementById('bud-remaining-display').textContent = '฿0.00 (0%)';
    document.getElementById('bud-remaining-display').style.color = '';
    elements.modalAddBudget.showModal();
  });

  // Live remaining calculation in modal
  ['bud-allocated-input', 'bud-spent-input'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateBudgetRemainingDisplay);
  });

  elements.formAddBudget.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = state.activeProjectId;
    const bid = document.getElementById('edit-budget-id').value;
    const formData = new FormData(elements.formAddBudget);

    try {
      if (bid) {
        await API.budgets.update(pid, bid, formData);
        alert('อัปเดตรายการงบประมาณสำเร็จแล้ว');
      } else {
        await API.budgets.add(pid, formData);
        alert('เพิ่มรายการงบประมาณสำเร็จแล้ว');
      }
      elements.modalAddBudget.close();
      loadBudgetTab(pid);
      loadWorkspaceData(); // Refresh summary values
    } catch (err) {
      alert(err.message);
    }
  });

  // Team Member Add & Edit Modal triggers & submit
  elements.addMemberBtn.addEventListener('click', () => {
    elements.formAddMember.reset();
    document.getElementById('edit-member-id').value = '';
    elements.modalAddMember.showModal();
  });

  elements.formAddMember.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = state.activeProjectId;
    const mid = document.getElementById('edit-member-id').value;
    
    const formData = new FormData();
    formData.append('employee_id', document.getElementById('mem-empid-input').value);
    formData.append('full_name', document.getElementById('mem-name-input').value);
    formData.append('position', document.getElementById('mem-position-input').value);
    formData.append('division', document.getElementById('mem-division-input').value);
    formData.append('department', document.getElementById('mem-dept-input').value);
    
    const photoInput = document.getElementById('mem-photo-input');
    if (photoInput.files[0]) {
      formData.append('photo', photoInput.files[0]);
    }

    try {
      if (mid) {
        await API.members.update(pid, mid, formData);
        alert('อัปเดตข้อมูลสมาชิกทีมงานสำเร็จแล้ว');
      } else {
        await API.members.add(pid, formData);
        alert('เพิ่มสมาชิกทีมงานสำเร็จแล้ว');
      }
      elements.modalAddMember.close();
      loadTeamTab(pid);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  });

  // Stakeholder Add & Edit Modal triggers & submit
  elements.addStakeholderBtn.addEventListener('click', () => {
    elements.formAddStakeholder.reset();
    document.getElementById('edit-stakeholder-id').value = '';
    elements.modalAddStakeholder.showModal();
  });

  elements.formAddStakeholder.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = state.activeProjectId;
    const sid = document.getElementById('edit-stakeholder-id').value;
    
    const stakeholderData = {
      employee_id: document.getElementById('stk-empid-input').value,
      full_name: document.getElementById('stk-name-input').value,
      position: document.getElementById('stk-position-input').value,
      division: document.getElementById('stk-division-input').value,
      department: document.getElementById('stk-dept-input').value,
      type: document.getElementById('stk-type-input').value
    };

    try {
      if (sid) {
        await API.stakeholders.update(pid, sid, stakeholderData);
        alert('อัปเดตข้อมูลผู้มีส่วนเกี่ยวข้องสำเร็จแล้ว');
      } else {
        await API.stakeholders.add(pid, stakeholderData);
        alert('เพิ่มผู้มีส่วนเกี่ยวข้องสำเร็จแล้ว');
      }
      elements.modalAddStakeholder.close();
      loadTeamTab(pid);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  });

  // --- TAB 3: GANTT CHART & TIMELINE ---
  async function loadGanttTab(pid) {
    try {
      const canEdit = state.canEditActiveProject;
      const tasks = await API.gantt.list(pid);
      state.tasks = tasks;

      // Populate datalist for main task autocomplete
      const datalist = document.getElementById('gantt-main-tasks-list');
      if (datalist) {
        datalist.innerHTML = '';
        const uniqueMains = [...new Set(tasks.map(tk => tk.main_task))].filter(Boolean);
        uniqueMains.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          datalist.appendChild(opt);
        });
      }

      // 1. Draw Gantt Chart Visual Timeline
      renderGanttChartVisual(tasks);

      // 2. Draw Gantt Tasks Table
      elements.wsGanttTableBody.innerHTML = '';
      if (tasks.length === 0) {
        elements.wsGanttTableBody.innerHTML = '<tr><td colspan="9" class="text-center">ยังไม่มีแผนดำเนินงานสำหรับโครงการนี้</td></tr>';
      } else {
        // Group tasks by main_task
        const groups = {};
        tasks.forEach(t => {
          if (!groups[t.main_task]) {
            groups[t.main_task] = [];
          }
          groups[t.main_task].push(t);
        });

        // Loop through groups
        Object.keys(groups).forEach(mainTaskName => {
          const groupTasks = groups[mainTaskName];

          // Compute summary info
          let minStart = null;
          let maxEnd = null;
          let totalProgress = 0;
          let subTaskCount = 0;
          let maxLastUpdated = null;

          groupTasks.forEach(t => {
            if (t.start_date) {
              const start = new Date(t.start_date);
              if (!minStart || start < minStart) minStart = start;
            }
            if (t.end_date) {
              const end = new Date(t.end_date);
              if (!maxEnd || end > maxEnd) maxEnd = end;
            }
            if (t.last_updated) {
              const updated = new Date(t.last_updated);
              if (!maxLastUpdated || updated > maxLastUpdated) maxLastUpdated = updated;
            }
            if (t.sub_task && t.sub_task.trim() !== '') {
              totalProgress += t.progress_percent || 0;
              subTaskCount++;
            }
          });

          const avgProgress = subTaskCount > 0 ? Math.round(totalProgress / subTaskCount) : (groupTasks[0].progress_percent || 0);
          const minStartDateStr = minStart ? minStart.toISOString().split('T')[0] : (groupTasks[0].start_date || '-');
          const maxEndDateStr = maxEnd ? maxEnd.toISOString().split('T')[0] : (groupTasks[0].end_date || '-');
          const lastUpdatedStr = maxLastUpdated ? maxLastUpdated : groupTasks[0].last_updated;

          // Render Main Task Group Header Row
          const headerTr = document.createElement('tr');
          headerTr.style.backgroundColor = 'rgba(241, 245, 249, 0.6)';
          headerTr.style.fontWeight = 'bold';
          headerTr.innerHTML = `
            <td><span style="color: var(--primary);"><i class="fa-solid fa-folder-open"></i> ${mainTaskName}</span></td>
            <td><span class="text-muted" style="font-size:0.75rem; font-weight:normal;">(กิจกรรมหลัก - มี ${groupTasks.filter(t => t.sub_task && t.sub_task.trim() !== '').length} กิจกรรมย่อย)</span></td>
            <td>-</td>
            <td>${minStartDateStr}</td>
            <td>${maxEndDateStr}</td>
            <td>
              <div class="progress-container">
                <div class="progress-bar-track" style="height:6px; width:70px;">
                  <div class="progress-bar-fill" style="width: ${avgProgress}%; background: var(--primary);"></div>
                </div>
                <strong>${avgProgress}%</strong>
              </div>
            </td>
            <td>-</td>
            <td style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${formatDate(lastUpdatedStr)}</td>
            <td>-</td>
          `;
          elements.wsGanttTableBody.appendChild(headerTr);

          // Render each sub task in group
          groupTasks.forEach(t => {
            const tr = document.createElement('tr');
            let attachmentHTML = '<span class="text-muted" style="font-size:0.75rem;">ไม่มีเอกสาร</span>';
            if (t.attachments && t.attachments.length > 0) {
              attachmentHTML = t.attachments.map(att => 
                `<a href="${att.url}" target="_blank" class="badge badge-submitted margin-top-xs" style="display:block;"><i class="fa-solid fa-file-lines"></i> ${att.name}</a>`
              ).join('');
            }

            const subTaskNameHTML = t.sub_task && t.sub_task.trim() !== ''
              ? `<span style="padding-left: 15px;"><i class="fa-solid fa-arrow-turn-up" style="transform: rotate(90deg); margin-right: 5px; color: var(--text-muted);"></i> ${t.sub_task}</span>`
              : `<span class="text-muted" style="padding-left: 15px; font-style: italic;">(ยังไม่มีกิจกรรมย่อย)</span>`;

            tr.innerHTML = `
              <td><span class="text-muted" style="font-size: 0.85rem; padding-left: 5px;">↳ ${t.main_task}</span></td>
              <td>${subTaskNameHTML}</td>
              <td>${t.assignee_name || '-'}</td>
              <td>${t.start_date}</td>
              <td>${t.end_date}</td>
              <td>
                <div class="progress-container">
                  <div class="progress-bar-track" style="height:6px; width:70px;">
                    <div class="progress-bar-fill" style="width: ${t.progress_percent}%;"></div>
                  </div>
                  <strong>${t.progress_percent}%</strong>
                </div>
              </td>
              <td>${attachmentHTML}</td>
              <td style="font-size:0.75rem; color:var(--text-muted);">${formatDate(t.last_updated)}</td>
              <td>
                ${canEdit ? `
                  <div style="display:flex; gap:0.25rem;">
                    <button class="btn btn-secondary btn-xs edit-task-btn" data-id="${t.id}">แก้ไข</button>
                    <button class="btn btn-danger btn-xs rm-task-btn" data-id="${t.id}"><i class="fa-solid fa-trash-can"></i></button>
                  </div>
                ` : '-'}
              </td>
            `;
            elements.wsGanttTableBody.appendChild(tr);
          });
        });

        // Bind actions
        if (canEdit) {
          // Edit triggers
          document.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const tid = btn.getAttribute('data-id');
              const task = state.tasks.find(tk => tk.id == tid);
              if (task) {
                document.getElementById('gantt-task-id').value = task.id;
                document.getElementById('gantt-main-input').value = task.main_task;
                document.getElementById('gantt-sub-input').value = task.sub_task || '';
                document.getElementById('gantt-start-input').value = task.start_date;
                document.getElementById('gantt-end-input').value = task.end_date;
                document.getElementById('gantt-progress-input').value = task.progress_percent;
                document.getElementById('progress-val-lbl').innerText = task.progress_percent + '%';
                
                // Load members for assignee select
                try {
                  const members = await API.members.list(pid);
                  const selectEl = document.getElementById('gantt-assignee-input');
                  selectEl.innerHTML = '<option value="">-- เลือกผู้รับผิดชอบ --</option>';
                  members.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = `${m.full_name} (${m.nickname || m.position})`;
                    if (task.assigned_member_id == m.id) {
                      opt.selected = true;
                    }
                    selectEl.appendChild(opt);
                  });
                } catch(err) {
                  console.error('Error loading members for assignee:', err);
                }
                
                elements.modalAddGanttTask.showModal();
              }
            });
          });

          // Delete triggers
          document.querySelectorAll('.rm-task-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (confirm('คุณต้องการลบรายชื่อแผนดำเนินงานนี้หรือไม่?')) {
                await API.gantt.delete(pid, btn.getAttribute('data-id'));
                loadGanttTab(pid);
                loadWorkspaceData(); // refresh project overall progress
              }
            });
          });
        }
      }

    } catch (err) {
      console.error(err);
    }
  }

  // Render Gantt chart grid dynamically based on the project tasks timelines
  function renderGanttChartVisual(tasks) {
    elements.ganttTimelineQuarterHeader.innerHTML = '';
    elements.ganttTimelineHeader.innerHTML = '';
    elements.ganttChartRows.innerHTML = '';

    // Create Title Header Columns
    const qTitleHeader = document.createElement('div');
    qTitleHeader.className = 'timeline-header-cell task-name-header';
    qTitleHeader.textContent = 'ไตรมาสประจำปีงบประมาณ';
    elements.ganttTimelineQuarterHeader.appendChild(qTitleHeader);

    const nameHeader = document.createElement('div');
    nameHeader.className = 'timeline-header-cell task-name-header';
    nameHeader.textContent = 'หัวข้อแผนงาน / ดำเนินงาน';
    elements.ganttTimelineHeader.appendChild(nameHeader);

    // Helper to get Thai government fiscal quarter name
    function getFiscalQuarterName(date) {
      const month = date.getMonth(); // 0-11
      if (month >= 9 && month <= 11) {
        return 'Q1 (ต.ค.-ธ.ค.)';
      } else if (month >= 0 && month <= 2) {
        return 'Q2 (ม.ค.-มี.ค.)';
      } else if (month >= 3 && month <= 5) {
        return 'Q3 (เม.ย.-มิ.ย.)';
      } else {
        return 'Q4 (ก.ค.-ก.ย.)';
      }
    }

    if (tasks.length === 0) {
      // Draw 4 default blank quarters, each spanning 6 columns
      const quarters = ['Q1 (ต.ค.-ธ.ค.)', 'Q2 (ม.ค.-มี.ค.)', 'Q3 (เม.ย.-มิ.ย.)', 'Q4 (ก.ค.-ก.ย.)'];
      quarters.forEach(q => {
        const cell = document.createElement('div');
        cell.className = 'timeline-header-cell';
        cell.style.gridColumn = 'span 6';
        cell.style.backgroundColor = '#e2e8f0';
        cell.style.fontWeight = 'bold';
        cell.style.borderRight = '2px solid #cbd5e1';
        cell.textContent = q;
        elements.ganttTimelineQuarterHeader.appendChild(cell);
      });

      // Draw 24 default blank columns
      for (let i = 1; i <= 24; i++) {
        const cell = document.createElement('div');
        cell.className = 'timeline-header-cell';
        cell.textContent = `W${i}`;
        elements.ganttTimelineHeader.appendChild(cell);
      }
      elements.ganttChartRows.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">ยังไม่มีแผนงาน กรุณากด "เพิ่มแผนงาน" ด้านบนเพื่อดูแผนภูมิ Gantt</div>';
      return;
    }

    // Compute task boundaries
    let dates = [];
    tasks.forEach(t => {
      dates.push(new Date(t.start_date));
      dates.push(new Date(t.end_date));
    });

    let minDate = new Date(Math.min(...dates));
    let maxDate = new Date(Math.max(...dates));

    // Pad dates slightly
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    const totalMs = maxDate.getTime() - minDate.getTime();

    // 1. Draw Quarters
    const cols = [];
    for (let i = 0; i < 24; i++) {
      const stepDate = new Date(minDate.getTime() + (totalMs / 23) * i);
      cols.push(getFiscalQuarterName(stepDate));
    }

    const groups = [];
    let currentGroup = { name: cols[0], span: 1 };
    for (let i = 1; i < 24; i++) {
      if (cols[i] === currentGroup.name) {
        currentGroup.span++;
      } else {
        groups.push(currentGroup);
        currentGroup = { name: cols[i], span: 1 };
      }
    }
    groups.push(currentGroup);

    groups.forEach(g => {
      const cell = document.createElement('div');
      cell.className = 'timeline-header-cell';
      cell.style.gridColumn = `span ${g.span}`;
      cell.style.backgroundColor = '#e2e8f0';
      cell.style.fontWeight = 'bold';
      cell.style.borderRight = '2px solid #cbd5e1';
      
      // Alternate colors for better visibility
      if (g.name.startsWith('Q1')) cell.style.color = '#1e3a8a';
      else if (g.name.startsWith('Q2')) cell.style.color = '#0f766e';
      else if (g.name.startsWith('Q3')) cell.style.color = '#c2410c';
      else cell.style.color = '#be123c';

      cell.textContent = g.name;
      elements.ganttTimelineQuarterHeader.appendChild(cell);
    });

    // 2. Draw 24 header subdivision cells
    for (let i = 0; i < 24; i++) {
      const stepDate = new Date(minDate.getTime() + (totalMs / 23) * i);
      const cell = document.createElement('div');
      cell.className = 'timeline-header-cell';
      cell.textContent = `${stepDate.getMonth() + 1}/${stepDate.getDate()}`;
      elements.ganttTimelineHeader.appendChild(cell);
    }

    // Group tasks by main_task
    // Group tasks by main_task
    const taskGroups = {};
    tasks.forEach(t => {
      if (!taskGroups[t.main_task]) {
        taskGroups[t.main_task] = [];
      }
      taskGroups[t.main_task].push(t);
    });

    // 2. Draw Rows
    Object.keys(taskGroups).forEach(mainTaskName => {
      const groupTasks = taskGroups[mainTaskName];

      // Draw Main Task Group Header Row (No bar)
      const headerRow = document.createElement('div');
      headerRow.className = 'gantt-row';
      headerRow.style.backgroundColor = 'rgba(241, 245, 249, 0.4)';
      headerRow.style.fontWeight = 'bold';

      const nameCellHeader = document.createElement('div');
      nameCellHeader.className = 'gantt-task-name';
      nameCellHeader.innerHTML = `<span style="color: var(--primary);"><i class="fa-solid fa-folder-open"></i> ${mainTaskName}</span>`;
      headerRow.appendChild(nameCellHeader);

      const timelineCellHeader = document.createElement('div');
      timelineCellHeader.className = 'gantt-timeline-body-cell';
      timelineCellHeader.style.gridColumn = 'span 24';
      headerRow.appendChild(timelineCellHeader);
      
      elements.ganttChartRows.appendChild(headerRow);

      // Draw each sub task
      groupTasks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'gantt-row';

        const taskStart = new Date(t.start_date).getTime();
        const taskEnd = new Date(t.end_date).getTime();

        // Calculate Left Position and Width ratios
        let leftPercent = ((taskStart - minDate.getTime()) / totalMs) * 100;
        let widthPercent = ((taskEnd - taskStart) / totalMs) * 100;

        // Restrict overflows
        if (leftPercent < 0) leftPercent = 0;
        if (widthPercent <= 0) widthPercent = 5; // minimum thickness
        if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

        // Render Task name cell
        const nameCell = document.createElement('div');
        nameCell.className = 'gantt-task-name';
        
        const subTaskLabel = t.sub_task && t.sub_task.trim() !== ''
          ? `<span style="padding-left: 15px;"><i class="fa-solid fa-arrow-turn-up" style="transform: rotate(90deg); margin-right: 5px; color: var(--text-muted);"></i> ${t.sub_task}</span>`
          : `<span class="text-muted" style="padding-left: 15px; font-style: italic;">(ยังไม่มีกิจกรรมย่อย)</span>`;
        nameCell.innerHTML = subTaskLabel;
        row.appendChild(nameCell);

        // Render absolute bar container in the timeline
        const timelineCell = document.createElement('div');
        timelineCell.className = 'gantt-timeline-body-cell';
        timelineCell.style.gridColumn = 'span 24';

        // Only draw timeline bar if there is an actual sub_task
        if (t.sub_task && t.sub_task.trim() !== '') {
          const bar = document.createElement('div');
          bar.className = 'gantt-bar';
          bar.style.left = `${leftPercent}%`;
          bar.style.width = `${widthPercent}%`;
          bar.title = `${t.main_task} - ${t.sub_task} (${t.progress_percent}%) - ผู้รับผิดชอบ: ${t.assignee_name || 'ไม่มี'} - วันเริ่ม: ${t.start_date} วันสิ้นสุด: ${t.end_date}`;

          bar.innerHTML = `
            <div class="gantt-bar-progress-fill" style="width: ${t.progress_percent}%;"></div>
            <span>${t.progress_percent}%</span>
          `;

          // Allow click trigger edit modal
          if (state.currentUser.role !== 'Executive') {
            bar.addEventListener('click', async () => {
              document.getElementById('gantt-task-id').value = t.id;
              document.getElementById('gantt-main-input').value = t.main_task;
              document.getElementById('gantt-sub-input').value = t.sub_task || '';
              document.getElementById('gantt-start-input').value = t.start_date;
              document.getElementById('gantt-end-input').value = t.end_date;
              document.getElementById('gantt-progress-input').value = t.progress_percent;
              document.getElementById('progress-val-lbl').innerText = t.progress_percent + '%';
              
              // Load members for assignee select
              try {
                const members = await API.members.list(state.activeProjectId);
                const selectEl = document.getElementById('gantt-assignee-input');
                selectEl.innerHTML = '<option value="">-- เลือกผู้รับผิดชอบ --</option>';
                members.forEach(m => {
                  const opt = document.createElement('option');
                  opt.value = m.id;
                  opt.textContent = `${m.full_name} (${m.nickname || m.position})`;
                  if (t.assigned_member_id == m.id) {
                    opt.selected = true;
                  }
                  selectEl.appendChild(opt);
                });
              } catch(err) {
                console.error(err);
              }
              elements.modalAddGanttTask.showModal();
            });
          }
          timelineCell.appendChild(bar);
        }

        row.appendChild(timelineCell);
        elements.ganttChartRows.appendChild(row);
      });
    });
  }

  // Gantt Chart Zoom Controls
  let currentZoom = 'md';
  const zoomLabels = {
    'fit': 'พอดีหน้าจอ',
    'sm': '50% (ย่อ)',
    'md': '100% (ปกติ)',
    'lg': '150% (ขยาย)'
  };

  function updateGanttZoom(level) {
    currentZoom = level;
    const wrapper = document.getElementById('gantt-wrapper');
    const label = document.getElementById('gantt-zoom-label');
    if (wrapper && label) {
      wrapper.classList.remove('gantt-fit', 'gantt-sm', 'gantt-md', 'gantt-lg');
      wrapper.classList.add(`gantt-${level}`);
      label.textContent = zoomLabels[level];
    }
  }

  document.getElementById('gantt-zoom-out-btn').addEventListener('click', () => {
    if (currentZoom === 'lg') updateGanttZoom('md');
    else if (currentZoom === 'md') updateGanttZoom('sm');
    else if (currentZoom === 'sm') updateGanttZoom('fit');
  });

  document.getElementById('gantt-zoom-in-btn').addEventListener('click', () => {
    if (currentZoom === 'fit') updateGanttZoom('sm');
    else if (currentZoom === 'sm') updateGanttZoom('md');
    else if (currentZoom === 'md') updateGanttZoom('lg');
  });

  document.getElementById('gantt-zoom-fit-btn').addEventListener('click', () => {
    updateGanttZoom('fit');
  });

  // Gantt Chart Scrolling Buttons
  const ganttWrapper = document.getElementById('gantt-wrapper');
  if (ganttWrapper) {
    document.getElementById('gantt-scroll-left-btn').addEventListener('click', () => {
      ganttWrapper.scrollBy({ left: -400, behavior: 'smooth' });
    });
    document.getElementById('gantt-scroll-right-btn').addEventListener('click', () => {
      ganttWrapper.scrollBy({ left: 400, behavior: 'smooth' });
    });
  }

  // Gantt Modal trigger
  elements.addGanttTaskBtn.addEventListener('click', async () => {
    elements.formAddGanttTask.reset();
    document.getElementById('gantt-task-id').value = '';
    document.getElementById('progress-val-lbl').innerText = '0%';
    
    // Load members for assignee select
    try {
      const members = await API.members.list(state.activeProjectId);
      const selectEl = document.getElementById('gantt-assignee-input');
      selectEl.innerHTML = '<option value="">-- เลือกผู้รับผิดชอบ --</option>';
      members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.full_name} (${m.nickname || m.position})`;
        selectEl.appendChild(opt);
      });
    } catch(err) {
      console.error('Error loading members for assignee:', err);
    }
    
    elements.modalAddGanttTask.showModal();
  });

  elements.formAddGanttTask.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = state.activeProjectId;
    const formData = new FormData(elements.formAddGanttTask);

    try {
      await API.gantt.addOrUpdate(pid, formData);
      elements.modalAddGanttTask.close();
      loadGanttTab(pid);
      loadWorkspaceData(); // Refresh project overall progress indicator
    } catch (err) {
      alert(err.message);
    }
  });

  // --- TAB 4: MONTHLY REPORTS LIST ---
  async function loadReportsTab(pid) {
    try {
      const reports = await API.reports.list(pid);
      state.activeProjectReports = reports;
      elements.wsReportsTableBody.innerHTML = '';

      if (reports.length === 0) {
        elements.wsReportsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">ยังไม่มีการยื่นสรุปรายงานประจำเดือน</td></tr>';
      } else {
        reports.forEach(r => {
          const tr = document.createElement('tr');
          const statusClass = r.status.toLowerCase();

          tr.innerHTML = `
            <td><strong>รอบเดือน ${r.report_month_year}</strong></td>
            <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.summary || '-'}</td>
            <td><span class="badge ${statusClass}">${r.status}</span></td>
            <td>${formatDate(r.submitted_at)}</td>
            <td>
              ${r.report_file 
                ? `<a href="${r.report_file}" target="_blank" class="badge badge-submitted"><i class="fa-solid fa-paperclip"></i> โหลดไฟล์แนบ</a>` 
                : '<span class="text-muted" style="font-size:0.75rem;">ไม่มีเอกสารแนบ</span>'}
            </td>
            <td>
              <button class="btn btn-secondary btn-xs view-report-detail-btn" data-id="${r.id}">
                <i class="fa-solid fa-file-lines"></i> เปิดรายงาน A4
              </button>
            </td>
          `;
          elements.wsReportsTableBody.appendChild(tr);
        });

        // Bind detail navigation
        document.querySelectorAll('.view-report-detail-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            state.activeReportId = btn.getAttribute('data-id');
            showView('monthly-report-detail');
          });
        });
      }

    } catch (err) {
      console.error(err);
    }
  }

  // Helper to auto-populate report form when month changes
  async function populateReportFormForMonth(monthVal) {
    if (!state.activeProjectReports) return;
    const existing = state.activeProjectReports.find(r => r.report_month_year === monthVal);
    
    const summaryInput = document.getElementById('rep-summary-input');
    const plannedInput = document.getElementById('rep-activities-planned-input');
    const unplannedInput = document.getElementById('rep-activities-unplanned-input');
    const issuesInput = document.getElementById('rep-issues-input');
    const solutionsInput = document.getElementById('rep-solutions-input');
    const reporterInput = document.getElementById('rep-reporter-input');
    const statusInput = document.getElementById('rep-status-input');
    const fileInput = document.getElementById('rep-file-input');

    if (fileInput) fileInput.value = ''; // Always reset file input

    if (existing) {
      if (summaryInput) summaryInput.value = existing.summary || '';
      if (plannedInput) plannedInput.value = existing.activities_planned || '';
      if (unplannedInput) unplannedInput.value = existing.activities_unplanned || '';
      if (issuesInput) issuesInput.value = existing.issues_obstacles || '';
      if (solutionsInput) solutionsInput.value = existing.solutions || '';
      if (reporterInput) reporterInput.value = existing.reporter_name || '';
      if (statusInput) statusInput.value = existing.status || 'Draft';
    } else {
      // Clear inputs to blank for new report
      if (summaryInput) summaryInput.value = '';
      if (plannedInput) plannedInput.value = '';
      if (unplannedInput) unplannedInput.value = '';
      if (issuesInput) issuesInput.value = '';
      if (solutionsInput) solutionsInput.value = '';
      if (reporterInput) reporterInput.value = '';
      if (statusInput) statusInput.value = 'Draft';
    }
  }

  // Bind change event to rep-month-input
  const repMonthInput = document.getElementById('rep-month-input');
  if (repMonthInput) {
    repMonthInput.addEventListener('change', (e) => {
      populateReportFormForMonth(e.target.value);
    });
  }

  // Create monthly report trigger
  elements.createMonthlyReportBtn.addEventListener('click', async () => {
    elements.formCreateMonthlyReport.reset();
    
    // Default select current previous month
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth(); // previous month (0-indexed)
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const val = `${y}-${String(m).padStart(2, '0')}`;
    const repMonthInput = document.getElementById('rep-month-input');
    if (repMonthInput) repMonthInput.value = val;

    // Load reporter options dynamically from project members
    const reporterSelect = document.getElementById('rep-reporter-input');
    if (reporterSelect) {
      reporterSelect.innerHTML = '<option value="">-- เลือกผู้รายงานผล --</option>';
      try {
        const members = await API.members.list(state.activeProjectId);
        members.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.full_name;
          opt.textContent = `${m.full_name} (${m.position || 'ไม่มีระบุตำแหน่ง'})`;
          reporterSelect.appendChild(opt);
        });
      } catch (err) {
        console.error('Failed to load project members for reporter select:', err);
      }
    }

    // Populate form if this month already has a report
    await populateReportFormForMonth(val);
    
    elements.modalCreateMonthlyReport.showModal();
  });

  elements.formCreateMonthlyReport.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = state.activeProjectId;
    const formData = new FormData();

    const month = document.getElementById('rep-month-input')?.value || '';
    const summary = document.getElementById('rep-summary-input')?.value || '';
    const activitiesPlanned = document.getElementById('rep-activities-planned-input')?.value || '';
    const activitiesUnplanned = document.getElementById('rep-activities-unplanned-input')?.value || '';
    const issues = document.getElementById('rep-issues-input')?.value || '';
    const solutions = document.getElementById('rep-solutions-input')?.value || '';
    const reporter = document.getElementById('rep-reporter-input')?.value || '';
    const status = document.getElementById('rep-status-input')?.value || 'Draft';
    const fileInput = document.getElementById('rep-file-input');

    formData.append('report_month_year', month);
    formData.append('summary', summary);
    formData.append('activities_planned', activitiesPlanned);
    formData.append('activities_unplanned', activitiesUnplanned);
    formData.append('issues_obstacles', issues);
    formData.append('solutions', solutions);
    formData.append('reporter_name', reporter);
    formData.append('status', status);

    if (fileInput && fileInput.files[0]) {
      formData.append('report_file', fileInput.files[0]);
    }

    try {
      await API.reports.add(pid, formData);
      elements.modalCreateMonthlyReport.close();
      loadReportsTab(pid);
    } catch (err) {
      alert(err.message);
    }
  });


  // ----------------------------------------------------
  // 4. OFFICIAL MONTHLY REPORT DETAIL VIEW
  // ----------------------------------------------------

  async function loadReportDetailData() {
    const reportId = state.activeReportId;
    if (!reportId) return;

    try {
      const data = await API.reports.getDetails(reportId);
      
      // Render meta
      elements.repProjName.textContent = data.project.project_name;
      elements.repMonthYear.textContent = `รอบการทำงานประจำเดือน ${data.report.report_month_year}`;
      
      const pStatusClass = data.project.status.toLowerCase().replace(' ', '-');
      elements.repProjStatus.className = `badge ${pStatusClass}`;
      elements.repProjStatus.textContent = data.project.status;

      const progress = Math.round(data.project.overall_progress);
      elements.repProjProgress.textContent = `${progress}%`;

      elements.repSubmittedAt.textContent = formatDate(data.report.submitted_at);
      
      const repStatusClass = data.report.status.toLowerCase();
      elements.repStatus.className = `badge ${repStatusClass}`;
      elements.repStatus.textContent = data.report.status;

      // Render reporter info
      const reporterMeta = document.getElementById('rep-reporter-meta');
      const signReporterName = document.getElementById('rep-sign-reporter-name');
      if (reporterMeta) reporterMeta.textContent = data.report.reporter_name || 'ไม่ระบุผู้รายงาน';
      if (signReporterName) signReporterName.textContent = data.report.reporter_name || 'ผู้รับผิดชอบโครงการประจำ TOAT Sandbox';

      // Text blocks
      elements.repSummaryText.textContent = data.report.summary || 'ไม่มีข้อความสรุปการดำเนินงาน';
      
      const plannedText = document.getElementById('rep-activities-planned-text');
      const unplannedText = document.getElementById('rep-activities-unplanned-text');
      const solutionsText = document.getElementById('rep-solutions-text');
      
      if (plannedText) plannedText.textContent = data.report.activities_planned || 'ไม่มีกิจกรรมดำเนินได้ตามแผน';
      if (unplannedText) unplannedText.textContent = data.report.activities_unplanned || 'ไม่มีกิจกรรมที่ไม่สามารถดำเนินงานได้';
      elements.repIssuesText.textContent = data.report.issues_obstacles || 'ไม่มีปัญหา อุปสรรค';
      if (solutionsText) solutionsText.textContent = data.report.solutions || 'ไม่มีแนวทางแก้ปัญหา';

      // Budget tables
      elements.repBudgetAllocated.textContent = formatTHB(data.budgets.total_allocated);
      elements.repBudgetSpent.textContent = formatTHB(data.budgets.total_spent);
      elements.repBudgetRemaining.textContent = formatTHB(data.budgets.total_remaining);

      // Detailed Budget items table rendering
      elements.repBudgetItemsBody.innerHTML = '';
      if (!data.budgetItems || data.budgetItems.length === 0) {
        elements.repBudgetItemsBody.innerHTML = '<tr><td colspan="11" class="text-center">ไม่มีข้อมูลรายการงบประมาณรายจ่าย</td></tr>';
      } else {
        data.budgetItems.forEach(b => {
          const tr = document.createElement('tr');
          const remaining = b.remaining_amount;
          const remainingClass = remaining < 0 ? 'text-danger font-weight-700' : 'text-success';
          const remainingPct = b.allocated_amount > 0 ? ((remaining / b.allocated_amount) * 100).toFixed(1) : '0.0';
          const pctClass = parseFloat(remainingPct) < 0 ? 'text-danger' : parseFloat(remainingPct) < 20 ? 'text-warning' : 'text-success';

          const budgetTypeColors = {
            'งบลงทุน': '#6366f1',
            'งบค่าใช้สอย': '#0ea5e9',
            'งบปฏิบัติการพิเศษ': '#f59e0b',
            'อื่นๆ': '#8b5cf6'
          };
          const typeColor = budgetTypeColors[b.budget_type] || '#64748b';
          const typeLabel = (b.budget_type === 'อื่นๆ' && b.budget_type_other) ? `อื่นๆ: ${b.budget_type_other}` : (b.budget_type || '-');

          tr.innerHTML = `
            <td style="text-align: left;">
              <div style="font-weight:600; color: var(--text-primary);">${b.item_name}</div>
              ${b.detail ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${b.detail}</div>` : ''}
            </td>
            <td><span style="background:${typeColor}22; color:${typeColor}; padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:600; white-space:nowrap;">${typeLabel}</span></td>
            <td style="font-size:0.8rem; color:var(--text-secondary);">${b.owner_unit || '<span class="text-muted">-</span>'}</td>
            <td style="text-align:right; font-weight:600;">${formatTHB(b.allocated_amount)}</td>
            <td style="text-align:right; color:var(--danger);">${formatTHB(b.spent_amount)}</td>
            <td style="text-align:right;" class="${remainingClass}">${formatTHB(remaining)}</td>
            <td style="text-align:center;" class="${pctClass}"><strong>${remainingPct}%</strong></td>
            <td style="text-align:center;">
              ${b.approval_document 
                ? `<a href="${b.approval_document}" target="_blank" class="btn btn-secondary btn-xs"><i class="fa-solid fa-file-signature"></i> ดู</a>` 
                : '<span style="font-size:0.72rem; color:var(--text-muted);">ไม่มี</span>'}
            </td>
            <td style="text-align:center; font-size:0.8rem;">${b.payment_type || '-'}</td>
            <td style="text-align:center;">
              ${b.payment_evidence 
                ? `<a href="${b.payment_evidence}" target="_blank" class="btn btn-secondary btn-xs"><i class="fa-solid fa-receipt"></i> ดู</a>` 
                : '<span style="font-size:0.72rem; color:var(--text-muted);">ไม่มี</span>'}
            </td>
            <td style="font-size:0.78rem; color:var(--text-secondary); max-width:130px; word-break:break-word; text-align: left;">${b.remarks || '-'}</td>
          `;
          elements.repBudgetItemsBody.appendChild(tr);
        });
      }

      // Attachments link
      if (data.report.report_file) {
        elements.repAttachmentLink.innerHTML = `<a href="${data.report.report_file}" target="_blank"><i class="fa-solid fa-file-pdf"></i> ดาวน์โหลดเอกสารฉบับเต็มประกอบรายงาน (${data.report.report_file.split('/').pop()})</a>`;
      } else {
        elements.repAttachmentLink.innerHTML = '<span class="text-muted">ไม่มีการอัปโหลดไฟล์เอกสารประกอบ</span>';
      }

      // Check comments
      renderComments(data.comments);

      // Manage Executive action panel status box
      const isExecutiveOrAdmin = ['Admin', 'Executive'].includes(state.currentUser.role);
      const isDraftOrSubmitted = data.report.status === 'Submitted';

      if (isExecutiveOrAdmin && isDraftOrSubmitted) {
        elements.execStatusChangeBox.classList.remove('hidden');
      } else {
        elements.execStatusChangeBox.classList.add('hidden');
      }

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดรายละเอียดรายงาน: ' + err.message);
      showView('project-workspace');
    }
  }

  function renderComments(comments) {
    elements.reportCommentsList.innerHTML = '';
    if (comments.length === 0) {
      elements.reportCommentsList.innerHTML = '<div class="no-comments">ยังไม่มีผู้บริหารเขียนข้อเสนอแนะเพิ่มเติมสำหรับรายงานฉบับนี้</div>';
      return;
    }

    comments.forEach(c => {
      const card = document.createElement('div');
      card.className = `comment-card role-${c.role}`;

      card.innerHTML = `
        <div class="comment-meta">
          <strong>${c.commenter_name} (${c.role})</strong>
          <span>${formatDate(c.created_at)}</span>
        </div>
        <div class="comment-body">${c.comment_text}</div>
      `;
      elements.reportCommentsList.appendChild(card);
    });
  }

  // Executive Action: Approve Report
  elements.btnApproveReport.addEventListener('click', async () => {
    try {
      await API.reports.updateStatus(state.activeReportId, 'Approved');
      alert('อนุมัติรายงานความคืบหน้าฉบับนี้เรียบร้อยแล้ว');
      loadReportDetailData();
    } catch (err) {
      alert(err.message);
    }
  });

  // Executive Action: Reject / Send back to Draft
  elements.btnRejectReport.addEventListener('click', async () => {
    try {
      await API.reports.updateStatus(state.activeReportId, 'Draft');
      alert('ส่งรายงานความคืบหน้ากลับให้ผู้รับผิดชอบโครงการแก้ไขเรียบร้อยแล้ว');
      loadReportDetailData();
    } catch (err) {
      alert(err.message);
    }
  });

  // Submit Comments
  elements.addCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comment = elements.commentTextInput.value.trim();
    if (!comment) return;

    try {
      await API.reports.addComment(state.activeReportId, comment);
      elements.commentTextInput.value = '';
      loadReportDetailData(); // Reload comments
    } catch (err) {
      alert('ไม่สามารถส่งความคิดเห็นได้: ' + err.message);
    }
  });

  // Print Report trigger
  elements.printPdfReportBtn.addEventListener('click', () => {
    window.print();
  });

  // Go back to workspace button click
  elements.backToWorkspaceBtn.addEventListener('click', () => {
    showView('project-workspace');
  });

  // ----------------------------------------------------
  // 5. ADMIN PANEL & SETTINGS DATA LOAD
  // ----------------------------------------------------
  // Check and display pending approvals popup
  async function checkPendingApprovals() {
    try {
      const pending = await API.admin.getPendingUsers();
      if (pending.length > 0) {
        elements.pendingUsersTableBody.innerHTML = '';
        pending.forEach(u => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${u.username}</strong><br><small>${u.email}</small></td>
            <td>${u.employee_id || '-'}</td>
            <td>${u.division || '-'}</td>
            <td>${u.department || '-'}</td>
            <td>Line: ${u.line_id || '-'}<br>โทร: ${u.phone_number || '-'}</td>
            <td>
              <button class="btn btn-success btn-xs approve-user-btn" data-id="${u.id}" style="margin-right: 5px;">อนุมัติ</button>
              <button class="btn btn-danger btn-xs reject-user-btn" data-id="${u.id}">ปฏิเสธ</button>
            </td>
          `;
          elements.pendingUsersTableBody.appendChild(tr);
        });

        // Bind approve/reject buttons
        document.querySelectorAll('.approve-user-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.getAttribute('data-id');
            try {
              await API.admin.approveUser(uid);
              alert('อนุมัติสิทธิ์การเข้าใช้งานเสร็จสิ้น');
              elements.modalPendingApprovals.close();
              loadAdminPanelData();
            } catch (err) {
              alert('ข้อผิดพลาด: ' + err.message);
            }
          });
        });

        document.querySelectorAll('.reject-user-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.getAttribute('data-id');
            if (confirm('คุณแน่ใจหรือไม่ที่จะปฏิเสธและลบข้อมูลผู้ใช้งานท่านนี้ออกจากระบบ?')) {
              try {
                await API.admin.rejectUser(uid);
                alert('ลบข้อมูลและปฏิเสธสิทธิ์เรียบร้อยแล้ว');
                elements.modalPendingApprovals.close();
                loadAdminPanelData();
              } catch (err) {
                alert('ข้อผิดพลาด: ' + err.message);
              }
            }
          });
        });

        // Only show modal if it's not already open
        if (!elements.modalPendingApprovals.open) {
          elements.modalPendingApprovals.showModal();
        }
      }
    } catch (err) {
      console.error('Error fetching pending users:', err);
    }
  }

  async function loadAdminPanelData() {
    try {
      // 1. Load users table
      const users = await API.admin.getUsers();
      elements.adminUsersTableBody.innerHTML = '';
      
      users.forEach(u => {
        const tr = document.createElement('tr');
        const isSelf = u.id === state.currentUser.id;
        const approvedBadge = u.is_approved === 1 
          ? '<span class="badge completed">อนุมัติแล้ว</span>' 
          : '<span class="badge delayed">รออนุมัติ</span>';

        // Check view permissions checkboxes status
        const views = (u.allowed_views || '').split(',').map(v => v.trim());
        const hasDashboard = views.includes('dashboard') ? 'checked' : '';
        const hasProjects = views.includes('projects-list') ? 'checked' : '';
        const hasAdmin = views.includes('admin-panel') ? 'checked' : '';

        tr.innerHTML = `
          <td><strong>${u.username}</strong> ${isSelf ? ' (คุณ)' : ''}</td>
          <td>${u.email}</td>
          <td>${u.employee_id || '-'}</td>
          <td>${u.division || '-'} / ${u.department || '-'}</td>
          <td>Line: ${u.line_id || '-'} <br> โทร: ${u.phone_number || '-'}</td>
          <td>${approvedBadge}</td>
          <td>
            <label style="display:block; font-size:0.75rem; margin-bottom: 3px; cursor: pointer;">
              <input type="checkbox" class="permission-checkbox" data-id="${u.id}" data-view="dashboard" ${hasDashboard}> แดชบอร์ด
            </label>
            <label style="display:block; font-size:0.75rem; margin-bottom: 3px; cursor: pointer;">
              <input type="checkbox" class="permission-checkbox" data-id="${u.id}" data-view="projects-list" ${hasProjects}> รายการโครงการ
            </label>
            <label style="display:block; font-size:0.75rem; margin-bottom: 3px; cursor: pointer;">
              <input type="checkbox" class="permission-checkbox" data-id="${u.id}" data-view="admin-panel" ${hasAdmin}> จัดการระบบ
            </label>
          </td>
          <td>
            ${isSelf ? '-' : `
              <select class="change-user-role-select" data-id="${u.id}">
                <option value="Project Submitter" ${u.role === 'Project Submitter' ? 'selected' : ''}>Project Submitter</option>
                <option value="Executive" ${u.role === 'Executive' ? 'selected' : ''}>Executive</option>
                <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
              </select>
            `}
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <button class="btn btn-secondary btn-xs view-user-detail-btn" data-id="${u.id}" data-username="${u.username}" data-email="${u.email}" data-empid="${u.employee_id || '-'}" data-division="${u.division || '-'}" data-dept="${u.department || '-'}" data-lineid="${u.line_id || '-'}" data-phone="${u.phone_number || '-'}" data-approved="${u.is_approved === 1 ? 'อนุมัติแล้ว' : 'รออนุมัติ'}" data-role="${u.role}">ดูรายละเอียด</button>
              <button class="btn btn-warning btn-xs reset-user-pw-btn" data-id="${u.id}" data-username="${u.username}">รีเซ็ตรหัส</button>
            </div>
          </td>
        `;
        elements.adminUsersTableBody.appendChild(tr);
      });

      // Bind role changes select
      document.querySelectorAll('.change-user-role-select').forEach(select => {
        select.addEventListener('change', async () => {
          const uid = select.getAttribute('data-id');
          const newRole = select.value;
          if (confirm(`คุณมั่นใจที่จะปรับระดับผู้ใช้รายนี้เป็นบทบาท "${newRole}" หรือไม่?`)) {
            try {
              await API.admin.updateUserRole(uid, newRole);
              alert('บันทึกการเปลี่ยนบทบาทเรียบร้อยแล้ว');
              loadAdminPanelData();
            } catch (err) {
              alert(err.message);
            }
          } else {
            // reset select value
            loadAdminPanelData();
          }
        });
      });

      // Bind view permission checkboxes
      document.querySelectorAll('.permission-checkbox').forEach(cb => {
        cb.addEventListener('change', async () => {
          const uid = cb.getAttribute('data-id');
          const userCheckboxes = document.querySelectorAll(`.permission-checkbox[data-id="${uid}"]`);
          const allowed = [];
          userCheckboxes.forEach(box => {
            if (box.checked) {
              allowed.push(box.getAttribute('data-view'));
            }
          });
          const allowedViewsStr = allowed.join(',');
          try {
            await API.admin.updateUserViews(uid, allowedViewsStr);
            // If updating current user's views, apply changes in real time
            if (parseInt(uid) === state.currentUser.id) {
              state.currentUser.allowed_views = allowedViewsStr;
              checkAuth();
            }
          } catch (err) {
            alert('ไม่สามารถบันทึกสิทธิ์ใช้งานได้: ' + err.message);
            loadAdminPanelData();
          }
        });
      });

      // Bind View Details buttons
      document.querySelectorAll('.view-user-detail-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('detail-username').textContent = btn.getAttribute('data-username');
          document.getElementById('detail-role').textContent = btn.getAttribute('data-role');
          document.getElementById('detail-email').textContent = btn.getAttribute('data-email');
          document.getElementById('detail-empid').textContent = btn.getAttribute('data-empid');
          document.getElementById('detail-division').textContent = btn.getAttribute('data-division');
          document.getElementById('detail-department').textContent = btn.getAttribute('data-dept');
          document.getElementById('detail-lineid').textContent = btn.getAttribute('data-lineid');
          document.getElementById('detail-phone').textContent = btn.getAttribute('data-phone');
          document.getElementById('detail-approved').textContent = btn.getAttribute('data-approved');

          // badge class tuning
          const roleClass = btn.getAttribute('data-role') === 'Admin' ? 'completed' : (btn.getAttribute('data-role') === 'Executive' ? 'approved' : 'in-progress');
          document.getElementById('detail-role').className = `badge ${roleClass}`;
          
          elements.modalViewUserDetails.showModal();
        });
      });

      // Bind Reset Password buttons
      document.querySelectorAll('.reset-user-pw-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.getAttribute('data-id');
          const username = btn.getAttribute('data-username');
          const newPassword = prompt(`กรุณาป้อนรหัสผ่านใหม่สำหรับผู้ใช้ "${username}":`, "123456");
          if (newPassword === null) return; // cancel click
          if (newPassword.trim() === '') {
            alert('รหัสผ่านไม่สามารถเป็นค่าว่างได้');
            return;
          }
          try {
            await API.admin.resetPassword(uid, newPassword);
            alert(`รีเซ็ตรหัสผ่านสำหรับผู้ใช้ "${username}" เรียบร้อยแล้ว`);
          } catch (err) {
            alert('ไม่สามารถรีเซ็ตรหัสผ่านได้: ' + err.message);
          }
        });
      });

      // 2. Load settings (deadline day)
      const settings = await API.admin.getSettings();
      elements.adminDeadlineDay.value = settings.report_deadline_day;

      // 3. Load active projects in Assign select options
      const projects = await API.projects.list();
      elements.assignProjectId.innerHTML = '<option value="">-- เลือกโครงการ --</option>';
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.project_name;
        elements.assignProjectId.appendChild(opt);
      });

      // 3.5 Load Staff users in Assign select options
      elements.assignUserId.innerHTML = '<option value="">-- เลือกผู้ใช้ Staff --</option>';
      users.filter(u => u.role === 'Project Submitter' && u.is_approved === 1).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.username} (${u.employee_id || 'ไม่มีรหัส'}) - ${u.department || 'ไม่มีฝ่าย'}`;
        elements.assignUserId.appendChild(opt);
      });

      // 3.6 Load projects in Admin Project CRUD table
      elements.adminProjectsTableBody.innerHTML = '';
      projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.id}</td>
          <td><strong>${p.project_name}</strong></td>
          <td>${p.project_group || 'โครงการ TOAT Sandbox'}</td>
          <td><span class="badge ${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span></td>
          <td>
            <button class="btn btn-warning btn-xs edit-project-admin-btn" data-id="${p.id}" data-name="${p.project_name}" data-desc="${p.description || ''}" data-status="${p.status}" data-group="${p.project_group || 'โครงการ TOAT Sandbox'}" style="margin-right: 5px;">แก้ไข</button>
            <button class="btn btn-danger btn-xs delete-project-admin-btn" data-id="${p.id}">ลบ</button>
          </td>
        `;
        elements.adminProjectsTableBody.appendChild(tr);
      });

      // Bind project edits
      document.querySelectorAll('.edit-project-admin-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const pid = btn.getAttribute('data-id');
          try {
            const p = await API.projects.get(pid);
            document.getElementById('edit-project-id').value = p.id;
            document.getElementById('proj-name-input').value = p.project_name;
            document.getElementById('proj-desc-input').value = p.description || '';
            document.getElementById('proj-objectives-input').value = p.objectives || '';
            document.getElementById('proj-scope-input').value = p.scope || '';
            document.getElementById('proj-targets-input').value = p.targets || '';
            document.getElementById('proj-strategic-input').value = p.strategic_alignment || '';
            document.getElementById('proj-values-input').value = p.values_alignment || '';
            document.getElementById('proj-status-input').value = p.status;
            document.getElementById('proj-group-input').value = p.project_group || 'โครงการ TOAT Sandbox';
            document.getElementById('proj-logo-input').value = ''; // Reset file input
            elements.modalCreateProject.showModal();
          } catch (err) {
            alert('ไม่สามารถโหลดข้อมูลโครงการได้: ' + err.message);
          }
        });
      });

      // Bind project deletes
      document.querySelectorAll('.delete-project-admin-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const pid = btn.getAttribute('data-id');
          if (confirm('คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การลบโครงการจะลบข้อมูลที่เกี่ยวข้องทั้งหมด เช่น สมาชิก งบประมาณ และแผนงาน Gantt')) {
            try {
              await API.projects.delete(pid);
              alert('ลบโครงการเรียบร้อยแล้ว');
              loadProjectsListData();
              loadAdminPanelData();
            } catch (err) {
              alert('เกิดข้อผิดพลาด: ' + err.message);
            }
          }
        });
      });

      // 4. Load Assignments table
      loadAssignmentsData();

      // Check for pending approvals modal popup
      checkPendingApprovals();

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดเมนูควบคุม Admin: ' + err.message);
    }
  }

  // Load Assignments Table
  async function loadAssignmentsData() {
    try {
      const assignments = await API.admin.getAssignments();
      elements.adminAssignmentsTableBody.innerHTML = '';

      if (assignments.length === 0) {
        elements.adminAssignmentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">ไม่มีการมอบหมายสิทธิ์ดูแลโครงการในขณะนี้</td></tr>';
        return;
      }

      assignments.forEach(as => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${as.project_name}</td>
          <td><strong>${as.username}</strong></td>
          <td>${as.email}</td>
          <td>
            <button class="btn btn-danger btn-xs rm-assign-btn" data-id="${as.id}">ยกเลิกสิทธิ์</button>
          </td>
        `;
        elements.adminAssignmentsTableBody.appendChild(tr);
      });

      // Bind rm assignments
      document.querySelectorAll('.rm-assign-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('ยืนยันในการระงับสิทธิ์ดูแลโครงการของเจ้าหน้าที่ท่านนี้?')) {
            await API.admin.deleteAssignment(btn.getAttribute('data-id'));
            loadAssignmentsData();
          }
        });
      });

    } catch (err) {
      console.error(err);
    }
  }

  // Save deadline settings
  elements.adminDeadlineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const day = elements.adminDeadlineDay.value;
    try {
      await API.admin.saveSettings(day);
      alert('บันทึกกำหนดวันส่งรายงานเรียบร้อยแล้ว');
      loadAdminPanelData();
    } catch (err) {
      alert(err.message);
    }
  });

  // Assign project submitter Form
  elements.adminAssignForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = elements.assignProjectId.value;
    const userId = elements.assignUserId.value;

    try {
      await API.admin.createAssignment({ project_id: projectId, user_id: userId });
      alert('มอบหมายโครงการให้เจ้าหน้าที่ดูแลเรียบร้อยแล้ว');
      elements.adminAssignForm.reset();
      loadAssignmentsData();
    } catch (err) {
      alert(err.message);
    }
  });

  // Manual cron notification simulation trigger
  elements.adminManualTriggerBtn.addEventListener('click', async () => {
    elements.triggerResultLog.classList.remove('hidden');
    elements.triggerResultLog.textContent = '[SYSTEM] สั่งรันคำสั่งสแกนตรวจสอบการค้างส่งรายงานประจำเดือน...\n';

    try {
      const data = await API.admin.triggerDeadlineCheck();
      
      let log = `[SYSTEM] การตรวจสอบเสร็จสมบูรณ์!\n`;
      log += `[RESULT] จำนวนการค้างส่งรายงานที่ตรวจพบและแจ้งเตือน: ${data.alertsTriggered} รายการ\n`;
      log += `[ACTION] คลัสเตอร์ระบบส่งอีเมลและส่ง In-App Notification สำเร็จแล้ว\n`;
      log += `[INFO] คุณสามารถเช็ก In-App Notifications ของบัญชี Staff ที่ค้างส่งเพื่อตรวจสอบการแจ้งเตือนเพิ่มเติมได้`;
      
      elements.triggerResultLog.textContent += log;
      
      // Reload alerts badge if current user got hit
      loadNotifications();
    } catch (err) {
      elements.triggerResultLog.textContent += `[ERROR] เกิดความล้มเหลว: ${err.message}`;
    }
  });

  // Test SMTP Email Configuration
  elements.adminTestEmailBtn.addEventListener('click', async () => {
    const toEmail = elements.adminTestEmailInput.value.trim();
    if (!toEmail) {
      alert('กรุณากรอกอีเมลผู้รับทดสอบ');
      return;
    }

    elements.emailTestResultLog.classList.remove('hidden');
    elements.emailTestResultLog.textContent = `[SYSTEM] เริ่มทดสอบการส่งอีเมลไปยัง: ${toEmail}...\n`;
    elements.adminTestEmailBtn.disabled = true;

    try {
      const data = await API.admin.testEmail(toEmail);
      let log = `[SUCCESS] ส่งอีเมลสำเร็จ!\n`;
      log += `[INFO] Message ID: ${data.messageId}\n`;
      log += `[INFO] SMTP Response: ${data.response}\n`;
      log += `[INFO] กรุณาตรวจสอบในกล่องจดหมายเข้า (Inbox) หรือโฟลเดอร์จดหมายขยะ (Spam/Junk)`;
      elements.emailTestResultLog.textContent += log;
    } catch (err) {
      let log = `[ERROR] ส่งอีเมลล้มเหลว!\n`;
      log += `[DETAILS] ${err.message}\n`;
      log += `[SUGGESTION] กรุณาตรวจสอบว่า:\n`;
      log += `  1. ได้ตั้งค่า SMTP_USER และ SMTP_PASS ใน Environment Variables ของ Render ถูกต้องหรือไม่\n`;
      log += `  2. SMTP_PASS ต้องเป็น "App Password" (รหัสผ่านแอป 16 ตัวอักษรสีเหลืองจากบัญชี Google) ไม่ใช่รหัสผ่าน Gmail ปกติ\n`;
      log += `  3. นำเว้นวรรคในรหัสผ่านแอปออกทั้งหมด (เช่น xxxxxxxxxxxxxxxx)\n`;
      log += `  4. บัญชี Google ของคุณได้เปิดใช้งานการยืนยันตัวตนแบบ 2 ขั้นตอน (2-Step Verification) แล้ว`;
      elements.emailTestResultLog.textContent += log;
    } finally {
      elements.adminTestEmailBtn.disabled = false;
    }
  });

  // ----------------------------------------------------
  // EDIT PROFILE & CHANGE PASSWORD MODAL LOGIC
  // ----------------------------------------------------
  const btnProfileTabInfo = document.getElementById('btn-profile-tab-info');
  const btnProfileTabPassword = document.getElementById('btn-profile-tab-password');
  const formEditProfile = document.getElementById('form-edit-profile');
  const formChangePassword = document.getElementById('form-change-password');
  const profilePhotoInput = document.getElementById('profile-photo-input');
  const profilePreviewImg = document.getElementById('profile-preview-img');
  const profilePreviewPlaceholder = document.getElementById('profile-preview-placeholder');

  function showProfileTab(tabName) {
    if (!btnProfileTabInfo || !btnProfileTabPassword || !formEditProfile || !formChangePassword) return;
    if (tabName === 'info') {
      btnProfileTabInfo.classList.add('active');
      btnProfileTabInfo.style.borderBottom = '2px solid var(--primary)';
      btnProfileTabInfo.style.color = 'var(--primary)';

      btnProfileTabPassword.classList.remove('active');
      btnProfileTabPassword.style.borderBottom = '2px solid transparent';
      btnProfileTabPassword.style.color = 'var(--text-muted)';

      formEditProfile.classList.remove('hidden');
      formChangePassword.classList.add('hidden');
    } else {
      btnProfileTabPassword.classList.add('active');
      btnProfileTabPassword.style.borderBottom = '2px solid var(--primary)';
      btnProfileTabPassword.style.color = 'var(--primary)';

      btnProfileTabInfo.classList.remove('active');
      btnProfileTabInfo.style.borderBottom = '2px solid transparent';
      btnProfileTabInfo.style.color = 'var(--text-muted)';

      formChangePassword.classList.remove('hidden');
      formEditProfile.classList.add('hidden');
    }
  }

  if (btnProfileTabInfo) {
    btnProfileTabInfo.addEventListener('click', () => showProfileTab('info'));
  }
  if (btnProfileTabPassword) {
    btnProfileTabPassword.addEventListener('click', () => showProfileTab('password'));
  }

  if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && profilePreviewImg && profilePreviewPlaceholder) {
        const reader = new FileReader();
        reader.onload = (event) => {
          profilePreviewImg.src = event.target.result;
          profilePreviewImg.classList.remove('hidden');
          profilePreviewPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const openEditProfileModal = () => {
    if (!state.currentUser) return;
    
    if (formEditProfile) formEditProfile.reset();
    if (formChangePassword) formChangePassword.reset();
    if (profilePhotoInput) profilePhotoInput.value = '';
    
    const emailEl = document.getElementById('profile-email');
    const employeeIdEl = document.getElementById('profile-employee-id');
    const phoneEl = document.getElementById('profile-phone-number');
    const divisionEl = document.getElementById('profile-division');
    const departmentEl = document.getElementById('profile-department');
    const lineIdEl = document.getElementById('profile-line-id');

    if (emailEl) emailEl.value = state.currentUser.email || '';
    if (employeeIdEl) employeeIdEl.value = state.currentUser.employee_id || '';
    if (phoneEl) phoneEl.value = state.currentUser.phone_number || '';
    if (divisionEl) divisionEl.value = state.currentUser.division || '';
    if (departmentEl) departmentEl.value = state.currentUser.department || '';
    if (lineIdEl) lineIdEl.value = state.currentUser.line_id || '';
    
    if (profilePreviewImg && profilePreviewPlaceholder) {
      if (state.currentUser.photo_path) {
        profilePreviewImg.src = state.currentUser.photo_path + '?t=' + new Date().getTime();
        profilePreviewImg.classList.remove('hidden');
        profilePreviewPlaceholder.classList.add('hidden');
      } else {
        profilePreviewImg.src = '';
        profilePreviewImg.classList.add('hidden');
        profilePreviewPlaceholder.classList.remove('hidden');
      }
    }
    
    showProfileTab('info');
    const modal = document.getElementById('modal-edit-profile');
    if (modal) modal.showModal();
  };

  const sidebarAvatarContainer = document.getElementById('sidebar-user-avatar-container');
  const sidebarUserInfoArea = document.getElementById('sidebar-user-info-area');
  
  if (sidebarAvatarContainer) {
    sidebarAvatarContainer.addEventListener('click', openEditProfileModal);
  }
  if (sidebarUserInfoArea) {
    sidebarUserInfoArea.addEventListener('click', openEditProfileModal);
  }

  if (formEditProfile) {
    formEditProfile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      const emailVal = document.getElementById('profile-email')?.value || '';
      const employeeIdVal = document.getElementById('profile-employee-id')?.value || '';
      const phoneVal = document.getElementById('profile-phone-number')?.value || '';
      const divisionVal = document.getElementById('profile-division')?.value || '';
      const departmentVal = document.getElementById('profile-department')?.value || '';
      const lineIdVal = document.getElementById('profile-line-id')?.value || '';
      const file = profilePhotoInput?.files?.[0];

      formData.append('email', emailVal);
      formData.append('employee_id', employeeIdVal);
      formData.append('phone_number', phoneVal);
      formData.append('division', divisionVal);
      formData.append('department', departmentVal);
      formData.append('line_id', lineIdVal);
      if (file) {
        formData.append('profile_photo', file);
      }

      try {
        await API.users.updateProfile(formData);
        alert('บันทึกข้อมูลส่วนตัวสำเร็จ');
        const modal = document.getElementById('modal-edit-profile');
        if (modal) modal.close();
        
        // Reload user stats/auth to update sidebar avatar immediately
        await checkAuth();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
      }
    });
  }

  if (formChangePassword) {
    formChangePassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('pwd-current')?.value || '';
      const newPassword = document.getElementById('pwd-new')?.value || '';
      const confirmPassword = document.getElementById('pwd-confirm')?.value || '';

      if (newPassword.length < 6) {
        alert('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }

      try {
        await API.users.changePassword(currentPassword, newPassword);
        alert('เปลี่ยนรหัสผ่านสำเร็จแล้ว');
        formChangePassword.reset();
        const modal = document.getElementById('modal-edit-profile');
        if (modal) modal.close();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน: ' + err.message);
      }
    });
  }

  // ----------------------------------------------------
  // LAUNCH APP CHECK
  // ----------------------------------------------------
  checkAuth();
});
