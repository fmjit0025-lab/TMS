import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401 (expired / invalid token)
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }).then(r => r.data),
};

export const permissionsApi = {
  catalog: () => api.get('/permissions').then(r => r.data),
  forUser: (userId) => api.get(`/permissions/user/${userId}`).then(r => r.data),
  setForUser: (userId, permissions) =>
    api.put(`/permissions/user/${userId}`, { permissions }).then(r => r.data),
};

export const usersApi = {
  list: () => api.get('/users').then(r => r.data),
  create: (d) => api.post('/users', d).then(r => r.data),
  update: (id, d) => api.put(`/users/${id}`, d).then(r => r.data),
  remove: (id) => api.delete(`/users/${id}`).then(r => r.data),
};

export const aodApi = {
  list: (params) => api.get('/aod', { params }).then(r => r.data),
  create: (d) => api.post('/aod', d).then(r => r.data),
  update: (d) => api.put('/aod', d).then(r => r.data),
  remove: (AODno, ProductCode) => api.delete('/aod', { params: { AODno, ProductCode } }).then(r => r.data),
  remaining: (AODno, ProductCode) =>
    api.get(`/aod/remaining/${encodeURIComponent(AODno)}/${encodeURIComponent(ProductCode)}`).then(r => r.data),
};

export const secondCopyApi = {
  list: (params) => api.get('/aod-secondcopy', { params }).then(r => r.data),
  create: (d) => api.post('/aod-secondcopy', d).then(r => r.data),
  update: (d) => api.put('/aod-secondcopy', d).then(r => r.data),
  remove: (AODno, ProductCode) => api.delete('/aod-secondcopy', { params: { AODno, ProductCode } }).then(r => r.data),
};

export const invoiceApi = {
  list: (params) => api.get('/invoices', { params }).then(r => r.data),
  create: (d) => api.post('/invoices', d).then(r => r.data),
  update: (d) => api.put('/invoices', d).then(r => r.data),
  remove: (Invno, ProductCode) => api.delete('/invoices', { params: { Invno, ProductCode } }).then(r => r.data),
};

export const returnsApi = {
  list: (params) => api.get('/returns', { params }).then(r => r.data),
  get: (id) => api.get(`/returns/${id}`).then(r => r.data),
  create: (d) => api.post('/returns', d).then(r => r.data),
  update: (id, d) => api.put(`/returns/${id}`, d).then(r => r.data),
  remove: (id) => api.delete(`/returns/${id}`).then(r => r.data),
};

export const qcApi = {
  byReturn: (id) => api.get(`/qc/${id}`).then(r => r.data),
  create: (d) => api.post('/qc', d).then(r => r.data),
};

export const replacementsApi = {
  list: (params) => api.get('/replacements', { params }).then(r => r.data),
  create: (d) => api.post('/replacements', d).then(r => r.data),
  update: (id, d) => api.put(`/replacements/${id}`, d).then(r => r.data),
  remove: (id) => api.delete(`/replacements/${id}`).then(r => r.data),
  pipeline: (aodno) => api.get(`/replacements/pipeline/${encodeURIComponent(aodno)}`).then(r => r.data),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
  funnel: () => api.get('/dashboard/funnel').then(r => r.data),
};

export const importApi = {
  aod: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/import/aod', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  invoice: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/import/invoice', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
};

export default api;