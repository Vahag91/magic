import * as React from 'react';
import ErrorModal from '../components/ErrorModal';
import { setGlobalErrorPresenter } from '../lib/errorBus';
import { installGlobalErrorHandlers } from '../lib/globalErrorHandlers';
import { GENERIC_ERROR_MESSAGE, GENERIC_ERROR_TITLE } from '../lib/errors';
import { reportError } from '../lib/errorReporting';

const ErrorContext = React.createContext(null);

export function useError() {
  const ctx = React.useContext(ErrorContext);
  if (!ctx) throw new Error('useError must be used within ErrorProvider');
  return ctx;
}

export function ErrorProvider({ children }) {
  const [state, setState] = React.useState({
    visible: false,
    title: GENERIC_ERROR_TITLE,
    message: GENERIC_ERROR_MESSAGE,
    retry: null,
    retryLabel: 'Retry',
  });

  const hideError = React.useCallback(() => {
    setState(prev => ({ ...prev, visible: false, retry: null }));
  }, []);

  const showError = React.useCallback(
    ({ title = GENERIC_ERROR_TITLE, message = GENERIC_ERROR_MESSAGE, retry, retryLabel = 'Retry' } = {}) => {
      setState({
        visible: true,
        title,
        message,
        retry: typeof retry === 'function' ? retry : null,
        retryLabel,
      });
    },
    [],
  );

  const showAppError = React.useCallback(
    (error, { retry, retryLabel } = {}) => {
      reportError(error, { source: 'showAppError' });
      showError({ title: GENERIC_ERROR_TITLE, message: GENERIC_ERROR_MESSAGE, retry, retryLabel });
    },
    [showError],
  );

  React.useEffect(() => {
    setGlobalErrorPresenter(showAppError);
    const uninstall = installGlobalErrorHandlers();
    return () => {
      setGlobalErrorPresenter(null);
      uninstall?.();
    };
  }, [showAppError]);

  const value = React.useMemo(
    () => ({
      showError,
      showAppError,
      hideError,
    }),
    [hideError, showAppError, showError],
  );

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ErrorModal
        visible={state.visible}
        title={state.title}
        message={state.message}
        onRetry={state.retry}
        retryLabel={state.retryLabel}
        onClose={hideError}
      />
    </ErrorContext.Provider>
  );
}

