/**
 * API Configuration
 * Centralized settings for backend communication
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
    signupInitiate: '/api/auth/signup/initiate',
    signupVerify: '/api/auth/signup/verify',
    loginInitiate: '/api/auth/login/initiate',
    loginVerify: '/api/auth/login/verify',
    authVerify: '/api/auth/verify',

    // Phase 1A - Report Decrypt
    reportDecrypt: '/api/report',

    // Phase 1B - Change Phone
    changePhoneInitiate: '/api/auth/change-phone',
    changePhoneVerify: '/api/auth/verify-phone-change',

    // Phase 1C - Panic Alerts
    panicAlert: '/api/panic-alert',
    panicAlertHistory: '/api/panic-alert/history',

    // Phase 1D - Notifications
    notifications: '/api/notifications',
    notificationsUnreadCount: '/api/notifications/unread/count',
    notificationsMarkAllRead: '/api/notifications/mark-all-read',

    // Phase 2A - Search Reports
    searchReports: '/api/search/reports',
    searchStats: '/api/search/stats',

    // Phase 2B - Access / Sharing
    accessGrant: '/api/access/grant',
    accessRevoke: '/api/access/revoke',
    accessSharedWithMe: '/api/access/shared-with-me',
    accessReportViewers: '/api/access/my-report',
    accessViewSharedReport: '/api/access/report',

    // Phase 3A - Key Recovery
    keysBackup: '/api/keys/backup',
    keysRecover: '/api/keys/recover',

    // Phase 3B - Forgot Phone Recovery
    forgotPhone: '/api/auth/forgot-phone',
    verifyRecovery: '/api/auth/verify-recovery',
    changePhoneRecovery: '/api/auth/change-phone/recovery',
    verifyPhoneChangeRecovery: '/api/auth/verify-phone-change/recovery',

    // PIN Management
    setPin: '/api/auth/set-pin',  // Set or change PIN in settings

    // Account Management
    deleteAccount: '/api/auth/delete-account',  // Delete user account (authenticated)
    logout: '/api/auth/logout',  // Logout (authenticated)

    // Report Management
    unarchiveReport: '/api/report/:reportId/unarchive',  // Unarchive a report
  },
};
