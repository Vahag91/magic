import { createAppError } from './errors';

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

export async function requestJson(url, { method = 'GET', headers, body, signal, timeoutMs = 20000 } = {}) {
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId =
    controller && timeoutMs
      ? setTimeout(() => {
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
    if (cause?.name === 'AbortError') throw cause;
    throw createAppError('request_failed', { cause, meta: { url, method } });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

