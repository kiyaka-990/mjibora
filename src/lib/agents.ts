import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { redact } from "./redact";
import { severityFloor, enforceFloor, slaFor, type Severity } from "./severity";
import { getTenant } from "./tenants";
import { nextRef, saveCase, allCases, type Case } from "./store";
import { emit } from "./events";

const model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o-mini");

// ---------------------------------------------------------------------------
// Tools the agent may call. Tools with side effects are gated by code:
// classifyTool enforces the severity floor; fileTool creates the case record.
// ---------------------------------------------------------------------------

const classifyTool = tool({
  description:
    "Classify a service request into a category and proposed severity. " +
    "The system applies a keyword severity floor afterwards — you may raise " +
    "severity, but code decides the final value.",
  parameters: z.object({
    category: z.string().describe("One of the tenant's categories"),
    severity: z.enum(["low", "medium", "high", "critical"]),
    headline: z.string().max(80),
  }),
});

const fileTool = tool({
  description:
    "File the official case with the final classification. Only callable once " +
    "per request; SLA hours come from tenant config, not from you.",
  parameters: z.object({
    category: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
  }),
});

export interface AgentRun {
  steps: Array<{ tool: string; args: unknown }>;
  case: Case;
  letter: string;
}

// One tool-calling agent loop with visible reasoning. It classifies, then
// files — and the floor enforcement happens inside the loop, in code.
export async function runIntakeAgent(tenantId: string, rawText: string): Promise<AgentRun> {
  const tenant = getTenant(tenantId);
  const { safe, redacted } = redact(rawText);
  emit("intake", `Received report${redacted ? " (PII redacted)" : ""}`);

  let proposed: { category: string; severity: Severity; headline: string } | null = null;
  const steps: AgentRun["steps"] = [];

  const { text: letter } = await generateText({
    model,
    tools: { classify: classifyTool, file: fileTool },
    maxSteps: 5,
    system:
      `You are the intake agent for a ${tenant.id} service desk. Steps: ` +
      `1) Call classify with the best category (one of: ${tenant.categories.join(", ")}) ` +
      `and severity for this request. 2) Call file to record it. 3) Draft a formal ` +
      `90-word acknowledgement letter naming the reference the system will issue. ` +
      `Text (redacted): "${safe}"`,
    prompt: safe,
    experimental_toolCallStreaming: true,
    onFinish: ({ toolCalls, toolResults }: any) => {
      for (const tc of toolCalls) {
        steps.push({ tool: tc.toolName, args: tc.args });
        emit("intake", `Tool call: ${tc.toolName}`);
      }
    },
  });

  // Extract the last classify + file results from steps
  const classifyStep = [...steps].reverse().find((s) => s.tool === "classify");
  const fileStep = [...steps].reverse().find((s) => s.tool === "file");
  if (!classifyStep || !fileStep) {
    throw new Error("Agent did not complete classify + file");
  }

  proposed = classifyStep.args as typeof proposed;

  // Code-enforced floor — AFTER the loop, outside the model:
  const floor = severityFloor(safe);
  const severity = enforceFloor(proposed.severity, floor);
  emit("intake", `Severity ${severity}${floor !== proposed.severity ? ` (floor raised from ${proposed.severity})` : ""}`);

  const slaHours = slaFor(severity, tenant);
  const ref = nextRef(tenant.id === "county" ? "CNTY" : tenant.id === "estate" ? "EST" : "SCH");
  const c: Case = {
    ref,
    tenantId,
    category: proposed.category,
    department: tenant.departments[proposed.category] ?? "General Services",
    severity,
    summarySafe: safe,
    letterDraft: letter,
    slaHours,
    slaDueAt: new Date(Date.now() + slaHours * 3600e3).toISOString(),
    createdAt: new Date().toISOString(),
    status: "new",
    payStatus: tenant.fees[proposed.category] > 0 ? "awaiting_confirmation" : "not_required",
    feeKes: tenant.fees[proposed.category] ?? 0,
  };
  saveCase(c);
  emit("intake", `Case ${ref} filed · ${c.department} · SLA ${slaHours}h`);
  return { steps, case: c, letter };
}

export function dedupe(tenantId: string, safe: string): Case | null {
  // Simple same-tenant, same-normalised-text duplicate check.
  const norm = safe.toLowerCase().replace(/\W+/g, " ").trim();
  const existing = allCases(tenantId).find(
    (c) => c.summarySafe.toLowerCase().replace(/\W+/g, " ").trim() === norm
  );
  if (existing) emit("intake", `Duplicate of ${existing.ref} detected — merged`);
  return existing ?? null;
}
