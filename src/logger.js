const DEFAULT_ENABLED = false;

const timers = new Map();

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function truncateString(value, maxLen = 600) {
  if (typeof value !== 'string') return value;
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…(+${value.length - maxLen})`;
}

function sanitizeMeta(meta) {
  if (!meta) return undefined;
  if (typeof meta !== 'object') return truncateString(meta);

  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value == null) {
      out[key] = value;
    } else if (typeof value === 'string') {
      out[key] = truncateString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map(v => truncateString(v));
    } else {
      out[key] = safeStringify(value);
    }
  }
  return out;
}

function isEnabled() {
  // Allow runtime override:
  // globalThis.__MAGICSTUDIO_LOGS__ = true/false
  // eslint-disable-next-line no-undef
  const override = globalThis?.__MAGICSTUDIO_LOGS__;
  if (typeof override === 'boolean') return override;
  return DEFAULT_ENABLED;
}

export function createLogger(scope) {
  const prefix = `[MagicStudio][${scope}]`;

  function emit(level, event, meta) {
    if (!isEnabled()) return;
    const payload = sanitizeMeta(meta);
    const msg = payload ? `${prefix} ${event} ${safeStringify(payload)}` : `${prefix} ${event}`;
    (console[level] || console.log)(msg);
  }

  function time(label, meta) {
    const key = `${scope}:${label}`;
    timers.set(key, { t0: Date.now(), meta });
    emit('log', `${label}:start`, meta);
  }

  function timeEnd(label, extraMeta) {
    const key = `${scope}:${label}`;
    const entry = timers.get(key);
    const t1 = Date.now();
    if (!entry) {
      emit('warn', `${label}:end_without_start`, extraMeta);
      return;
    }
    timers.delete(key);
    emit('log', `${label}:end`, { ...entry.meta, ...extraMeta, ms: t1 - entry.t0 });
  }

  return {
    log: (event, meta) => emit('log', event, meta),
    warn: (event, meta) => emit('warn', event, meta),
    error: (event, meta) => emit('error', event, meta),
    time,
    timeEnd,
  };
}
