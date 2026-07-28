/**
 * DEPRECATED — plain Postgres cutover.
 * RLS is not used; authorize in API routes + JWT.
 * See docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md
 */
console.error('apply-rls.mjs is deprecated for plain Postgres. RLS policies are not applied.');
process.exit(1);
