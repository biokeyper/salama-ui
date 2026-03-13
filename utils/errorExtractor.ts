/**
 * Utility to extract backend error messages consistently
 * Backend always returns: { "error": true, "message": "..." }
 */

export function extractErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // Check if it's an Axios error
  if (error?.response?.data) {
    const responseData = error.response.data;

    // Backend returns { error: true, message: "..." }
    if (responseData.message) {
      return responseData.message;
    }

    // Fallback to error field if it's a string
    if (typeof responseData.error === 'string') {
      return responseData.error;
    }
  }

  // Fallback to error message
  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}
