import api from './api.js';

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data.data; // { token, user }
}

export async function login(identifier, password) {
  const { data } = await api.post('/auth/login', { identifier, password });
  return data.data; // { token, user }
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data.data; // { user }
}

export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
  return data;
}