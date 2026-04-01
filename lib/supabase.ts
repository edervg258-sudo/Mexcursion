// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://qdetjpnzwvdjzwlgswtz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXRqcG56d3Zkanp3bGdzd3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDA2NjcsImV4cCI6MjA5MDQ3NjY2N30.l70qphCQezBDc5XVfUkknUa_ImhmknNrnQmoZHZMv4M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});