import { createLogger } from '../logger';
import { toErrorLogMeta } from './errors';

const logger = createLogger('Errors');

export function reportError(error, context) {
  logger.error('unhandled', { ...toErrorLogMeta(error), context });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(error);
  }
}
