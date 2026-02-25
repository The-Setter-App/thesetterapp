import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import {
  enforceOtpVerifyRateLimit,
  getClientIp,
  resetOtpVerifyEmailLimit,
} from '@/lib/otpSecurity';
import { validateOwnerSignupAccessCode } from '@/lib/signupAccessCode';
import { verifyOTP } from '@/lib/userRepository';
import { createOwnerUser, getAppUserExists } from '@/lib/userAuthRepository';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const otp = typeof body?.otp === 'string' ? body.otp : '';
    const accessCode = typeof body?.accessCode === 'string' ? body.accessCode : '';

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    if (!EMAIL_REGEX.test(normalizedEmail) || !OTP_REGEX.test(normalizedOtp)) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const clientIp = getClientIp(request.headers);
    const rateLimit = await enforceOtpVerifyRateLimit(normalizedEmail, clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP verification attempts. Try again later.' },
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

    const isValid = await verifyOTP(normalizedEmail, normalizedOtp);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const alreadyExists = await getAppUserExists(normalizedEmail);
    if (alreadyExists) {
      await resetOtpVerifyEmailLimit(normalizedEmail);
      return NextResponse.json(
        { error: 'Account already exists. Please log in.', code: 'ACCOUNT_EXISTS' },
        { status: 409 },
      );
    }

    try {
      await createOwnerUser(normalizedEmail);
    } catch (createError) {
      const existsAfterError = await getAppUserExists(normalizedEmail);
      if (existsAfterError) {
        await resetOtpVerifyEmailLimit(normalizedEmail);
        return NextResponse.json(
          { error: 'Account already exists. Please log in.', code: 'ACCOUNT_EXISTS' },
          { status: 409 },
        );
      }

      throw createError;
    }

    await resetOtpVerifyEmailLimit(normalizedEmail);
    await createSession({ email: normalizedEmail, role: 'owner' });

    return NextResponse.json({ success: true, requiresOnboarding: true });
  } catch (error) {
    console.error('Error verifying signup OTP:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

