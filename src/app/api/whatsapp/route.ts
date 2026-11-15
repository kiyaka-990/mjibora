import { NextResponse } from "next/server";
import { runIntakeAgent, dedupe } from "@/lib/agents";

// Twilio WhatsApp sandbox webhook: POST /api/whatsapp
// Configure in Twilio console: Messaging → Try it out → WhatsApp sandbox,
// set "WHEN A MESSAGE COMES IN" to <PUBLIC_URL>/api/whatsapp
// Sandbox phone joins via: join <your-sandbox-code>
//
// Without TWILIO_* env vars this route returns a clear status so the web UI
// remains the primary intake when WhatsApp is not configured.
export async function POST(req: Request) {
  const configured = Boolean(process.env.TWILIO_ACCOUNT_SID);
  if (!configured) {
    return NextResponse.json({ status: "whatsapp_not_configured" }, { status: 503 });
  }

  const form = await req.formData();
  const body = String(form.get("Body") ?? "").trim();
  const from = String(form.get("From") ?? "");
  if (!body) return new NextResponse("Empty message", { status: 400 });

  // Route by sender number to a tenant; default county for the demo.
  // Map sandbox numbers via WhatsApp_TENANT_MAP: "<whatsapp:+254...>": "county"
  const map = JSON.parse(process.env.WHATSAPP_TENANT_MAP ?? "{}");
  const tenantId = (map as Record<string, string>)[from] ?? "county";

  try {
    const dupe = dedupe(tenantId, body);
    let reply: string;
    if (dupe) {
      reply = `Asante! This report matches existing case ${dupe.ref} (${dupe.category}, ${dupe.severity}). SLA: ${dupe.slaHours}h.`;
    } else {
      const { case: c } = await runIntakeAgent(tenantId, body);
      reply =
        `Asante! Case ${c.ref} filed for ${c.department} (${c.severity}). ` +
        `SLA: ${c.slaHours}h.` +
        (c.feeKes > 0 ? ` Fee: KES ${c.feeKes} — a payment prompt will follow.` : "");
    }
    // TwiML response — Twilio sends this as the WhatsApp reply.
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, system error. Please try again.</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
