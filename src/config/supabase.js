import { readEnv } from './env';

export const SUPABASE_BASE = readEnv('SUPABASE_BASE');
export const SUPABASE_ANON_KEY = readEnv('SUPABASE_ANON_KEY');
export const isSupabaseConfigured = Boolean(SUPABASE_BASE && SUPABASE_ANON_KEY);

export function createSupabaseConfigError() {
  const err = new Error(
    'Supabase is not configured. Set SUPABASE_BASE and SUPABASE_ANON_KEY in .env, then restart Metro.',
  );
  err.code = 'supabase_not_configured';
  return err;
}
