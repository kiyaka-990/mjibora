import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { redact } from "./redact";
import { severityFloor, enforceFloor, slaFor, type Severity } from "./severity";
import { getTenant } from "./tenants";
import { nextRef, saveCase, type Case } from "./store";
import { emit } from "./events";

const model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o-mini");

// Intake Agent: classify category + proposed severity from REDACTED text.
export async function intakeAgent(tenantId: string, rawText: string) {
  const tenant = getTenant(tenantId);
  const { safe, redacted } = redact(rawText);
  emit("intake", `Received report${redacted ? " (PII redacted)" : ""}`);

  const { object } = await generateObject({
    model,
    schema: z.object({
      category: z.enum(tenant.categories as [string, ...string[]]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      headline: z.string().max(80),
    }),
    prompt:
      `Classify this ${tenant.id} service request. Choose category and severity. ` +
      `Text (redacted): "${safe}"`,
  });

  // Code-enforced severity floor — LLM cannot go below this:
  const floor = severityFloor(safe);
  const severity = enforceFloor(object.severity as Severity, floor);
  emit("intake", `Classified: ${object.category} · severity ${severity}${floor !== object.severity ? ` (floor raised from ${object.severity})` : ""}`);

  const slaHours = slaFor(severity, tenant);
  const ref = nextRef(tenant.id === "county" ? "CNTY" : tenant.id === "estate" ? "EST" : "SCH");
  const c: Case = {
    ref,
    tenantId,
    category: object.category,
    department: tenant.departments[object.category],
    severity,
    summarySafe: safe,
    letterDraft: null,
    slaHours,
    slaDueAt: new Date(Date.now() + slaHours * 3600e3).toISOString(),
    createdAt: new Date().toISOString(),
    status: "new",
    payStatus: tenant.fees[object.category] > 0 ? "awaiting_confirmation" : "not_required",
    feeKes: tenant.fees[object.category] ?? 0,
  };
  saveCase(c);
  emit("intake", `Case ${ref} filed · ${c.department} · SLA ${slaHours}h`);
  return c;
}

// Records Agent: official letter from redacted summary.
export async function recordsAgent(c: Case): Promise<string> {
  const tenant = getTenant(c.tenantId);
  emit("records", `Drafting official letter for ${c.ref}`);
  const { text } = await generateText({
    model,
    prompt:
      `Draft a formal 100-word official acknowledgement letter for a ` +
      `${tenant.name} case. Ref: ${c.ref}. Department: ${c.department}. ` +
      `Severity: ${c.severity}. SLA: ${c.slaHours} hours. ` +
      `Summary (redacted): "${c.summarySafe}". Formal tone, no personal data.`,
  });
  c.letterDraft = text;
  emit("records", `Letter drafted for ${c.ref}`);
  return text;
}
