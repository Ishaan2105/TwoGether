import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('twogether_token') || localStorage.getItem('duohabit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear the token and let AuthContext react
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('twogether_token');
      localStorage.removeItem('duohabit_token');
      window.dispatchEvent(new Event('twogether:unauthorized'));
      window.dispatchEvent(new Event('duohabit:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;