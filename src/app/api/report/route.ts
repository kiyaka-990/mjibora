import { NextResponse } from "next/server";
import { intakeAgent, recordsAgent } from "@/lib/agents";

export async function POST(req: Request) {
  const { tenantId, text } = await req.json();
  if (!tenantId || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "tenantId and text required" }, { status: 400 });
  }
  try {
    const c = await intakeAgent(tenantId, text);
    const letter = await recordsAgent(c);
    return NextResponse.json({
      ref: c.ref,
      category: c.category,
      department: c.department,
      severity: c.severity,
      slaHours: c.slaHours,
      feeKes: c.feeKes,
      payStatus: c.payStatus,
      letter,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
