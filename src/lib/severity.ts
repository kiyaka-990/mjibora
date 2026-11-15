import type { TenantConfig } from "./tenants";

export type Severity = "low" | "medium" | "high" | "critical";

// Keyword floors: severity can never be lower than these matches allow.
const FLOOR_RULES: Array<[RegExp, Severity]> = [
  [/\b(explosion|collapsed?|burst|electrocut\w*|drowning)\b/i, "critical"],
  [/\b(fire|flood\w*|injur\w+|gas leak|sewage overflow|landslide)\b/i, "critical"],
  [/\b(burst pipe|no water (for|since)|outage|sewage|contaminated water)\b/i, "high"],
  [/\b(pothole|street ?light|garbage|waste|drain\w*|blocked)\b/i, "medium"],
  [/\b(rude|slow|dirty|noise)\b/i, "low"],
];

const RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function severityFloor(text: string): Severity {
  let floor: Severity = "low";
  for (const [re, sev] of FLOOR_RULES) {
    if (re.test(text)) {
      if (RANK[sev] > RANK[floor]) floor = sev;
    }
  }
  return floor;
}

export function enforceFloor(proposed: Severity, floor: Severity): Severity {
  return RANK[proposed] >= RANK[floor] ? proposed : floor;
}

export function slaFor(severity: Severity, tenant: TenantConfig): number {
  return tenant.slaHours[severity];
}
