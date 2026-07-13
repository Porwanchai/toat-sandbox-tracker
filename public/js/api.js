/* ==========================================================================
   API WRAPPER: TOAT SANDBOX PROJECT PROGRESS TRACKER
   ========================================================================== */

const API = {
  // Authentication
  auth: {
    async me() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Not logged in');
      return res.json();
    },
    async login(username, password) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data;
    },
    async register(username, email, password, employee_id, division, department, line_id, phone_number, user_type, registered_project) {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, employee_id, division, department, line_id, phone_number, user_type, registered_project })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      return data;
    },
    async logout() {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Logout failed');
      return data;
    },
    async forgotPassword(email) {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit password recovery');
      return data;
    }
  },

  // Projects
  projects: {
    async getStats() {
      const res = await fetch('/api/projects/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    },
    async list() {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      return res.json();
    },
    async get(id) {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to load project details');
      return res.json();
    },
    async create(projectData) {
      const isFormData = projectData instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? projectData : JSON.stringify(projectData)
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch('/api/projects', options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      return data;
    },
    async update(id, projectData) {
      const isFormData = projectData instanceof FormData;
      const options = {
        method: 'PUT',
        body: isFormData ? projectData : JSON.stringify(projectData)
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch(`/api/projects/${id}`, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update project');
      return data;
    },
    async delete(id) {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete project');
      return data;
    },
    async toggleHide(id) {
      const res = await fetch(`/api/projects/${id}/toggle-hide`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle visibility');
      return data;
    },
    async toggleSuspend(id) {
      const res = await fetch(`/api/projects/${id}/toggle-suspend`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle suspension');
      return data;
    }
  },

  // Members & Stakeholders
  members: {
    async list(projectId) {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) throw new Error('Failed to load members');
      return res.json();
    },
    async add(projectId, memberData) {
      const isFormData = memberData instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? memberData : JSON.stringify(memberData)
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch(`/api/projects/${projectId}/members`, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      return data;
    },
    async delete(projectId, memberId) {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');
      return data;
    },
    async update(projectId, memberId, memberData) {
      const isFormData = memberData instanceof FormData;
      const options = {
        method: 'PUT',
        body: isFormData ? memberData : JSON.stringify(memberData)
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');
      return data;
    }
  },

  stakeholders: {
    async list(projectId) {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`);
      if (!res.ok) throw new Error('Failed to load stakeholders');
      return res.json();
    },
    async add(projectId, stakeholderData) {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholderData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add stakeholder');
      return data;
    },
    async delete(projectId, stakeholderId) {
      const res = await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove stakeholder');
      return data;
    },
    async update(projectId, stakeholderId, stakeholderData) {
      const res = await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholderData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stakeholder');
      return data;
    }
  },

  // Budgets (uses FormData for file upload)
  budgets: {
    async list(projectId) {
      const res = await fetch(`/api/projects/${projectId}/budgets`);
      if (!res.ok) throw new Error('Failed to load budget list');
      return res.json();
    },
    async add(projectId, formData) {
      const res = await fetch(`/api/projects/${projectId}/budgets`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add budget item');
      return data;
    },
    async delete(projectId, budgetId) {
      const res = await fetch(`/api/projects/${projectId}/budgets/${budgetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove budget item');
      return data;
    },
    async update(projectId, budgetId, formData) {
      const res = await fetch(`/api/projects/${projectId}/budgets/${budgetId}`, {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update budget item');
      return data;
    }
  },

  // Gantt Chart Tasks
  gantt: {
    async list(projectId) {
      const res = await fetch(`/api/projects/${projectId}/gantt`);
      if (!res.ok) throw new Error('Failed to load Gantt tasks');
      return res.json();
    },
    async addOrUpdate(projectId, formData) {
      const res = await fetch(`/api/projects/${projectId}/gantt`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save task');
      return data;
    },
    async delete(projectId, taskId) {
      const res = await fetch(`/api/projects/${projectId}/gantt/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task');
      return data;
    }
  },

  // Monthly Reports
  reports: {
    async list(projectId) {
      const res = await fetch(`/api/projects/${projectId}/reports`);
      if (!res.ok) throw new Error('Failed to load reports');
      return res.json();
    },
    async add(projectId, formData) {
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');
      return data;
    },
    async getDetails(reportId) {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) throw new Error('Failed to load report details');
      return res.json();
    },
    async updateStatus(reportId, status) {
      const res = await fetch(`/api/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update report status');
      return data;
    },
    async addComment(reportId, commentText) {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: commentText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit comment');
      return data;
    },
    async sendReportEmail(reportId, email) {
      const res = await fetch(`/api/reports/${reportId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      return data;
    }
  },

  // Admin settings and users
  admin: {
    async getUsers() {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    },
    async updateUserRole(userId, role) {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role');
      return data;
    },
    async resetPassword(userId, password) {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      return data;
    },
    async updateUserViews(userId, allowedViews) {
      const res = await fetch(`/api/admin/users/${userId}/views`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_views: allowedViews })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update view permissions');
      return data;
    },
    async getSettings() {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to load system settings');
      return res.json();
    },
    async saveSettings(reportDeadlineDay) {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_deadline_day: reportDeadlineDay })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      return data;
    },
    async getAssignments() {
      const res = await fetch('/api/admin/assignments');
      if (!res.ok) throw new Error('Failed to load assignments');
      return res.json();
    },
    async createAssignment(assignmentData) {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create assignment');
      return data;
    },
    async deleteAssignment(id) {
      const res = await fetch(`/api/admin/assignments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete assignment');
      return data;
    },
    async getPendingUsers() {
      const res = await fetch('/api/admin/pending-users');
      if (!res.ok) throw new Error('Failed to load pending users');
      return res.json();
    },
    async approveUser(userId) {
      const res = await fetch(`/api/admin/users/${userId}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve user');
      return data;
    },
    async rejectUser(userId) {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject user');
      return data;
    },
    async triggerDeadlineCheck() {
      const res = await fetch('/api/admin/trigger-deadline-check', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger scanner');
      return data;
    },
    async testEmail(toEmail) {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.details ? `${data.error} (${data.details})` : (data.error || 'Failed to send test email');
        throw new Error(errMsg);
      }
      return data;
    },
    async getNotificationEmails() {
      const res = await fetch('/api/admin/notification-emails');
      if (!res.ok) throw new Error('Failed to load notification emails');
      return res.json();
    },
    async addNotificationEmail(email) {
      const res = await fetch('/api/admin/notification-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add notification email');
      return data;
    },
    async deleteNotificationEmail(id) {
      const res = await fetch(`/api/admin/notification-emails/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete notification email');
      return data;
    }
  },

  // Notifications
  notifications: {
    async list() {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to load notifications');
      return res.json();
    },
    async clear() {
      const res = await fetch('/api/notifications/read', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear notifications');
      return data;
    }
  },

  // Users Profile & Password management
  users: {
    async updateProfile(formData) {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      return data;
    },
    async changePassword(currentPassword, newPassword) {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      return data;
    }
  }
};
