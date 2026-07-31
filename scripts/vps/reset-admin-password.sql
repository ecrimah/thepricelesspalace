-- Reset admin@palace.com password to admin123
UPDATE auth.users
SET encrypted_password = '$2b$10$hhwfQvhDwaZYrDWVN6r7peX53JR/T/tdDh/ncZm0jlm1qxfTaOz2i',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE lower(email) = 'admin@palace.com';

INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
SELECT id, email, 'admin', 'Admin', now(), now()
FROM auth.users
WHERE lower(email) = 'admin@palace.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = now();
