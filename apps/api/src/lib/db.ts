import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

let supabase: SupabaseClient | null = null;
let pgPool: Pool | null = null;

// Check if we're using local Postgres (no Supabase config)
const isLocalDev = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseClient(): SupabaseClient {
  if (isLocalDev) {
    // Return a mock Supabase client that uses direct Postgres
    return getLocalDbClient() as unknown as SupabaseClient;
  }

  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

// Get direct Postgres pool for local development
function getPgPool(): Pool {
  if (pgPool) {
    return pgPool;
  }

  pgPool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return pgPool;
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

// Local DB client that mimics Supabase interface for common operations
interface LocalDbQueryBuilder {
  from: (table: string) => LocalDbTableBuilder;
  rpc: (fnName: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
}

interface LocalDbTableBuilder {
  select: (columns?: string) => LocalDbSelectBuilder;
  insert: (data: Record<string, unknown>) => LocalDbInsertBuilder;
  update: (data: Record<string, unknown>) => LocalDbUpdateBuilder;
  upsert: (data: Record<string, unknown>, options?: { onConflict?: string }) => LocalDbInsertBuilder;
  delete: () => LocalDbDeleteBuilder;
}

interface LocalDbSelectBuilder {
  eq: (column: string, value: unknown) => LocalDbSelectBuilder;
  single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
  then: <T>(resolve: (result: { data: Record<string, unknown>[] | null; error: Error | null }) => T) => Promise<T>;
}

interface LocalDbInsertBuilder {
  select: () => LocalDbSelectBuilder;
}

interface LocalDbUpdateBuilder {
  eq: (column: string, value: unknown) => LocalDbUpdateBuilder;
  then: <T>(resolve: (result: { data: null; error: Error | null }) => T) => Promise<T>;
}

interface LocalDbDeleteBuilder {
  eq: (column: string, value: unknown) => LocalDbDeleteBuilder;
  then: <T>(resolve: (result: { data: null; error: Error | null }) => T) => Promise<T>;
}

function getLocalDbClient(): LocalDbQueryBuilder {
  const pool = getPgPool();

  return {
    from: (table: string) => createTableBuilder(pool, table),
    rpc: async (fnName: string, params: Record<string, unknown>) => {
      try {
        const paramNames = Object.keys(params);
        const paramValues = Object.values(params);
        const placeholders = paramNames.map((_, i) => `$${i + 1}`).join(", ");
        const query = `SELECT ${fnName}(${placeholders})`;
        const result = await pool.query(query, paramValues);
        return { data: result.rows[0], error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
  };
}

function createTableBuilder(pool: Pool, table: string): LocalDbTableBuilder {
  return {
    select: (columns = "*") => createSelectBuilder(pool, table, columns),
    insert: (data) => createInsertBuilder(pool, table, data),
    update: (data) => createUpdateBuilder(pool, table, data),
    upsert: (data, options) => createUpsertBuilder(pool, table, data, options?.onConflict),
    delete: () => createDeleteBuilder(pool, table),
  };
}

function createSelectBuilder(
  pool: Pool,
  table: string,
  columns: string,
  conditions: Array<{ column: string; value: unknown }> = []
): LocalDbSelectBuilder {
  const builder: LocalDbSelectBuilder = {
    eq: (column, value) => createSelectBuilder(pool, table, columns, [...conditions, { column, value }]),
    single: async () => {
      try {
        const whereClause = conditions.length > 0
          ? `WHERE ${conditions.map((c, i) => `${c.column} = $${i + 1}`).join(" AND ")}`
          : "";
        const values = conditions.map((c) => c.value);
        const query = `SELECT ${columns} FROM ${table} ${whereClause} LIMIT 1`;
        const result = await pool.query(query, values);
        return { data: result.rows[0] || null, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    then: async (resolve) => {
      try {
        const whereClause = conditions.length > 0
          ? `WHERE ${conditions.map((c, i) => `${c.column} = $${i + 1}`).join(" AND ")}`
          : "";
        const values = conditions.map((c) => c.value);
        const query = `SELECT ${columns} FROM ${table} ${whereClause}`;
        const result = await pool.query(query, values);
        return resolve({ data: result.rows, error: null });
      } catch (err) {
        return resolve({ data: null, error: err as Error });
      }
    },
  };
  return builder;
}

function createInsertBuilder(
  pool: Pool,
  table: string,
  data: Record<string, unknown>
): LocalDbInsertBuilder {
  return {
    select: () => ({
      eq: () => { throw new Error("eq not supported after insert"); },
      single: async () => {
        try {
          const columns = Object.keys(data);
          const values = Object.values(data);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
          const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`;
          const result = await pool.query(query, values);
          return { data: result.rows[0] || null, error: null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },
      then: async (resolve) => {
        try {
          const columns = Object.keys(data);
          const values = Object.values(data);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
          const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`;
          const result = await pool.query(query, values);
          return resolve({ data: result.rows, error: null });
        } catch (err) {
          return resolve({ data: null, error: err as Error });
        }
      },
    }),
  };
}

function createUpsertBuilder(
  pool: Pool,
  table: string,
  data: Record<string, unknown>,
  onConflict?: string
): LocalDbInsertBuilder {
  return {
    select: () => ({
      eq: () => { throw new Error("eq not supported after upsert"); },
      single: async () => {
        try {
          const columns = Object.keys(data);
          const values = Object.values(data);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
          const updateSet = columns.filter(c => c !== onConflict).map(c => `${c} = EXCLUDED.${c}`).join(", ");
          const conflictTarget = onConflict || columns[0];
          const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
            ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSet} RETURNING *`;
          const result = await pool.query(query, values);
          return { data: result.rows[0] || null, error: null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },
      then: async (resolve) => {
        try {
          const columns = Object.keys(data);
          const values = Object.values(data);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
          const updateSet = columns.filter(c => c !== onConflict).map(c => `${c} = EXCLUDED.${c}`).join(", ");
          const conflictTarget = onConflict || columns[0];
          const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
            ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSet} RETURNING *`;
          const result = await pool.query(query, values);
          return resolve({ data: result.rows, error: null });
        } catch (err) {
          return resolve({ data: null, error: err as Error });
        }
      },
    }),
  };
}

function createUpdateBuilder(
  pool: Pool,
  table: string,
  data: Record<string, unknown>,
  conditions: Array<{ column: string; value: unknown }> = []
): LocalDbUpdateBuilder {
  return {
    eq: (column, value) => createUpdateBuilder(pool, table, data, [...conditions, { column, value }]),
    then: async (resolve) => {
      try {
        const columns = Object.keys(data);
        const dataValues = Object.values(data);
        const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(", ");
        const whereClause = conditions.map((c, i) => `${c.column} = $${columns.length + i + 1}`).join(" AND ");
        const conditionValues = conditions.map((c) => c.value);
        const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        await pool.query(query, [...dataValues, ...conditionValues]);
        return resolve({ data: null, error: null });
      } catch (err) {
        return resolve({ data: null, error: err as Error });
      }
    },
  };
}

function createDeleteBuilder(
  pool: Pool,
  table: string,
  conditions: Array<{ column: string; value: unknown }> = []
): LocalDbDeleteBuilder {
  return {
    eq: (column, value) => createDeleteBuilder(pool, table, [...conditions, { column, value }]),
    then: async (resolve) => {
      try {
        const whereClause = conditions.map((c, i) => `${c.column} = $${i + 1}`).join(" AND ");
        const values = conditions.map((c) => c.value);
        const query = `DELETE FROM ${table} WHERE ${whereClause}`;
        await pool.query(query, values);
        return resolve({ data: null, error: null });
      } catch (err) {
        return resolve({ data: null, error: err as Error });
      }
    },
  };
}

export { supabase };
