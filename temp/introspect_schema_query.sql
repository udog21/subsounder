-- Run this in the Supabase SQL editor and paste the output back.
-- It returns: all tables, columns (with types/nullability/defaults),
-- primary keys, foreign keys, unique constraints, and indexes.

-- 1. Tables and columns
SELECT
  t.table_name,
  c.ordinal_position AS pos,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
  AND c.table_name  = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type   = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- 2. Primary keys
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema   = tc.table_schema
WHERE tc.table_schema    = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

-- 3. Foreign keys
SELECT
  tc.table_name         AS from_table,
  kcu.column_name       AS from_column,
  ccu.table_name        AS to_table,
  ccu.column_name       AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema   = tc.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema   = tc.table_schema
WHERE tc.table_schema    = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Unique constraints
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema   = tc.table_schema
WHERE tc.table_schema    = 'public'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, kcu.column_name;

-- 5. Indexes (non-constraint)
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Row counts per table
SELECT
  relname  AS table_name,
  n_live_tup AS approx_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- 7. RLS status
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
