import { NextResponse } from "next/server";
import { handleCalendlyWebhook } from "@/lib/calendly/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ integrationId: string }> },
) {
  try {
    const { integrationId } = await context.params;
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("Calendly-Webhook-Signature");
    const result = await handleCalendlyWebhook({
      integrationId,
      rawBody,
      signatureHeader,
    });

    if (!result.accepted) {
      if (result.reason === "unknown_integration") {
        return NextResponse.json({ error: "Unknown integration." }, { status: 404 });
      }
      if (result.reason === "invalid_signature") {
        return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CalendlyWebhook] Failed to process webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
