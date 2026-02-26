import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeAppUrl(): string | null {
  const rawUrl = process.env.APP_URL?.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function resolveEmailLogoUrl(): string | null {
  const appUrl = normalizeAppUrl();
  if (!appUrl) return null;
  return `${appUrl}/images/login-icon.png`;
}

function resolveLoginUrl(): string | null {
  const appUrl = normalizeAppUrl();
  if (!appUrl) return null;
  return `${appUrl}/login`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendOTPEmail(email: string, otp: string) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is missing in environment variables");
    throw new Error("Email service not configured");
  }

  try {
    const logoUrl = resolveEmailLogoUrl();
    const logoMarkup = logoUrl
      ? `<img src="${logoUrl}" alt="SetterAPP" width="44" height="44" style="display: inline-block; vertical-align: middle;" />`
      : '<span style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; color: #8771FF;">S</span>';

    const data = await resend.emails.send({
      from: "SetterAPP <test@thesetter.app>",
      to: [email],
      subject: "Your SetterAPP Login Code",
      html: `
        <div style="font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 100%; margin: 0; padding: 0;">
          <div style="background: linear-gradient(180deg, #FFFFFF 0%, rgba(135, 113, 255, 0.15) 50%, #FFFFFF 100%); padding: 48px 16px;">
            <div style="max-width: 420px; margin: 0 auto;">
              <div style="background-color: rgba(255, 255, 255, 0.85); border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04); padding: 40px 36px; text-align: center;">
                <div style="margin: 0 0 14px 0;">
                  ${logoMarkup}
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
      console.error("Resend API Error:", data.error);
      throw new Error(data.error.message);
    }

    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw error;
  }
}

interface TeamInvitationEmailInput {
  ownerEmail: string;
  memberEmail: string;
  role: "setter" | "closer";
}

export async function sendTeamInvitationEmail(input: TeamInvitationEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is missing in environment variables");
    throw new Error("Email service not configured");
  }

  const loginUrl = resolveLoginUrl();
  if (!loginUrl) {
    throw new Error("APP_URL is not configured for invitation emails");
  }

  const safeOwnerEmail = escapeHtml(input.ownerEmail);
  const safeRole = escapeHtml(input.role === "setter" ? "Setter" : "Closer");
  const logoUrl = resolveEmailLogoUrl();
  const logoMarkup = logoUrl
    ? `<img src="${logoUrl}" alt="SetterAPP" width="44" height="44" style="display: inline-block; vertical-align: middle;" />`
    : '<span style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 700; color: #8771FF;">S</span>';

  const data = await resend.emails.send({
    from: "SetterAPP <test@thesetter.app>",
    to: [input.memberEmail],
    subject: "You have been invited to SetterAPP",
    html: `
      <div style="font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 100%; margin: 0; padding: 0;">
        <div style="background: linear-gradient(180deg, #FFFFFF 0%, rgba(135, 113, 255, 0.15) 50%, #FFFFFF 100%); padding: 48px 16px;">
          <div style="max-width: 460px; margin: 0 auto;">
            <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04); padding: 36px 32px;">
              <div style="margin: 0 0 14px 0; text-align: left;">
                ${logoMarkup}
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 10px 0;">You are invited to SetterAPP</h2>
              <p style="font-size: 14px; color: #374151; margin: 0 0 14px 0;">
                <strong>${safeOwnerEmail}</strong> added you to their workspace as a <strong>${safeRole}</strong>.
              </p>
              <p style="font-size: 14px; color: #374151; margin: 0 0 24px 0;">
                Use the button below to open the login page and sign in with your email.
              </p>
              <a href="${loginUrl}" style="display: inline-block; background-color: #8771FF; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 18px; border-radius: 9999px;">
                Go to Login
              </a>
              <p style="font-size: 12px; color: #6b7280; margin: 20px 0 0 0;">
                If the button does not work, copy this link:<br />
                <a href="${loginUrl}" style="color: #6d5ed6; word-break: break-all;">${loginUrl}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  if (data.error) {
    console.error("Resend API Error:", data.error);
    throw new Error(data.error.message);
  }

  return { success: true, id: data.data?.id };
}
