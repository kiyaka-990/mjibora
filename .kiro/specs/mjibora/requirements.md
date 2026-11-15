# MjiBora v2 — Requirements

## Concept
MjiBora ("better city") is a multi-tenant, voice-first AI service desk.
Residents/members describe an issue by voice or text; a pipeline of
specialized agents classifies it, enforces severity/SLA in code, files an
official reference, collects any statutory fee via M-Pesa, and feeds a
public accountability dashboard.

## Tenants (multi-tenant from day one)
- county: citizen complaints (water, roads, waste, lighting, drainage, security)
- estate: HOA maintenance + security incidents
- school: parent grievances + facility issues
Each tenant defines categories, departments, SLA hours per severity, fees.

## Agent pipeline
1. Intake Agent (LLM): classify category + severity from redacted text.
2. Triage (code, not LLM): severity floor via keyword rules; SLA assigned.
3. Records Agent (LLM): draft official summary letter (redacted input).
4. Payment Agent: M-Pesa STK for statutory fee (sim mode default);
   payment gated on explicit user confirmation, amount fixed in code.

## Hard guarantees (code-enforced)
- PII redaction before any LLM call (deterministic regex).
- Severity never lowered below keyword floor.
- SLA clock deterministic; auto-escalation on breach.
- Fee amounts come from tenant config; LLM cannot set amounts.

## Non-functional
Next.js 15 App Router, TypeScript, Vercel deployable, SSE live feed,
Browser Speech API (sw-KE / en-KE), in-memory store (upgrade path: Neon).
