import api from './api.js';

export async function getHabits(date, status = 'all') {
  const params = {};
  if (date) params.date = date;
  if (status) params.status = status;
  const { data } = await api.get('/habits', { params });
  return data.data; // { habits, summary }
}

export async function createHabit(payload) {
  const { data } = await api.post('/habits', payload);
  return data.data; // { habit }
}

export async function updateHabit(id, payload) {
  const { data } = await api.put(`/habits/${id}`, payload);
  return data.data; // { habit }
}

export async function deleteHabit(id) {
  const { data } = await api.delete(`/habits/${id}`);
  return data.data; // { message }
}

export async function toggleHabit(id, date) {
  const { data } = await api.post(`/habits/${id}/toggle`, { date });
  return data.data; // { habit, user, message }
}

export async function closeHabit(id, objectiveNote = '') {
  const { data } = await api.post(`/habits/${id}/close`, { objectiveNote });
  return data.data; // { habit, bonusAwarded, user, message }
}

export async function reopenHabit(id) {
  const { data } = await api.post(`/habits/${id}/reopen`);
  return data.data; // { habit, message }
}

