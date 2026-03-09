/**
 * User-friendly error messages based on error codes/status
 * Converts technical errors to readable messages for users
 */

export interface ErrorInfo {
  title: string;
  message: string;
  action?: string; // What user should do
}

export function getErrorMessage(error: any): ErrorInfo {
  // Check for HTTP status codes
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const errorMsg = error?.response?.data?.message || error?.message || '';

  // 401 - Authentication errors
  if (status === 401) {
    return {
      title: 'Session Expired',
      message: "You've been logged out due to inactivity. Please log in again.",
      action: 'Log In',
    };
  }

  // 403 - Forbidden
  if (status === 403) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
    };
  }

  // 404 - Not found
  if (status === 404) {
    return {
      title: 'Not Found',
      message: 'The resource you are looking for does not exist.',
    };
  }

  // 400 - Bad request
  if (status === 400) {
    return {
      title: 'Invalid Request',
      message: errorMsg || 'Please check your input and try again.',
    };
  }

  // 500 - Server error
  if (status === 500) {
    return {
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
    };
  }

  // 502, 503, 504 - Service unavailable
  if ([502, 503, 504].includes(status)) {
    return {
      title: 'Service Unavailable',
      message: 'The service is temporarily unavailable. Please try again later.',
    };
  }

  // Network errors
  if (error?.message?.includes('Network') || error?.message?.includes('timeout')) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
    };
  }

  // Specific error codes
  if (code === 'TOKEN_EXPIRED') {
    return {
      title: 'Session Expired',
      message: "Your session has expired. Please log in again.",
      action: 'Log In',
    };
  }

  if (code === 'INVALID_TOKEN') {
    return {
      title: 'Authentication Error',
      message: 'Your authentication is invalid. Please log in again.',
      action: 'Log In',
    };
  }

  if (code === 'USER_NOT_FOUND') {
    return {
      title: 'User Not Found',
      message: 'The user account does not exist.',
    };
  }

  if (code === 'INVALID_CREDENTIALS') {
    return {
      title: 'Login Failed',
      message: 'Your phone number or PIN is incorrect.',
    };
  }

  // Generic fallback
  return {
    title: 'Error',
    message: errorMsg || 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Check if error is critical (requires immediate action)
 * vs non-critical (can be ignored or retried silently)
 */
export function isCriticalError(error: any): boolean {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;

  // 401/403 are critical - require user action
  if ([401, 403].includes(status)) {
    return true;
  }

  // 5xx errors are critical
  if (status && status >= 500) {
    return true;
  }

  // Token-related errors are critical
  if (['TOKEN_EXPIRED', 'INVALID_TOKEN'].includes(code)) {
    return true;
  }

  // Network errors are critical
  if (error?.message?.includes('Network') || error?.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Check if error is temporary (can retry)
 */
export function isTemporaryError(error: any): boolean {
  const status = error?.response?.status;

  // Timeout, network errors, 503 are temporary
  if (error?.message?.includes('timeout') ||
      error?.message?.includes('Network') ||
      status === 503) {
    return true;
  }

  return false;
}
