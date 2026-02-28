import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/userRepository';
import { sendOTPEmail } from '@/lib/email';
import { enforceOtpSendRateLimit, getClientIp } from '@/lib/otpSecurity';
import { getAppUserExists } from '@/lib/userAuthRepository';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const hasAccount = await getAppUserExists(normalizedEmail);
    if (!hasAccount) {
      return NextResponse.json(
        {
          error: 'Account does not exist.',
          code: 'ACCOUNT_NOT_FOUND',
        },
        { status: 403 },
      );
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
    
    const otp = await createOTP(normalizedEmail);
    
    // Send OTP via email using Resend
    await sendOTPEmail(normalizedEmail, otp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
