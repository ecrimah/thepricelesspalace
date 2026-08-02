#!/usr/bin/env bash
set -euo pipefail
PASS="${1:-}"
echo "$PASS" | sudo -S bash <<'EOS'
set -euo pipefail
PCID=$(docker ps --format '{{.ID}} {{.Names}}' | grep fleet-postgres | awk '{print $1}' | head -1)
docker cp /home/tay/004_payment_integrity_and_audit.sql "$PCID":/tmp/004.sql
docker exec -i "$PCID" psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f /tmp/004.sql
docker exec -i "$PCID" psql -U postgres -d store_palace -At -c "
SELECT 'confirmation_sent_at|'||CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='confirmation_sent_at') THEN 'ok' ELSE 'MISSING' END
UNION ALL SELECT 'payment_attempts|'||CASE WHEN to_regclass('public.payment_attempts') IS NULL THEN 'MISSING' ELSE 'ok' END
UNION ALL SELECT 'payment_webhook_events|'||CASE WHEN to_regclass('public.payment_webhook_events') IS NULL THEN 'MISSING' ELSE 'ok' END
UNION ALL SELECT 'sms_messages|'||CASE WHEN to_regclass('public.sms_messages') IS NULL THEN 'MISSING' ELSE 'ok' END
UNION ALL SELECT 'empty_products|'||count(*)::text FROM products WHERE coalesce(trim(name),'')='' OR coalesce(trim(slug),'')='';
"
EOS
