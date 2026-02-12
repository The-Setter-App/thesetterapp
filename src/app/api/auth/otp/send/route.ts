import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/userRepository';
import { sendOTPEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const otp = await createOTP(email);
    
    // Send OTP via email using Resend
    await sendOTPEmail(email, otp);
    
    // Keep console log for development debugging if needed, but safe to remove if strict
    console.log(`🔐 OTP sent to ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}