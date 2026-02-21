import { NextResponse } from 'next/server';
import { verifyOTP, upsertUser } from '@/lib/userRepository';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }
    
    // Verify OTP
    const isValid = await verifyOTP(email, otp);
    
    if (!isValid) {
      // Check for a magic bypass code for development ease if strictly requested, 
      // but adhering to "high standards" implies using the real mechanism.
      // We will stick to the real OTP verified above.
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    
    // OTP valid - create/update user and session
    const user = await upsertUser(email);
    await createSession({ email: user.email, role: user.role });

    return NextResponse.json({ success: true, requiresOnboarding: user.hasCompletedOnboarding === false });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
