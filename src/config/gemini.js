// NOTE: Do NOT commit API keys.
// For production, proxy Gemini calls through your backend (e.g., Supabase Edge Function)
// and keep the API key server-side.

import { readEnv } from './env';

export const GEMINI_API_KEY = readEnv('GEMINI_API_KEY');
export const GEMINI_IMAGE_MODEL = readEnv('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image');
