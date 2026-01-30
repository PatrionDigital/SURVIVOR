import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

// For local development with direct PostgreSQL connection
// Use this when running with docker-compose
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Default to local docker-compose PostgreSQL
    return "postgresql://postgres:postgres@localhost:5432/survivor";
  }
  return url;
}

export { supabase };
