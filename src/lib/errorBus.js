let presenter = null;

export function setGlobalErrorPresenter(fn) {
  presenter = typeof fn === 'function' ? fn : null;
}

export function presentGlobalError(error, options) {
  if (typeof presenter !== 'function') return false;
  try {
    presenter(error, options);
    return true;
  } catch {
    return false;
  }
}
