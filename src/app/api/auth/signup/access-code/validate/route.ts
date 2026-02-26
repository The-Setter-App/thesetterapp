import { NextResponse } from "next/server";
import { validateOwnerSignupAccessCode } from "@/lib/signupAccessCode";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessCode =
      typeof body?.accessCode === "string" ? body.accessCode : "";

    const accessDecision = validateOwnerSignupAccessCode(accessCode);
    if (!accessDecision.ok) {
      if (accessDecision.reason === "missing_env") {
        return NextResponse.json(
          { error: "Signup is not configured.", code: "SIGNUP_DISABLED" },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "Invalid access code.", code: "INVALID_ACCESS_CODE" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error validating signup access code:", error);
    return NextResponse.json(
      { error: "Failed to validate access code" },
      { status: 500 },
    );
  }
}
