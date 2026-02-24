# Security Best Practices Report

## Executive Summary
The recent Supabase hardening (RLS enabled, `anon/authenticated` privileges revoked, private storage) is a strong improvement. The highest remaining risks are now in application-layer controls: cross-tenant realtime event leakage, weak auth secret fallback behavior, and missing OTP abuse controls. These can lead to data exposure, account/session compromise, and operational abuse even with database hardening in place.

## Scope and Standards
- Stack reviewed: Next.js 16 + TypeScript + React + Supabase server-side integration.
- Guidance used: Next.js server security and React/frontend security references from `security-best-practices` skill.
- Review mode: active security audit (code/config focused).

## Critical Findings

### SBP-001: Cross-tenant SSE broadcast leaks message metadata across authorized users
- Severity: Critical
- Impact: Any authenticated inbox-capable user can receive realtime events for conversations outside their workspace.
- Location:
  - `src/app/api/sse/route.ts:6-7, 30-37`
  - `src/app/api/webhook/route.ts:388-407, 457-473, 481-492`
  - `src/app/api/send-attachment/route.ts:96-127`
- Evidence:
  - A single global emitter is shared for all users: `export const sseEmitter = new EventEmitter();`
  - SSE route subscribes every connected client to all `'message'` events and forwards event payloads directly.
  - Emitters send global events without scoping by `workspaceOwnerEmail` or per-connection channel.
- Fix:
  - Partition realtime channels by workspace (e.g., emitter per workspace key, or event payload includes workspace and server filters before enqueue).
  - At subscribe-time, bind listener to authenticated workspace only.
- Mitigation (short-term):
  - Add strict server-side filter in `messageHandler` to drop events not matching requester workspace.
- False positive notes:
  - Client-side filtering in `useChat` is not a security control because data has already reached the browser.

## High Findings

### SBP-002: JWT signing key falls back to a known default string
- Severity: High
- Impact: If `JWT_SECRET` is unset in any environment, attackers can forge valid session tokens.
- Location: `src/lib/auth.ts:6-7`
- Evidence:
  - `const SECRET_KEY = process.env.JWT_SECRET || 'default-secret-key-change-me';`
- Fix:
  - Fail fast at boot if `JWT_SECRET` is missing; remove insecure fallback.
  - Enforce minimum key entropy/length and rotate existing sessions on change.

### SBP-003: OTP endpoints have no brute-force/rate-limit controls
- Severity: High
- Impact: Attackers can brute force OTP verification and abuse OTP send endpoint for email spam/cost amplification.
- Location:
  - `src/app/api/auth/otp/send/route.ts:5-21`
  - `src/app/api/auth/otp/verify/route.ts:5-31`
  - `src/lib/userRepository.ts:270-296, 298-314`
- Evidence:
  - No per-IP/per-email throttling, no attempt counters, no cooldown windows, no temporary lockout.
- Fix:
  - Add rate limits by IP + normalized email on both send/verify.
  - Add max verify attempts per OTP and lockout windows.
  - Add resend cooldown and global request budget.

## Medium Findings

### SBP-004: Missing baseline security headers/CSP in app config
- Severity: Medium
- Impact: Reduced browser-side defense-in-depth against XSS/clickjacking/MIME sniffing.
- Location: `next.config.ts:1-5`
- Evidence:
  - No `headers()` configuration for CSP, `X-Content-Type-Options`, frame protections, referrer policy.
- Fix:
  - Add baseline security headers in Next.js config or enforce at edge/proxy.
  - If handled in infrastructure, document and verify runtime headers.

### SBP-005: Webhook signature validation can throw on malformed signature length
- Severity: Medium
- Impact: Crafted malformed headers can trigger exception path (500) instead of clean unauthorized rejection.
- Location: `src/app/api/webhook/route.ts:111-129`
- Evidence:
  - `timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash))` can throw if lengths differ.
- Fix:
  - Validate signature format and exact hex length before `timingSafeEqual`; return `false` on mismatch.

### SBP-006: Confidential token encryption uses AES-CBC without authentication
- Severity: Medium
- Impact: Ciphertext integrity is not cryptographically authenticated; tampering cannot be reliably detected.
- Location: `src/lib/crypto.ts:1-35`
- Evidence:
  - `createCipheriv('aes-256-cbc', ...)` / `createDecipheriv('aes-256-cbc', ...)` with no MAC/AEAD.
- Fix:
  - Use AEAD mode (`aes-256-gcm`) and store/verify auth tag, or apply Encrypt-then-MAC.

## Low Findings

### SBP-007: Only `.env` is ignored; common secret files may be committed by mistake
- Severity: Low
- Impact: Increased chance of accidental secret commits (`.env.local`, `.env.production`, etc.).
- Location: `.gitignore:40-42`
- Evidence:
  - `.env` is ignored, but not broader `.env*` patterns.
- Fix:
  - Ignore `.env*` (with optional allowlist for `.env.example`).

## Positive Controls Observed
- Supabase server-only architecture and no `NEXT_PUBLIC` Supabase secret exposure in source.
- Hardening migration applies RLS/privilege revokes and private buckets:
  - `sqls/070_security_hardening.sql:4-47`
- Session cookies are `HttpOnly` and `SameSite=Lax`:
  - `src/lib/auth.ts:49-55`
- OAuth state validation is present for Instagram callback:
  - `src/app/api/auth/instagram/callback/route.ts:55-60`

## Recommended Remediation Order
1. Fix `SBP-001` (SSE tenant isolation) immediately.
2. Fix `SBP-002` (mandatory JWT secret) immediately after.
3. Implement `SBP-003` (OTP abuse protections).
4. Address `SBP-005` and `SBP-006`.
5. Add/document headers for `SBP-004`.
6. Patch `.gitignore` for `SBP-007`.
