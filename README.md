# Supabase Security Hardening

This project is configured for server-only Supabase access.

## Environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (required, minimum 32 chars)
- `ENCRYPTION_KEY` (required, exactly 32 chars)
- `OWNER_SIGNUP_ACCESS_CODE` (required to enable owner self-signup)
- `PROFILE_IMAGE_SIGNED_URL_TTL_SECONDS` (optional, default: `3600`)
- `OTP_SEND_LIMIT_WINDOW_SECONDS` (optional, default: `600`)
- `OTP_SEND_MAX_ATTEMPTS` (optional, default: `3`)
- `OTP_SEND_BLOCK_SECONDS` (optional, default: `900`)
- `OTP_VERIFY_LIMIT_WINDOW_SECONDS` (optional, default: `600`)
- `OTP_VERIFY_MAX_ATTEMPTS` (optional, default: `10`)
- `OTP_VERIFY_BLOCK_SECONDS` (optional, default: `900`)

## Migration Rollout

Apply SQL migrations in order, including:

- `sqls/051_profile_storage.sql` (private `profile-images`)
- `sqls/070_security_hardening.sql` (RLS + privilege revokes)
- `sqls/080_otp_rate_limits.sql` (OTP abuse controls)

## Verification Checklist

After migrations:

1. Confirm `profile-images` and `voice-notes` buckets are private.
2. Confirm all app tables have RLS enabled.
3. Confirm `anon` and `authenticated` cannot read from app tables.
4. Confirm the app can still create/read/update/delete data through server APIs.
5. Confirm profile images render correctly via signed URLs.
