import { hashOtp } from "@/lib/otpSecurity";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OTPRecord } from "@/types/auth";
import { normalizeEmail, toIso } from "./shared";

export async function createOTP(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = hashOtp(normalizedEmail, otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

  const payload: OTPRecord = {
    email: normalizedEmail,
    otpHash,
    expiresAt,
    createdAt: now,
  };

  const { error } = await supabase.from("otp_codes").insert({
    email: payload.email,
    otp: payload.otpHash,
    expires_at: toIso(payload.expiresAt),
    created_at: toIso(payload.createdAt),
  });

  if (error) throw new Error(`Failed to create OTP: ${error.message}`);
  return otp;
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const otpHash = hashOtp(normalizedEmail, otp);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("otp_codes")
    .select("email,otp,expires_at")
    .eq("email", normalizedEmail)
    .eq("otp", otpHash)
    .gt("expires_at", toIso(new Date()))
    .maybeSingle();

  if (error || !data) return false;

  await supabase
    .from("otp_codes")
    .delete()
    .eq("email", normalizedEmail)
    .eq("otp", otpHash);
  return true;
}
