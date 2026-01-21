import { createAppError } from './errors';

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function logIf(...args) {
  if (!isDev()) return;
  // eslint-disable-next-line no-console
  console.warn('[requestJson]', ...args);
}

function combineSignals(signals) {
  const list = (signals || []).filter(Boolean);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];

  const controller = new AbortController();

  const onAbort = () => controller.abort();
  for (const s of list) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    try {
      s.addEventListener?.('abort', onAbort, { once: true });
    } catch {
      // ignore
    }
  }

  return controller.signal;
}

function truncate(value, maxLen = 800) {
  const s = typeof value === 'string' ? value : '';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…(+${s.length - maxLen})`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestJson(
  url,
  { method = 'GET', headers, body, signal, timeoutMs = 20000, timeoutRetries = 0, timeoutBackoffMs = 800 } = {},
) {
  const bodyStr = typeof body === 'string' ? body : '';
  const bodyLen = bodyStr ? bodyStr.length : 0;
  const attempts = Math.max(1, Math.round(Number(timeoutRetries) || 0) + 1);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let timedOut = false;
    const controller = timeoutMs ? new AbortController() : null;
    const timeoutId =
      controller && timeoutMs
        ? setTimeout(() => {
            timedOut = true;
            try {
              controller.abort();
            } catch {
              // ignore
            }
          }, timeoutMs)
        : null;

    const combinedSignal = combineSignals([signal, controller?.signal]);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: combinedSignal,
      });

      const text = await res.text().catch(() => '');
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        logIf('http_error', {
          url,
          method,
          status: res.status,
          bodyLen,
          responseText: truncate(text),
        });
        throw createAppError('http_error', {
          meta: {
            url,
            method,
            status: res.status,
            responseText: truncate(text),
          },
        });
      }

      return data;
    } catch (cause) {
      if (cause?.name === 'AbortError') {
        if (timedOut && !signal?.aborted && attempt < attempts - 1) {
          const delay = Math.max(0, Math.round(Number(timeoutBackoffMs) || 0)) * (attempt + 1);
          logIf('timeout_retry', { url, method, attempt: attempt + 1, timeoutMs, nextDelayMs: delay });
          await sleep(delay);
          continue;
        }
        throw cause;
      }
      logIf('request_failed', {
        url,
        method,
        bodyLen,
        message: cause?.message || String(cause),
        name: cause?.name,
        code: cause?.code,
      });
      throw createAppError('request_failed', { cause, meta: { url, method } });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  throw createAppError('request_failed', { meta: { url, method } });
}
