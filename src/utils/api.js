// src/utils/api.js
// Client API helper for quiz backend endpoints

const API_BASE = '/api';

export function getAdminToken() {
  return localStorage.getItem('pragyan_admin_token') || '';
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem('pragyan_admin_token', token);
  } else {
    localStorage.removeItem('pragyan_admin_token');
  }
}

async function request(endpoint, options = {}) {
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAdminToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response;
}

export const api = {
  // Public Quiz Endpoints
  getQuizInfo: () => request('/quiz/info'),
  checkDeviceAttempt: (payload) => request('/quiz/check-device-attempt', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  registerAndStart: (payload) => request('/quiz/register-and-start', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  restoreSession: (attemptId) => request(`/quiz/restore-session/${attemptId}`),
  saveAnswer: (payload) => request('/quiz/save-answer', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  logTabSwitch: (payload) => request('/quiz/log-tab-switch', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  submitQuiz: (payload) => request('/quiz/submit', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getResult: (attemptId) => request(`/quiz/result/${attemptId}`),

  // Admin Endpoints
  adminLogin: (password) => request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  getSettings: () => request('/admin/settings'),
  updateSettings: (settings) => request('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),
  resetSettingsToDefault: () => request('/admin/settings/reset-defaults', {
    method: 'POST'
  }),
  extendActiveTime: (additionalMinutes) => request('/admin/extend-active-time', {
    method: 'POST',
    body: JSON.stringify({ additionalMinutes })
  }),
  toggleQuiz: () => request('/admin/toggle-quiz', {
    method: 'POST'
  }),
  uploadPdf: (formData) => request('/admin/questions/upload-pdf', {
    method: 'POST',
    body: formData
  }),
  uploadCsv: (formData) => request('/admin/questions/upload-csv', {
    method: 'POST',
    body: formData
  }),
  getStagingQuestions: () => request('/admin/staging-questions'),
  updateStagingQuestions: (stagingQuestions) => request('/admin/staging-questions', {
    method: 'PUT',
    body: JSON.stringify({ stagingQuestions })
  }),
  publishStagingQuestions: (replaceExisting = false) => request('/admin/staging-questions/publish', {
    method: 'POST',
    body: JSON.stringify({ replaceExisting })
  }),
  getQuestions: () => request('/admin/questions'),
  createQuestion: (q) => request('/admin/questions', {
    method: 'POST',
    body: JSON.stringify(q)
  }),
  updateQuestion: (id, q) => request(`/admin/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(q)
  }),
  deleteQuestion: (id) => request(`/admin/questions/${id}`, {
    method: 'DELETE'
  }),
  getAdminResults: () => request('/admin/results'),
  getParticipantDetail: (attemptId) => request(`/admin/participant/${attemptId}`),
  resetAttempt: (attemptId) => request(`/admin/reset-attempt/${attemptId}`, {
    method: 'POST'
  }),
  getDashboard: () => request('/admin/dashboard')
};
