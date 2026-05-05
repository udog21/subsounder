[
  {
    "table_name": "email_connections",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 3,
    "column_name": "pod_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 4,
    "column_name": "provider",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 5,
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'active'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 6,
    "column_name": "scopes",
    "data_type": "ARRAY",
    "udt_name": "_text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 7,
    "column_name": "last_sync_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 8,
    "column_name": "provider_cursor",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "email_connections",
    "pos": 9,
    "column_name": "token_ref",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 3,
    "column_name": "pod_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 4,
    "column_name": "channel",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 5,
    "column_name": "dedupe_key",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 6,
    "column_name": "message_id",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 7,
    "column_name": "from_domain",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 8,
    "column_name": "subject_hash",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 9,
    "column_name": "payload_hash",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 10,
    "column_name": "received_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 11,
    "column_name": "parser_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'pending'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 12,
    "column_name": "last_parser_run_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 13,
    "column_name": "error_code",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 14,
    "column_name": "error_detail",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 15,
    "column_name": "to_email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 16,
    "column_name": "to_localpart",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 17,
    "column_name": "from_email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 18,
    "column_name": "subject",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 19,
    "column_name": "body_text",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 20,
    "column_name": "body_html",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 21,
    "column_name": "raw_payload",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 22,
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 23,
    "column_name": "source_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 24,
    "column_name": "content_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 25,
    "column_name": "storage_bucket",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 26,
    "column_name": "storage_path",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 27,
    "column_name": "text_extracted",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 28,
    "column_name": "text_extractor",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 29,
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 31,
    "column_name": "content_date",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 32,
    "column_name": "resolved_subscription_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 33,
    "column_name": "write_decision",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "inbound_receipts",
    "pos": 34,
    "column_name": "write_reason",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "keywords",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "keywords",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "keywords",
    "pos": 3,
    "column_name": "keyword",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "keywords",
    "pos": 4,
    "column_name": "keyword_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'subscription'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "keywords",
    "pos": 5,
    "column_name": "weight",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "1",
    "character_maximum_length": null
  },
  {
    "table_name": "keywords",
    "pos": 6,
    "column_name": "language",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'en'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "merchants",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "merchants",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "merchants",
    "pos": 3,
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "merchants",
    "pos": 4,
    "column_name": "website",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "merchants",
    "pos": 5,
    "column_name": "aliases",
    "data_type": "ARRAY",
    "udt_name": "_text",
    "is_nullable": "NO",
    "column_default": "'{}'::text[]",
    "character_maximum_length": null
  },
  {
    "table_name": "merchants",
    "pos": 6,
    "column_name": "is_global",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "true",
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 3,
    "column_name": "pod_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 4,
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 5,
    "column_name": "inbound_receipt_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 6,
    "column_name": "source_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'inbound_receipt'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 7,
    "column_name": "source_ref",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 8,
    "column_name": "parser_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 9,
    "column_name": "parser_version",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 10,
    "column_name": "model_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 11,
    "column_name": "prompt_version",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 12,
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'success'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 13,
    "column_name": "classification",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 14,
    "column_name": "confidence",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 15,
    "column_name": "error_code",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 16,
    "column_name": "error_detail",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 17,
    "column_name": "input_hash",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 18,
    "column_name": "input_excerpt",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 19,
    "column_name": "output_json",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "parser_runs",
    "pos": 20,
    "column_name": "actions",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 3,
    "column_name": "owner_profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 4,
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'My Subscriptions'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 5,
    "column_name": "alias_email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 6,
    "column_name": "alias_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'unverified'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 7,
    "column_name": "alias_verified_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 8,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 9,
    "column_name": "pod_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'trial'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 10,
    "column_name": "created_via",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "pods",
    "pos": 11,
    "column_name": "last_activity_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 3,
    "column_name": "pod_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 4,
    "column_name": "display_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 5,
    "column_name": "email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 6,
    "column_name": "phone_e164",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 7,
    "column_name": "timezone",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'America/Los_Angeles'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 8,
    "column_name": "currency",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'USD'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 9,
    "column_name": "reminder_days_before",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "7",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 10,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 11,
    "column_name": "identity_state",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'unclaimed'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 12,
    "column_name": "entitlement_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'trial'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 13,
    "column_name": "ingest_state",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'active'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 14,
    "column_name": "trial_started_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 15,
    "column_name": "trial_ends_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 16,
    "column_name": "current_period_ends_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 17,
    "column_name": "canceled_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 18,
    "column_name": "plan_code",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 19,
    "column_name": "last_inbound_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 20,
    "column_name": "inbound_total_count",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 21,
    "column_name": "inbound_subscription_count",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 22,
    "column_name": "inbound_non_subscription_count",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 23,
    "column_name": "blocked_reason",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "profiles",
    "pos": 24,
    "column_name": "auth_user_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 3,
    "column_name": "subscription_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 4,
    "column_name": "start_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 5,
    "column_name": "end_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 6,
    "column_name": "cycle_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'paid'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 7,
    "column_name": "billing_cadence",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 8,
    "column_name": "amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 9,
    "column_name": "currency",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 10,
    "column_name": "inferred_from_sounding_log_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscription_cycles",
    "pos": 11,
    "column_name": "notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 2,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 3,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 4,
    "column_name": "pod_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 5,
    "column_name": "merchant_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 6,
    "column_name": "display_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 7,
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'active'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 8,
    "column_name": "billing_cadence",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 9,
    "column_name": "amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 10,
    "column_name": "currency",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 11,
    "column_name": "next_renewal_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 12,
    "column_name": "last_billed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 13,
    "column_name": "cancel_by_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 14,
    "column_name": "trial_ends_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 15,
    "column_name": "source",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'manual'::text",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 16,
    "column_name": "confidence",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": "1.000",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 17,
    "column_name": "reminder_enabled",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "true",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 18,
    "column_name": "reminder_days",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 19,
    "column_name": "notify_channels",
    "data_type": "ARRAY",
    "udt_name": "_text",
    "is_nullable": "NO",
    "column_default": "'{email}'::text[]",
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 20,
    "column_name": "notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 21,
    "column_name": "plan_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 22,
    "column_name": "provider_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 23,
    "column_name": "provider_domain",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 24,
    "column_name": "billed_by_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 25,
    "column_name": "billed_by_domain",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 26,
    "column_name": "last_observed_content_date",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 27,
    "column_name": "last_source_receipt_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "table_name": "subscriptions",
    "pos": 28,
    "column_name": "last_source_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  }
]

[
  {
    "table_name": "email_connections",
    "column_name": "id",
    "constraint_name": "email_connections_pkey"
  },
  {
    "table_name": "inbound_receipts",
    "column_name": "id",
    "constraint_name": "inbound_receipts_pkey"
  },
  {
    "table_name": "keywords",
    "column_name": "id",
    "constraint_name": "keywords_pkey"
  },
  {
    "table_name": "merchants",
    "column_name": "id",
    "constraint_name": "merchants_pkey"
  },
  {
    "table_name": "parser_runs",
    "column_name": "id",
    "constraint_name": "parser_runs_pkey"
  },
  {
    "table_name": "pods",
    "column_name": "id",
    "constraint_name": "pods_pkey"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "constraint_name": "profiles_pkey"
  },
  {
    "table_name": "subscription_cycles",
    "column_name": "id",
    "constraint_name": "subscription_cycles_pkey"
  },
  {
    "table_name": "subscriptions",
    "column_name": "id",
    "constraint_name": "subscriptions_pkey"
  }
]

[
  {
    "from_table": "email_connections",
    "from_column": "pod_id",
    "to_table": "pods",
    "to_column": "id",
    "constraint_name": "email_connections_pod_id_fkey"
  },
  {
    "from_table": "inbound_receipts",
    "from_column": "pod_id",
    "to_table": "pods",
    "to_column": "id",
    "constraint_name": "inbound_receipts_pod_id_fkey"
  },
  {
    "from_table": "inbound_receipts",
    "from_column": "profile_id",
    "to_table": "profiles",
    "to_column": "id",
    "constraint_name": "inbound_receipts_profile_id_fkey"
  },
  {
    "from_table": "inbound_receipts",
    "from_column": "resolved_subscription_id",
    "to_table": "subscriptions",
    "to_column": "id",
    "constraint_name": "inbound_receipts_resolved_subscription_id_fkey"
  },
  {
    "from_table": "parser_runs",
    "from_column": "inbound_receipt_id",
    "to_table": "inbound_receipts",
    "to_column": "id",
    "constraint_name": "parser_runs_inbound_receipt_id_fkey"
  },
  {
    "from_table": "parser_runs",
    "from_column": "pod_id",
    "to_table": "pods",
    "to_column": "id",
    "constraint_name": "parser_runs_pod_id_fkey"
  },
  {
    "from_table": "parser_runs",
    "from_column": "profile_id",
    "to_table": "profiles",
    "to_column": "id",
    "constraint_name": "parser_runs_profile_id_fkey"
  },
  {
    "from_table": "pods",
    "from_column": "owner_profile_id",
    "to_table": "profiles",
    "to_column": "id",
    "constraint_name": "pods_owner_profile_fk"
  },
  {
    "from_table": "profiles",
    "from_column": "pod_id",
    "to_table": "pods",
    "to_column": "id",
    "constraint_name": "profiles_pod_id_fkey"
  },
  {
    "from_table": "subscription_cycles",
    "from_column": "subscription_id",
    "to_table": "subscriptions",
    "to_column": "id",
    "constraint_name": "subscription_cycles_subscription_id_fkey"
  },
  {
    "from_table": "subscriptions",
    "from_column": "last_source_receipt_id",
    "to_table": "inbound_receipts",
    "to_column": "id",
    "constraint_name": "subscriptions_last_source_receipt_id_fkey"
  },
  {
    "from_table": "subscriptions",
    "from_column": "merchant_id",
    "to_table": "merchants",
    "to_column": "id",
    "constraint_name": "subscriptions_merchant_id_fkey"
  },
  {
    "from_table": "subscriptions",
    "from_column": "pod_id",
    "to_table": "pods",
    "to_column": "id",
    "constraint_name": "subscriptions_pod_id_fkey"
  }
]

[
  {
    "table_name": "email_connections",
    "column_name": "pod_id",
    "constraint_name": "email_connections_pod_id_provider_key"
  },
  {
    "table_name": "email_connections",
    "column_name": "provider",
    "constraint_name": "email_connections_pod_id_provider_key"
  },
  {
    "table_name": "pods",
    "column_name": "alias_email",
    "constraint_name": "pods_alias_email_key"
  },
  {
    "table_name": "pods",
    "column_name": "owner_profile_id",
    "constraint_name": "pods_owner_profile_id_key"
  },
  {
    "table_name": "profiles",
    "column_name": "phone_e164",
    "constraint_name": "profiles_phone_e164_key"
  },
  {
    "table_name": "profiles",
    "column_name": "pod_id",
    "constraint_name": "profiles_pod_id_key"
  }
]

[
  {
    "indexname": "email_connections_pkey",
    "tablename": "email_connections",
    "indexdef": "CREATE UNIQUE INDEX email_connections_pkey ON public.email_connections USING btree (id)"
  },
  {
    "indexname": "email_connections_pod_id_provider_key",
    "tablename": "email_connections",
    "indexdef": "CREATE UNIQUE INDEX email_connections_pod_id_provider_key ON public.email_connections USING btree (pod_id, provider)"
  },
  {
    "indexname": "inbound_receipts_channel_created_at_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_channel_created_at_idx ON public.inbound_receipts USING btree (channel, created_at DESC)"
  },
  {
    "indexname": "inbound_receipts_content_date_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_content_date_idx ON public.inbound_receipts USING btree (content_date)"
  },
  {
    "indexname": "inbound_receipts_parser_status_created_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_parser_status_created_idx ON public.inbound_receipts USING btree (parser_status, created_at DESC)"
  },
  {
    "indexname": "inbound_receipts_pkey",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE UNIQUE INDEX inbound_receipts_pkey ON public.inbound_receipts USING btree (id)"
  },
  {
    "indexname": "inbound_receipts_pod_created_at_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_pod_created_at_idx ON public.inbound_receipts USING btree (pod_id, created_at DESC)"
  },
  {
    "indexname": "inbound_receipts_pod_dedupe_key_uq",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE UNIQUE INDEX inbound_receipts_pod_dedupe_key_uq ON public.inbound_receipts USING btree (pod_id, dedupe_key)"
  },
  {
    "indexname": "inbound_receipts_pod_msgid_uq",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE UNIQUE INDEX inbound_receipts_pod_msgid_uq ON public.inbound_receipts USING btree (pod_id, message_id) WHERE (message_id IS NOT NULL)"
  },
  {
    "indexname": "inbound_receipts_profile_id_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_profile_id_idx ON public.inbound_receipts USING btree (profile_id)"
  },
  {
    "indexname": "inbound_receipts_provider_message_id_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_provider_message_id_idx ON public.inbound_receipts USING btree (message_id)"
  },
  {
    "indexname": "inbound_receipts_resolved_subscription_id_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_resolved_subscription_id_idx ON public.inbound_receipts USING btree (resolved_subscription_id)"
  },
  {
    "indexname": "inbound_receipts_source_type_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_source_type_idx ON public.inbound_receipts USING btree (source_type)"
  },
  {
    "indexname": "inbound_receipts_storage_path_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_storage_path_idx ON public.inbound_receipts USING btree (storage_bucket, storage_path)"
  },
  {
    "indexname": "inbound_receipts_to_email_created_at_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_to_email_created_at_idx ON public.inbound_receipts USING btree (to_email, created_at DESC)"
  },
  {
    "indexname": "inbound_receipts_to_localpart_created_at_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_to_localpart_created_at_idx ON public.inbound_receipts USING btree (to_localpart, created_at DESC)"
  },
  {
    "indexname": "inbound_receipts_write_decision_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_write_decision_idx ON public.inbound_receipts USING btree (write_decision)"
  },
  {
    "indexname": "inbound_receipts_write_reason_idx",
    "tablename": "inbound_receipts",
    "indexdef": "CREATE INDEX inbound_receipts_write_reason_idx ON public.inbound_receipts USING btree (write_reason)"
  },
  {
    "indexname": "keywords_pkey",
    "tablename": "keywords",
    "indexdef": "CREATE UNIQUE INDEX keywords_pkey ON public.keywords USING btree (id)"
  },
  {
    "indexname": "keywords_unique",
    "tablename": "keywords",
    "indexdef": "CREATE UNIQUE INDEX keywords_unique ON public.keywords USING btree (lower(keyword), keyword_type, language)"
  },
  {
    "indexname": "merchants_name_unique_ci",
    "tablename": "merchants",
    "indexdef": "CREATE UNIQUE INDEX merchants_name_unique_ci ON public.merchants USING btree (lower(name))"
  },
  {
    "indexname": "merchants_pkey",
    "tablename": "merchants",
    "indexdef": "CREATE UNIQUE INDEX merchants_pkey ON public.merchants USING btree (id)"
  },
  {
    "indexname": "parser_runs_created_at_idx",
    "tablename": "parser_runs",
    "indexdef": "CREATE INDEX parser_runs_created_at_idx ON public.parser_runs USING btree (created_at DESC)"
  },
  {
    "indexname": "parser_runs_idempotency_unique",
    "tablename": "parser_runs",
    "indexdef": "CREATE UNIQUE INDEX parser_runs_idempotency_unique ON public.parser_runs USING btree (inbound_receipt_id, parser_name, input_hash) WHERE ((inbound_receipt_id IS NOT NULL) AND (input_hash IS NOT NULL))"
  },
  {
    "indexname": "parser_runs_inbound_receipt_created_idx",
    "tablename": "parser_runs",
    "indexdef": "CREATE INDEX parser_runs_inbound_receipt_created_idx ON public.parser_runs USING btree (inbound_receipt_id, created_at DESC)"
  },
  {
    "indexname": "parser_runs_parser_created_idx",
    "tablename": "parser_runs",
    "indexdef": "CREATE INDEX parser_runs_parser_created_idx ON public.parser_runs USING btree (parser_name, created_at DESC)"
  },
  {
    "indexname": "parser_runs_pkey",
    "tablename": "parser_runs",
    "indexdef": "CREATE UNIQUE INDEX parser_runs_pkey ON public.parser_runs USING btree (id)"
  },
  {
    "indexname": "parser_runs_pod_created_idx",
    "tablename": "parser_runs",
    "indexdef": "CREATE INDEX parser_runs_pod_created_idx ON public.parser_runs USING btree (pod_id, created_at DESC)"
  },
  {
    "indexname": "parser_runs_profile_created_idx",
    "tablename": "parser_runs",
    "indexdef": "CREATE INDEX parser_runs_profile_created_idx ON public.parser_runs USING btree (profile_id, created_at DESC)"
  },
  {
    "indexname": "pods_alias_email_key",
    "tablename": "pods",
    "indexdef": "CREATE UNIQUE INDEX pods_alias_email_key ON public.pods USING btree (alias_email)"
  },
  {
    "indexname": "pods_alias_email_lower_unique",
    "tablename": "pods",
    "indexdef": "CREATE UNIQUE INDEX pods_alias_email_lower_unique ON public.pods USING btree (lower(alias_email)) WHERE (alias_email IS NOT NULL)"
  },
  {
    "indexname": "pods_owner_profile_id_idx",
    "tablename": "pods",
    "indexdef": "CREATE INDEX pods_owner_profile_id_idx ON public.pods USING btree (owner_profile_id)"
  },
  {
    "indexname": "pods_owner_profile_id_key",
    "tablename": "pods",
    "indexdef": "CREATE UNIQUE INDEX pods_owner_profile_id_key ON public.pods USING btree (owner_profile_id)"
  },
  {
    "indexname": "pods_pkey",
    "tablename": "pods",
    "indexdef": "CREATE UNIQUE INDEX pods_pkey ON public.pods USING btree (id)"
  },
  {
    "indexname": "pods_status_idx",
    "tablename": "pods",
    "indexdef": "CREATE INDEX pods_status_idx ON public.pods USING btree (pod_status)"
  },
  {
    "indexname": "profiles_auth_user_id_key",
    "tablename": "profiles",
    "indexdef": "CREATE UNIQUE INDEX profiles_auth_user_id_key ON public.profiles USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL)"
  },
  {
    "indexname": "profiles_email_lower_idx",
    "tablename": "profiles",
    "indexdef": "CREATE INDEX profiles_email_lower_idx ON public.profiles USING btree (lower(email))"
  },
  {
    "indexname": "profiles_lifecycle_idx",
    "tablename": "profiles",
    "indexdef": "CREATE INDEX profiles_lifecycle_idx ON public.profiles USING btree (identity_state, entitlement_status, ingest_state)"
  },
  {
    "indexname": "profiles_phone_e164_idx",
    "tablename": "profiles",
    "indexdef": "CREATE INDEX profiles_phone_e164_idx ON public.profiles USING btree (phone_e164)"
  },
  {
    "indexname": "profiles_phone_e164_key",
    "tablename": "profiles",
    "indexdef": "CREATE UNIQUE INDEX profiles_phone_e164_key ON public.profiles USING btree (phone_e164)"
  },
  {
    "indexname": "profiles_pkey",
    "tablename": "profiles",
    "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
  },
  {
    "indexname": "profiles_pod_id_idx",
    "tablename": "profiles",
    "indexdef": "CREATE INDEX profiles_pod_id_idx ON public.profiles USING btree (pod_id)"
  },
  {
    "indexname": "profiles_pod_id_key",
    "tablename": "profiles",
    "indexdef": "CREATE UNIQUE INDEX profiles_pod_id_key ON public.profiles USING btree (pod_id)"
  },
  {
    "indexname": "subscription_cycles_pkey",
    "tablename": "subscription_cycles",
    "indexdef": "CREATE UNIQUE INDEX subscription_cycles_pkey ON public.subscription_cycles USING btree (id)"
  },
  {
    "indexname": "subscription_cycles_subscription_idx",
    "tablename": "subscription_cycles",
    "indexdef": "CREATE INDEX subscription_cycles_subscription_idx ON public.subscription_cycles USING btree (subscription_id, start_at)"
  },
  {
    "indexname": "subscriptions_last_observed_content_date_idx",
    "tablename": "subscriptions",
    "indexdef": "CREATE INDEX subscriptions_last_observed_content_date_idx ON public.subscriptions USING btree (last_observed_content_date)"
  },
  {
    "indexname": "subscriptions_last_source_receipt_id_idx",
    "tablename": "subscriptions",
    "indexdef": "CREATE INDEX subscriptions_last_source_receipt_id_idx ON public.subscriptions USING btree (last_source_receipt_id)"
  },
  {
    "indexname": "subscriptions_last_source_type_idx",
    "tablename": "subscriptions",
    "indexdef": "CREATE INDEX subscriptions_last_source_type_idx ON public.subscriptions USING btree (last_source_type)"
  },
  {
    "indexname": "subscriptions_next_renewal_idx",
    "tablename": "subscriptions",
    "indexdef": "CREATE INDEX subscriptions_next_renewal_idx ON public.subscriptions USING btree (pod_id, next_renewal_at)"
  },
  {
    "indexname": "subscriptions_pkey",
    "tablename": "subscriptions",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id)"
  },
  {
    "indexname": "subscriptions_pod_idx",
    "tablename": "subscriptions",
    "indexdef": "CREATE INDEX subscriptions_pod_idx ON public.subscriptions USING btree (pod_id)"
  },
  {
    "indexname": "subscriptions_unique_pod_merchant",
    "tablename": "subscriptions",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_unique_pod_merchant ON public.subscriptions USING btree (pod_id, merchant_id)"
  }
]

[
  {
    "table_name": "email_connections",
    "approx_row_count": 0
  },
  {
    "table_name": "inbound_receipts",
    "approx_row_count": 5
  },
  {
    "table_name": "keywords",
    "approx_row_count": 0
  },
  {
    "table_name": "merchants",
    "approx_row_count": 0
  },
  {
    "table_name": "parser_runs",
    "approx_row_count": 0
  },
  {
    "table_name": "pods",
    "approx_row_count": 7
  },
  {
    "table_name": "profiles",
    "approx_row_count": 7
  },
  {
    "table_name": "subscription_cycles",
    "approx_row_count": 0
  },
  {
    "table_name": "subscriptions",
    "approx_row_count": 0
  }
]

[
  {
    "tablename": "email_connections",
    "rls_enabled": true
  },
  {
    "tablename": "inbound_receipts",
    "rls_enabled": true
  },
  {
    "tablename": "keywords",
    "rls_enabled": true
  },
  {
    "tablename": "merchants",
    "rls_enabled": true
  },
  {
    "tablename": "parser_runs",
    "rls_enabled": true
  },
  {
    "tablename": "pods",
    "rls_enabled": true
  },
  {
    "tablename": "profiles",
    "rls_enabled": true
  },
  {
    "tablename": "subscription_cycles",
    "rls_enabled": true
  },
  {
    "tablename": "subscriptions",
    "rls_enabled": true
  }
]