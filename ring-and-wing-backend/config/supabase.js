const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Use secret key for backend

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Warning: Missing Supabase environment variables. Storage features will be disabled.');
  console.warn('[Supabase] Please set SUPABASE_URL and SUPABASE_SECRET_KEY to enable cloud storage.');
  
  // Return a mock client that will throw errors if used
  module.exports = {
    storage: {
      from: () => {
        throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY environment variables.');
      },
      listBuckets: () => {
        throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY environment variables.');
      }
    }
  };
} else {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('[Supabase] Client initialized successfully');
  module.exports = supabase;
}
