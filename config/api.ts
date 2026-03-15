const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiConfig = {
  baseURL: API_URL,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,

  statusPolling: {
    interval: 30000,
    maxDuration: 300000,
    confirmationThreshold: 12,
  },

  endpoints: {
    health: '/api/health',
    submitReport: '/api/submitReport',
    reportStatus: '/api/reportStatus',
    signupInitiate: '/api/auth/signup/initiate',
    signupVerify: '/api/auth/signup/verify',
    loginInitiate: '/api/auth/login/initiate',
    loginVerify: '/api/auth/login/verify',
    authVerify: '/api/auth/verify',

    reportDecrypt: '/api/report',

    changePhoneInitiate: '/api/auth/change-phone',
    changePhoneVerify: '/api/auth/verify-phone-change',

    panicAlert: '/api/panic-alert',
    panicAlertHistory: '/api/panic-alert/history',

    notifications: '/api/notifications',
    notificationsUnreadCount: '/api/notifications/unread/count',
    notificationsMarkAllRead: '/api/notifications/mark-all-read',

    searchReports: '/api/search/reports',
    searchStats: '/api/search/stats',

    accessGrant: '/api/access/grant',
    accessRevoke: '/api/access/revoke',
    accessMySharedReports: '/api/access/my-shared-reports',
    accessSharedWithMe: '/api/access/shared-with-me',
    accessReportViewers: '/api/access/my-report',
    accessViewSharedReport: '/api/access/report',

    keysBackup: '/api/keys/backup',
    keysRecover: '/api/keys/recover',

    forgotPhone: '/api/auth/forgot-phone',
    verifyRecovery: '/api/auth/verify-recovery',
    changePhoneRecovery: '/api/auth/change-phone/recovery',
    verifyPhoneChangeRecovery: '/api/auth/verify-phone-change/recovery',

    setPin: '/api/auth/set-pin',

    deleteAccount: '/api/auth/delete-account',
    logout: '/api/auth/logout',

    unarchiveReport: '/api/report/:reportId/unarchive',
  },
};
