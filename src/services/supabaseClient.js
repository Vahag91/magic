import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { decode, encode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_BASE } from '../config/supabase';

if (typeof global.btoa === 'undefined') global.btoa = encode;
if (typeof global.atob === 'undefined') global.atob = decode;

export const supabase = createClient(SUPABASE_BASE, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

