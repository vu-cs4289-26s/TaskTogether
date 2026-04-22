type ApiErrorLike = {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      } | string;
      message?: string;
    };
  };
  message?: string;
  code?: string;
};

export function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorLike;
  const responseError = err.response?.data?.error;

  if (typeof responseError === 'object' && responseError?.message) {
    return responseError.message;
  }

  if (typeof responseError === 'string') {
    return responseError;
  }

  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (err.message && err.message !== 'Network Error') {
    return err.message;
  }

  if (err.message === 'Network Error' || !err.response) {
    return 'Could not reach the server. Make sure the backend is running, then try again.';
  }

  return fallback;
}
