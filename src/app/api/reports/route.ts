import { NextResponse } from "next/server";
import { allCases, tickSLA } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId") ?? undefined;
  tickSLA(); // deterministic SLA breach check + auto-escalation
  const rows = allCases(tenantId).map((c) => ({
    ref: c.ref,
    tenantId: c.tenantId,
    category: c.category,
    department: c.department,
    severity: c.severity,
    status: c.status,
    slaDueAt: c.slaDueAt,
    slaHours: c.slaHours,
    payStatus: c.payStatus,
    feeKes: c.feeKes,
  }));
  const open = rows.filter((r) => r.status === "new" || r.status === "in_progress");
  const escalated = rows.filter((r) => r.status === "escalated");
  const resolved = rows.filter((r) => r.status === "resolved");
  return NextResponse.json({
    cases: rows,
    stats: {
      total: rows.length,
      open: open.length,
      escalated: escalated.length,
      resolved: resolved.length,
      slaCompliance: rows.length
        ? Math.round((100 * (rows.length - escalated.length)) / rows.length)
        : 100,
    },
  });
}
