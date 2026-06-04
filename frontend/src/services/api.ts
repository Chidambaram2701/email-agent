import axios from 'axios';

// Get backend API URL (fallback to localhost:8000 for local development)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 second timeout for model processing endpoints
});

// Response interceptor for unified error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg = error.response?.data?.detail || error.message || 'An unknown error occurred';
    console.error('API Error:', errorMsg);
    // Custom throw to parse cleanly in React components
    return Promise.reject(new Error(errorMsg));
  }
);

export default api;
export { API_BASE_URL };
