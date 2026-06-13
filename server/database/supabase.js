import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Create Supabase client for server-side operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function initDatabase() {
  try {
    // Test connection
    const { error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log('✅ Connected to Supabase successfully');
    return supabase;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    throw error;
  }
}

export function getDb() {
  return supabase;
}

export default supabase;
