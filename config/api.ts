/**
 * API Configuration
 * Centralized settings for backend communication
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second

  // Status polling
  statusPolling: {
    interval: 30000, // 30 seconds
    maxDuration: 300000, // 5 minutes
    confirmationThreshold: 12, // blockchain confirmations
  },

  // API endpoints
  endpoints: {
    health: '/api/health',
    submitReport: '/api/submitReport',
    reportStatus: '/api/reportStatus',
  },
};
