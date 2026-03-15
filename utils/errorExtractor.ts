/**
 * Utility to extract backend error messages consistently
 * Backend always returns: { "error": true, "message": "..." }
 */

export function extractErrorMessage(
  error: any,
  defaultMessage: string = "An error occurred",
): string {
  if (error?.response?.data) {
    const responseData = error.response.data;

    if (responseData.message) {
      return responseData.message;
    }

    if (typeof responseData.error === "string") {
      return responseData.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}
