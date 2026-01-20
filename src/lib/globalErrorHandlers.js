import { presentGlobalError } from './errorBus';
import { reportError } from './errorReporting';

function getErrorUtils() {
  return global?.ErrorUtils;
}

export function installGlobalErrorHandlers() {
  const ErrorUtils = getErrorUtils();
  const defaultHandler = ErrorUtils?.getGlobalHandler?.();

  const handler = (error, isFatal) => {
    const shown = presentGlobalError(error, { source: 'ErrorUtils', isFatal: Boolean(isFatal) });
    if (!shown) reportError(error, { source: 'ErrorUtils', isFatal: Boolean(isFatal) });

    // Keep RN's default behavior (RedBox in dev / crash reporting in prod)
    if (typeof defaultHandler === 'function') {
      defaultHandler(error, isFatal);
    }
  };

  if (ErrorUtils?.setGlobalHandler) {
    ErrorUtils.setGlobalHandler(handler);
  }

  const prevUnhandled = global?.onunhandledrejection;
  try {
    // Best-effort: some RN runtimes don’t surface this.
    global.onunhandledrejection = (event) => {
      const reason = event?.reason ?? event;
      const shown = presentGlobalError(reason, { source: 'unhandledrejection' });
      if (!shown) reportError(reason, { source: 'unhandledrejection' });
      if (typeof prevUnhandled === 'function') prevUnhandled(event);
    };
  } catch {
    // ignore
  }

  return () => {
    try {
      if (ErrorUtils?.setGlobalHandler && typeof defaultHandler === 'function') {
        ErrorUtils.setGlobalHandler(defaultHandler);
      }
      if (typeof prevUnhandled === 'function') {
        global.onunhandledrejection = prevUnhandled;
      }
    } catch {
      // ignore
    }
  };
}
