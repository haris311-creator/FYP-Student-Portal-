// src/utils/api.js
import axios from 'axios';

// =============================================================================
// 1. AXIOS INSTANCE CREATE KAREIN (Default Export)
// =============================================================================
const api = axios.create({
  baseURL: 'http://localhost:8000/api',  // Django backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Har request mein JWT token auto-add karega
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Token refresh handle karega (401 error par)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Agar token expire ho gaya hai (401) aur retry nahi kiya
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('http://localhost:8000/api/token/refresh/', {
          refresh: refreshToken
        });
        
        // Naya token save karein
        localStorage.setItem('access_token', response.data.access);
        
        // Original request ko naye token ke saath retry karein
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh bhi fail hua → logout karein
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ✅ DEFAULT EXPORT (Isi ki wajah se import api from './api' kaam karega)
export default api;


// =============================================================================
// 2. NAMED EXPORTS - Specific API Functions
// =============================================================================

/**
 * Direct login function
 */
export const loginAPI = async (email, password) => {
  try {
    const response = await fetch('http://localhost:8000/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Login failed');
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// =============================================================================
// FACULTY ENDPOINTS
// =============================================================================
export const facultyAPI = {
  getAll: () => api.get('/projects/faculty/?is_active=true'),
  getById: (id) => api.get(`/projects/faculty/${id}/`),
};

// =============================================================================
// GROUP FORMATION ENDPOINTS
// =============================================================================
export const groupAPI = {
  create: (groupData) => api.post('/projects/groups/', groupData),
  addMember: (groupId, memberData) => 
    api.post(`/projects/groups/${groupId}/members/`, memberData),
  
  checkEligibility: (cgpa, creditHours, prerequisites) =>
    api.post('/projects/check-eligibility/', {
      cgpa,
      earned_credit_hours: creditHours,
      prerequisites_completed: prerequisites
    }),
  
  submitPermission: (memberId, file) => {
    const formData = new FormData();
    formData.append('permission_document', file);
    return api.patch(`/projects/groups/members/${memberId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// =============================================================================
// PROPOSAL ENDPOINTS - UPDATED FOR FILE UPLOAD & REVIEW WORKFLOW
// =============================================================================
export const proposalAPI = {
  // Get a specific proposal by ID
  getProposal: (proposalId) => api.get(`/projects/proposals/${proposalId}/`),

  // Student: Upload proposal file (FormData)
  uploadProposal: (proposalId, formData) => {
    return api.post(`/projects/proposals/${proposalId}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Supervisor: Get proposals pending their review
  getPendingSupervisor: () => api.get('/projects/proposals/pending-supervisor/'),

  // Supervisor: Approve or request revision
  supervisorReview: (proposalId, data) => 
    api.post(`/projects/proposals/${proposalId}/supervisor-review/`, data),

  // Admin: Get proposals pending final approval
  getPendingAdmin: () => api.get('/projects/proposals/pending-admin/'),

  // Admin: Final approve or reject
  adminReview: (proposalId, data) => 
    api.post(`/projects/proposals/${proposalId}/admin-review/`, data),

  // Legacy/Other methods (keeping just in case)
  uploadSchedule: (proposalId, file) => {
    const formData = new FormData();
    formData.append('project_schedule', file);
    return api.patch(`/projects/proposals/${proposalId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// =============================================================================
// SUPERVISOR ENDPOINTS
// =============================================================================
export const supervisorAPI = {
  getAssignedGroups: () => api.get('/projects/groups/supervisor/'),
  getGroupMembers: (groupId) => api.get(`/projects/groups/supervisor/${groupId}/members/`),
  updateGroup: (groupId, data) => api.patch(`/projects/groups/${groupId}/`, data),
};

// =============================================================================
// MEETING MINUTES ENDPOINTS
// =============================================================================
export const meetingAPI = {
  getByGroup: (groupId) => api.get(`/projects/meetings/?group_id=${groupId}`),
  
  create: (group, meetingData) => {
    const payload = {
      ...meetingData,
      group: group.id
    };
    return api.post('/projects/meetings/', payload);
  },
  
  update: (meetingId, meetingData) => 
    api.put(`/projects/meetings/${meetingId}/`, meetingData),
  
  getAttendanceSummary: (meetingId) => 
    api.get(`/projects/meetings/${meetingId}/attendance_summary/`),
};

// =============================================================================
// ATTENDANCE SHEET ENDPOINTS
// =============================================================================
export const attendanceSheetAPI = {
  getSheet: (groupId) => api.get(`/projects/attendance-sheet/${groupId}/`),
  
  exportExcel: (groupId) => 
    api.get(`/projects/attendance-sheet/${groupId}/export-excel/`, {
      responseType: 'blob'
    }),
};

// =============================================================================
// STUDENT MEETING ENDPOINTS
// =============================================================================
export const studentMeetingAPI = {
  getMyMeetings: () => api.get('/projects/students/my-meetings/'),
};