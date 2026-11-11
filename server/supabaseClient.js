// server/supabaseClient.js
// Optional adapter for Supabase integration in cloud production environments
export const isSupabaseConfigured = () => {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
};

export async function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  // Lazy import if configured
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch (err) {
    console.warn('[Supabase] @supabase/supabase-js not installed or configuration missing. Falling back to local store.');
    return null;
  }
}
