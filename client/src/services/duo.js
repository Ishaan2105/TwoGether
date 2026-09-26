import api from './api.js';

export async function getMyDuo() {
  const { data } = await api.get('/duo/me');
  return data.data; // { duo, partner }
}

export async function lookupCode(code) {
  const { data } = await api.post('/duo/lookup', { code });
  return data.data; // { partner }
}

export async function pairWithCode(code) {
  const { data } = await api.post('/duo/pair', { code });
  return data.data; // { duo, partner }
}

export async function sendNudge(type, message = '') {
  const { data } = await api.post('/duo/nudge', { type, message });
  return data.data; // { duo, type, message }
}

export async function unpairDuo() {
  const { data } = await api.post('/duo/unpair');
  return data.data;
}

export async function getDuoShells(date) {
  const params = date ? { date } : {};
  const { data } = await api.get('/duo/shells', { params });
  return data.data; // { todayStr, partner, sharedShells, soloShells, stats }
}

export async function getLeaderboards() {
  const { data } = await api.get('/duo/leaderboards');
  return data.data; // { soloLeaderboard, duoLeaderboard, currentUserId, currentDuoId }
}

export async function evaluateStreak(date) {
  const { data } = await api.post('/duo/evaluate-streak', date ? { date } : {});
  return data.data;
}

export async function triggerMidnightCron(date) {
  const { data } = await api.post('/duo/midnight-cron', date ? { date } : {});
  return data.data;
}

/** Get all custom categories shared between duo partners */
export async function getDuoCustomCategories() {
  const { data } = await api.get('/duo/custom-categories');
  return data.customCategories || []; // [{ name, isOwn, createdByUsername }]
}

/** Add a new custom category to the shared duo pool */
export async function addDuoCustomCategory(name) {
  const { data } = await api.post('/duo/custom-categories', { name });
  return data.customCategories || []; // full updated list
}
