/**
 * Database Module
 *
 * Exports all database-related types, queries, and utilities.
 */

// Re-export client from lib/db.ts
export { getSupabaseClient, getDatabaseUrl } from "../lib/db.js";

// Export types
export * from "./types.js";

// Export query functions
export * from "./queries.js";
