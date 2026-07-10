// Supabase browser configuration.
// The publishable/anon key is designed for browser use when Row Level Security is enabled.
// NEVER place a Supabase secret key or service_role key in this file.
export const APP_CONFIG = {
  SUPABASE_URL: "https://mnjcpahbcnbaptkkwkgv.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_IuRQUaWZ18-QTFRfj9hpCA_JMeFOCZG",
  TABLE_NAME: "project_submissions",
};

export function isSupabaseConfigured() {
  return (
    APP_CONFIG.SUPABASE_URL.startsWith("https://") &&
    !APP_CONFIG.SUPABASE_URL.includes("PASTE_YOUR") &&
    APP_CONFIG.SUPABASE_ANON_KEY.length > 30 &&
    !APP_CONFIG.SUPABASE_ANON_KEY.includes("PASTE_YOUR")
  );
}
