import { NextResponse } from 'next/server';
import { verifyOTP, upsertUser } from '@/lib/userRepository';
import { createSession } from '@/lib/auth';
import {
  enforceOtpVerifyRateLimit,
  getClientIp,
  resetOtpVerifyEmailLimit,
} from '@/lib/otpSecurity';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedOtp = typeof otp === 'string' ? otp.trim() : '';
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
    
    // Verify OTP
    const isValid = await verifyOTP(normalizedEmail, normalizedOtp);
    
    if (!isValid) {
      // Check for a magic bypass code for development ease if strictly requested, 
      // but adhering to "high standards" implies using the real mechanism.
      // We will stick to the real OTP verified above.
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    
    // OTP valid - create/update user and session
    const user = await upsertUser(normalizedEmail);
    await resetOtpVerifyEmailLimit(normalizedEmail);
    await createSession({ email: user.email, role: user.role });

    return NextResponse.json({ success: true, requiresOnboarding: user.hasCompletedOnboarding === false });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
