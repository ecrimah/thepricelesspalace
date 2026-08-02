SELECT 'confirmation_sent_at' AS k, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='confirmation_sent_at')::text AS v
UNION ALL SELECT 'payment_attempts', (to_regclass('public.payment_attempts') IS NOT NULL)::text
UNION ALL SELECT 'payment_webhook_events', (to_regclass('public.payment_webhook_events') IS NOT NULL)::text
UNION ALL SELECT 'sms_messages', (to_regclass('public.sms_messages') IS NOT NULL)::text
UNION ALL SELECT 'empty_active_products', (SELECT count(*)::text FROM products WHERE status='active' AND (coalesce(trim(name),'')='' OR coalesce(trim(slug),'')=''));
