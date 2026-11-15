import type { TenantConfig } from "./tenants";

export type Severity = "low" | "medium" | "high" | "critical";

// Keyword floors: severity can never be lower than these matches allow.
// Bilingual — Swahili complaints must trigger the same floors as English.
const FLOOR_RULES: Array<[RegExp, Severity]> = [
  // English — critical
  [/\b(explosion|collapsed?|electrocut\w*|drowning|landslide|gas leak|injur\w+)\b/i, "critical"],
  [/\b(fire|flood\w*|sewage overflow|contaminated water)\b/i, "critical"],
  // English — high
  [/\b(burst|pipe leak|no water (for|since)|outage|sewage|leak\w*)\b/i, "high"],
  // English — medium
  [/\b(pothole|street ?light|garbage|waste|drain\w*|blocked)\b/i, "medium"],
  // English — low
  [/\b(rude|slow|dirty|noise)\b/i, "low"],
  // Kiswahili — critical (moto=fire, mafuriko=flood, ajali=accident,
  // dharura=emergency, sumu=poison/electrocution, limepasuka/imepasuka=burst)
  [/\b(moto|mafuriko|ajali|dharura|sumu|ameumia|ameanguka|limepasuka|imepasuka|imeangika)\b/i, "critical"],
  // Kiswahili — high (mbombomvu/ bombo=pipe, hakuna maji=no water, mtaro=drain)
  [/\b(mbombomvu|bombo|hakuna maji|maji yanamwagika|maji yamejaa)\b/i, "high"],
  // Kiswahili — medium (takataka=garbage, taa=street light, shimo=pothole/hole,
  // barabara=road, mtaro=drain)
  [/\b(takataka|taa|shimo|barabara|mtaro)\b/i, "medium"],
  // Kiswahili — low (kelele=noise, uchafu=dirt)
  [/\b(kelele|uchafu)\b/i, "low"],
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
