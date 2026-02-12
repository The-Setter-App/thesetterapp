import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/userRepository';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const otp = await createOTP(email);
    
    // In a production environment, this would be sent via email provider (e.g., SendGrid, Resend)
    // For development/demo purposes, we log it to the server console.
    console.log('================================================');
    console.log(`🔐 LOGIN OTP for ${email}: ${otp}`);
    console.log('================================================');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}