import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { redact } from "./redact";
import { severityFloor, enforceFloor, slaFor, type Severity } from "./severity";
import { getTenant, type TenantConfig } from "./tenants";
import { nextRef, saveCase, type Case } from "./store";
import { emit } from "./events";

export interface AgentRun {
  steps: Array<{ tool: string; args: unknown }>;
  case: Case;
  letter: string;
}

// Category keyword guesses for the no-API-key fallback.
const KEYWORDS: Record<string, RegExp> = {
  water: /water|maji|bomba|pipe/i,
  roads: /road|barabara|pothole|shimo/i,
  waste: /garbage|waste|takataka|trash/i,
  lighting: /light|taa|lamp/i,
  drainage: /drain|mtaro|sewage/i,
  security: /theft|thief|break[- ]?in|guard| insecurity/i,
  maintenance: /leak|broken|fence|gate|lift|elevator|repair/i,
  landscaping: /garden|grass|lawn|tree|hedge/i,
  noise: /noise|kelele|loud/i,
  facilities: /bathroom|toilet|classroom|block|dirty|uchafu/i,
  bullying: /bully|harass|intimidat/i,
  academics: /exam|grade|homework|lesson|teacher/i,
  transport: /bus|van|transport|driver/i,
  health: /sick|nurse|fever|health|injur|clinic/i,
};

function heuristicCategory(tenant: TenantConfig, safe: string): string {
  for (const cat of tenant.categories) {
    const re = KEYWORDS[cat];
    if (re && re.test(safe)) return cat;
  }
  return tenant.categories[0];
}

function templateLetter(c: Case, tenantName: string): string {
  return (
    `Dear Sir/Madam,\n\n` +
    `We acknowledge receipt of your report regarding ${c.category} ` +
    `(Ref: ${c.ref}). The matter has been logged with ${c.department} ` +
    `and classified as ${c.severity} priority, with a service-level ` +
    `target of ${c.slaHours} hours. You will receive updates as the ` +
    `case progresses. Thank you for helping improve our services.\n\n` +
    `Sincerely,\n${tenantName}`
  );
}

export async function runIntakeAgent(tenantId: string, rawText: string): Promise<AgentRun> {
  const tenant = getTenant(tenantId);
  const { safe, redacted } = redact(rawText);
  emit("intake", `Received report${redacted ? " (PII redacted)" : ""}`);
  const floor = severityFloor(safe);

  let filed: Case | null = null;
  const fileCase = (category: string, proposed: Severity): Case => {
    const cat = tenant.categories.includes(category) ? category : tenant.categories[0];
    const severity = enforceFloor(proposed, floor);
    if (severity !== proposed) {
      emit("intake", `Severity floor raised: ${proposed} -> ${severity} (code-enforced)`);
    }
    const slaHours = slaFor(severity, tenant);
    const ref = nextRef(tenant.id === "county" ? "CNTY" : tenant.id === "estate" ? "EST" : "SCH");
    const c: Case = {
      ref,
      tenantId,
      category: cat,
      department: tenant.departments[cat] ?? "General Services",
      severity,
      summarySafe: safe,
      letterDraft: null,
      slaHours,
      slaDueAt: new Date(Date.now() + slaHours * 3600e3).toISOString(),
      createdAt: new Date().toISOString(),
      status: "new",
      payStatus: tenant.fees[cat] > 0 ? "awaiting_confirmation" : "not_required",
      feeKes: tenant.fees[cat] ?? 0,
    };
    saveCase(c);
    filed = c;
    emit("intake", `Case ${ref} filed · ${c.department} · SLA ${slaHours}h`);
    return c;
  };

  // ---- Fallback: no API key configured -> pure-code classifier.
  // The demo must never dead-end; guardrails still apply.
  if (!process.env.OPENAI_API_KEY) {
    emit("intake", "No OPENAI_API_KEY — using heuristic classifier (all guardrails active)");
    const category = heuristicCategory(tenant, safe);
    const steps: AgentRun["steps"] = [
      { tool: "classify", args: { category, severity: floor, mode: "heuristic" } },
    ];
    const c = fileCase(category, floor);
    steps.push({ tool: "file", args: { category: c.category, severity: c.severity } });
    const letter = templateLetter(c, tenant.name);
    c.letterDraft = letter;
    return { steps, case: c, letter };
  }

  // ---- Full agent loop: tools with execute so maxSteps actually runs.
  const classify = tool({
    description:
      "Classify a service request into one of the tenant's categories with a proposed severity. " +
      "Code applies a keyword severity floor to your answer — you may raise severity, never lower it.",
    parameters: z.object({
      category: z.enum(tenant.categories as [string, ...string[]]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      headline: z.string().max(80),
    }),
    execute: async ({ category, severity, headline }) => {
      const final = enforceFloor(severity, floor);
      if (final !== severity) emit("intake", `classify -> ${category} · floor raised ${severity} -> ${final}`);
      else emit("intake", `classify -> ${category} · ${final}`);
      return { category, severity: final, floorRaised: final !== severity, headline };
    },
  });

  const file = tool({
    description: "File the official case using the final classification. SLA and fees come from config.",
    parameters: z.object({
      category: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
    }),
    execute: async ({ category, severity }) => {
      const c = fileCase(category, severity);
      return { ref: c.ref, department: c.department, slaHours: c.slaHours, feeKes: c.feeKes };
    },
  });

  let letter = "";
  let steps: AgentRun["steps"] = [];
  try {
    const res = await generateText({
      model: createOpenAI({ apiKey: process.env.OPENAI_API_KEY })("gpt-4o-mini"),
      tools: { classify, file },
      maxSteps: 6,
      system:
        `You are the intake agent for a ${tenant.id} service desk. ` +
        `Categories: ${tenant.categories.join(", ")}. ` +
        `Steps: 1) Call classify for this request. 2) Call file to record it with the same category and severity. ` +
        `3) Then write a formal 90-word acknowledgement letter naming the reference you received from the file tool. ` +
        `Formal tone, no personal data. Text (redacted): "${safe}"`,
      prompt: safe,
    });
    steps = res.steps.flatMap((s) =>
      (s.toolCalls ?? []).map((tc) => ({ tool: tc.toolName, args: tc.args }))
    );
    letter = res.text?.trim() ?? "";
  } catch (err) {
    emit("intake", `LLM error — falling back to heuristic classifier: ${(err as Error).message}`);
  }

  // If the model never called file (or LLM errored), code files it — never dead-end.
  if (!filed) {
    const category = heuristicCategory(tenant, safe);
    filed = fileCase(category, floor);
    steps.push({ tool: "file", args: { category: filed.category, severity: filed.severity, mode: "fallback" } });
  }
  if (!letter) letter = templateLetter(filed, tenant.name);
  filed.letterDraft = letter;
  return { steps, case: filed, letter };
}

export function dedupe(tenantId: string, safe: string): Case | null {
  const norm = safe.toLowerCase().replace(/\W+/g, " ").trim();
  const existing = [...(function () { return require("./store").allCases(tenantId); })()].find(
    (c: Case) => c.summarySafe.toLowerCase().replace(/\W+/g, " ").trim() === norm
  );
  if (existing) emit("intake", `Duplicate of ${existing.ref} detected — merged`);
  return existing ?? null;
}
