import { NextResponse } from 'next/server';
import { sendOTPEmail } from '@/lib/email';
import { enforceOtpSendRateLimit, getClientIp } from '@/lib/otpSecurity';
import { validateOwnerSignupAccessCode } from '@/lib/signupAccessCode';
import { createOTP } from '@/lib/userRepository';
import { getAppUserExists } from '@/lib/userAuthRepository';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const accessCode = typeof body?.accessCode === 'string' ? body.accessCode : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const clientIp = getClientIp(request.headers);
    const rateLimit = await enforceOtpSendRateLimit(normalizedEmail, clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const accessDecision = validateOwnerSignupAccessCode(accessCode);
    if (!accessDecision.ok) {
      if (accessDecision.reason === 'missing_env') {
        return NextResponse.json(
          { error: 'Signup is not configured.', code: 'SIGNUP_DISABLED' },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: 'Invalid access code.', code: 'INVALID_ACCESS_CODE' },
        { status: 403 },
      );
    }

    const alreadyExists = await getAppUserExists(normalizedEmail);
    if (alreadyExists) {
      return NextResponse.json(
        { error: 'Account already exists. Please log in.', code: 'ACCOUNT_EXISTS' },
        { status: 409 },
      );
    }

    const otp = await createOTP(normalizedEmail);
    await sendOTPEmail(normalizedEmail, otp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending signup OTP:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}

