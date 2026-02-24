import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email: string, otp: string) {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing in environment variables');
    throw new Error('Email service not configured');
  }

  try {
    const appUrl = process.env.APP_URL?.replace(/\/+$/, '') || 'https://thesetter.app';
    const faviconUrl = `${appUrl}/favicon.svg`;

    const data = await resend.emails.send({
      from: 'SetterAPP <test@thesetter.app>',
      to: [email],
      subject: 'Your SetterAPP Login Code',
      html: `
        <div style="font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 100%; margin: 0; padding: 0;">
          <div style="background: linear-gradient(180deg, #FFFFFF 0%, rgba(135, 113, 255, 0.15) 50%, #FFFFFF 100%); padding: 48px 16px;">
            <div style="max-width: 420px; margin: 0 auto;">
              <div style="background-color: rgba(255, 255, 255, 0.85); border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04); padding: 40px 36px; text-align: center;">
                <div style="margin: 0 0 14px 0;">
                  <img src="${faviconUrl}" alt="SetterAPP" width="44" height="44" style="display: inline-block; vertical-align: middle;" />
                </div>
                <h2 style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">
                  Your Login Code
                </h2>
                <p style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 28px 0;">
                  Enter the code below to sign in to SetterAPP.
                </p>
                <div style="background-color: #f5f3ff; border: 1px solid rgba(135, 113, 255, 0.2); border-radius: 12px; padding: 24px; margin: 0 0 28px 0;">
                  <span style="font-family: 'Inter', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #8771FF;">
                    ${otp}
                  </span>
                </div>
                <p style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 4px 0;">
                  This code expires in 1 hour.
                </p>
                <div style="border-top: 1px solid #e5e7eb; margin: 24px 0 20px 0;"></div>
                <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
              </div>
              <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #9ca3af; text-align: center; margin: 20px 0 0 0;">
                SetterAPP
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (data.error) {
      console.error('Resend API Error:', data.error);
      throw new Error(data.error.message);
    }

    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw error;
  }
}
