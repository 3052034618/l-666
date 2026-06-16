import axios from 'axios';
import type {
  User,
  SimulationTask,
  Alert,
  Approval,
  Report,
  Recommendation,
  DashboardStats,
  LoginRequest,
  LoginResponse,
  TaskParams,
  ValidationResult,
  PaginatedResponse,
} from '../../shared/types.js';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data).then((r) => r.data),
  getMe: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const tasksAPI = {
  getTasks: (params?: { status?: string; page?: number; size?: number }) =>
    api.get<PaginatedResponse<SimulationTask>>('/tasks', { params }).then((r) => r.data),
  getTask: (id: string) => api.get<SimulationTask>(`/tasks/${id}`).then((r) => r.data),
  createTask: (data: { name: string; description: string; params: TaskParams }) =>
    api.post<SimulationTask>('/tasks', data).then((r) => r.data),
  cancelTask: (id: string) => api.put<SimulationTask>(`/tasks/${id}/cancel`).then((r) => r.data),
  getMonitorData: (id: string) =>
    api.get(`/tasks/${id}/monitor`).then((r) => r.data),
  getAdjustments: (id: string) => api.get(`/tasks/${id}/adjustments`).then((r) => r.data),
  getTaskTimeline: (id: string) => api.get(`/tasks/${id}/timeline`).then((r) => r.data),
};

export const alertsAPI = {
  getAlerts: (params?: { level?: string; status?: string }) =>
    api.get<Alert[]>('/alerts', { params }).then((r) => r.data),
  getAlert: (id: string) => api.get<Alert>(`/alerts/${id}`).then((r) => r.data),
  reviewAlert: (id: string, data: { comment: string; adjustmentParams?: any }) =>
    api.put<Alert>(`/alerts/${id}/review`, data).then((r) => r.data),
  resolveAlert: (id: string) => api.put<Alert>(`/alerts/${id}/resolve`).then((r) => r.data),
};

export const approvalsAPI = {
  getApprovals: (params?: { level?: number; status?: string }) =>
    api.get<Approval[]>('/approvals', { params }).then((r) => r.data),
  processApproval: (id: string, data: { status: string; comment: string }) =>
    api.put<Approval>(`/approvals/${id}`, data).then((r) => r.data),
  pushToRegulatory: (taskId: string) =>
    api.post(`/approvals/push/${taskId}`).then((r) => r.data),
};

export const reportsAPI = {
  getReports: (taskId?: string) => api.get<Report[]>('/reports', { params: { taskId } }).then((r) => r.data),
  createReport: (data: { taskId: string; type: string }) =>
    api.post<Report>('/reports', data).then((r) => r.data),
  downloadReport: (id: string) => api.get(`/reports/${id}/download`).then((r) => r.data),
};

export const pushRecordsAPI = {
  getPushRecords: () => api.get<any[]>('/push-records').then((r) => r.data),
  getPushRecord: (id: string) => api.get(`/push-records/${id}`).then((r) => r.data),
  retryPush: (id: string) => api.post(`/push-records/${id}/retry`).then((r) => r.data),
};

export const dashboardAPI = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
};

export const usersAPI = {
  getUsers: () => api.get<User[]>('/users').then((r) => r.data),
  createUser: (data: any) => api.post<User>('/users', data).then((r) => r.data),
  updateUser: (id: string, data: any) => api.put<User>(`/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

export const uploadAPI = {
  uploadFiles: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  validateFile: (fileId: string) =>
    api.get<ValidationResult>(`/upload/validate/${fileId}`).then((r) => r.data),
};

export const recommendationsAPI = {
  getRecommendations: () => api.get<Recommendation[]>('/recommendations').then((r) => r.data),
  createRecommendation: (data: any) =>
    api.post<Recommendation>('/recommendations', data).then((r) => r.data),
};

export const exportAPI = {
  getExportOptions: (taskId: string) => api.get(`/export/preview/${taskId}`).then((r) => r.data),
  exportData: (data: any) => api.post('/export', data).then((r) => r.data),
};

export default api;
