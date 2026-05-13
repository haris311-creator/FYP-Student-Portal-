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
  getAll: () => api.get('/projects/faculty/?is_active=true'),  // ✅ Correct path
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
// PROPOSAL ENDPOINTS
// =============================================================================
export const proposalAPI = {
  submit: (groupId, proposalData) => 
    api.post(`/projects/groups/${groupId}/proposal/`, proposalData),
  
  uploadSchedule: (proposalId, file) => {
    const formData = new FormData();
    formData.append('project_schedule', file);
    return api.patch(`/projects/proposals/${proposalId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getStatus: (groupId) => api.get(`/projects/groups/${groupId}/proposal/status/`)
};


// =============================================================================
// SUPERVISOR ENDPOINTS - NEW
// =============================================================================
export const supervisorAPI = {
  /**
   * Fetch groups assigned to logged-in supervisor
   * GET /api/projects/groups/supervisor/
   */
  getAssignedGroups: () => api.get('/projects/groups/supervisor/'),
  
  /**
   * Fetch members of a specific group
   * GET /api/projects/groups/supervisor/{groupId}/members/
   */
  getGroupMembers: (groupId) => api.get(`/projects/groups/supervisor/${groupId}/members/`),
  
  /**
   * Update group progress or status (if needed)
   * PATCH /api/projects/groups/{groupId}/
   */
  updateGroup: (groupId, data) => api.patch(`/projects/groups/${groupId}/`, data),
};