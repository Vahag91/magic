export const GENERIC_ERROR_TITLE = 'Something went wrong';
export const GENERIC_ERROR_MESSAGE = 'Please try again.';

export function isAbortError(error) {
  return Boolean(error && (error.name === 'AbortError' || error.code === 'ERR_CANCELED'));
}

export function createAppError(code, { cause, meta } = {}) {
  const err = new Error(code || 'app_error');
  err.name = 'AppError';
  err.code = code || 'app_error';
  err.cause = cause;
  err.meta = meta;
  err.isAppError = true;
  return err;
}

export function toErrorLogMeta(error) {
  if (!error) return { name: 'UnknownError', message: '', stack: '' };

  const name = String(error.name || 'Error');
  const message = String(error.message || '');
  const stack = typeof error.stack === 'string' ? error.stack : '';
  const code = error.code != null ? String(error.code) : undefined;

  const cause = error.cause;
  const causeName = cause?.name ? String(cause.name) : undefined;
  const causeMessage = cause?.message ? String(cause.message) : undefined;

  return {
    name,
    code,
    message,
    stack,
    causeName,
    causeMessage,
    meta: error.meta,
  };
}

