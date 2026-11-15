import { NextResponse } from "next/server";
import { runIntakeAgent, dedupe } from "@/lib/agents";

export async function POST(req: Request) {
  const { tenantId, text } = await req.json();
  if (!tenantId || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "tenantId and text required" }, { status: 400 });
  }
  try {
    // Dedupe first — exact duplicate merges into the existing case.
    const dupe = dedupe(tenantId, text);
    if (dupe) {
      return NextResponse.json({
        ref: dupe.ref,
        category: dupe.category,
        department: dupe.department,
        severity: dupe.severity,
        slaHours: dupe.slaHours,
        feeKes: dupe.feeKes,
        payStatus: dupe.payStatus,
        letter: dupe.letterDraft ?? "",
        duplicate: true,
      });
    }
    const { case: c, letter, steps } = await runIntakeAgent(tenantId, text);
    return NextResponse.json({
      ref: c.ref,
      category: c.category,
      department: c.department,
      severity: c.severity,
      slaHours: c.slaHours,
      feeKes: c.feeKes,
      payStatus: c.payStatus,
      letter,
      steps,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
