-- Plain Postgres cutover: ensure UUID id defaults (playbook §1a)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.data_type = 'uuid'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
      r.table_name
    );
  END LOOP;
END $$;
