import { NextResponse } from "next/server";
import { getCase } from "@/lib/store";
import { getTenant } from "@/lib/tenants";
import { stkPush } from "@/lib/mpesa";
import { emit } from "@/lib/events";

export async function POST(req: Request) {
  const { ref, phone, confirm } = await req.json();
  if (!ref || typeof phone !== "string") {
    return NextResponse.json({ error: "ref and phone required" }, { status: 400 });
  }
  const c = getCase(ref);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  // Confirm gate: payment only after explicit user confirmation.
  if (c.payStatus !== "awaiting_confirmation" || confirm !== true) {
    return NextResponse.json({ error: "Blocked: awaiting explicit confirmation" }, { status: 403 });
  }
  if (!/^2547\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Phone must be 2547XXXXXXXX" }, { status: 400 });
  }
  // Amount comes from tenant config in code — never from the request body.
  const tenant = getTenant(c.tenantId);
  const fee = tenant.fees[c.category] ?? 0;
  if (fee <= 0 || fee !== c.feeKes) {
    return NextResponse.json({ error: "No fee required for this category" }, { status: 400 });
  }

  emit("payment", `STK push ${phone} KES ${fee} for ${c.ref}`);
  const res = await stkPush(phone, fee, `Fee ${c.ref}`);
  if (res.ok) {
    c.payStatus = "paid";
    emit("payment", `Fee paid ✓ ${res.ref}${res.simulated ? " (simulated)" : ""}`);
  } else {
    c.payStatus = "blocked";
    emit("payment", `Payment failed: ${res.error}`);
  }
  return NextResponse.json(res);
}
