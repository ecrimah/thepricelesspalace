UPDATE store_settings
SET value = to_jsonb('Abavana Down, Victoria Guest House'::text),
    updated_at = now()
WHERE key = 'contact_address';
