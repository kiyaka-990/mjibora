// In-memory store keyed by tenant + ref. Swap for Neon Postgres later.
export type Status = "new" | "in_progress" | "resolved" | "escalated";
export type PayStatus = "not_required" | "awaiting_confirmation" | "paid" | "blocked";

export interface Case {
  ref: string;
  tenantId: string;
  category: string;
  department: string;
  severity: "low" | "medium" | "high" | "critical";
  summarySafe: string;      // redacted text sent to LLM
  letterDraft: string | null;
  slaHours: number;
  slaDueAt: string;
  createdAt: string;
  status: Status;
  payStatus: PayStatus;
  feeKes: number;
}

const cases = new Map<string, Case>();
let counter = 1000;

export function nextRef(prefix: string): string {
  counter += 1;
  return `${prefix}-${new Date().getFullYear()}-${counter}`;
}

export function saveCase(c: Case): void {
  cases.set(c.ref, c);
}

export function getCase(ref: string): Case | undefined {
  return cases.get(ref);
}

export function allCases(tenantId?: string): Case[] {
  const all = [...cases.values()];
  return tenantId ? all.filter((c) => c.tenantId === tenantId) : all;
}

// Deterministic SLA breach check + auto-escalation.
export function tickSLA(): Case[] {
  const now = Date.now();
  const breached: Case[] = [];
  for (const c of cases.values()) {
    if (c.status === "escalated" || c.status === "resolved") continue;
    if (new Date(c.slaDueAt).getTime() < now) {
      c.status = "escalated";
      breached.push(c);
    }
  }
  return breached;
}
