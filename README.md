# MjiBora — Multi-Tenant AI Service Desk

Voice-first AI service desk for counties, estates, and schools.
Residents describe an issue by voice (Swahili or English) or text;
a pipeline of specialized agents classifies it, enforces severity/SLA
in code, drafts an official letter, collects statutory fees via M-Pesa
(simulated by default), and feeds a public accountability dashboard.

## Agent pipeline
Intake Agent (classify, redacted) → Triage (code: severity floor, SLA)
→ Records Agent (official letter) → Payment Agent (confirm-gated STK)
→ Accountability Dashboard (SLA compliance stats)

## Hard guarantees (code, not prompts)
- PII redacted by deterministic regex BEFORE any LLM call
- Severity floor via keyword rules — the LLM can never downgrade
- SLA clock deterministic; auto-escalation on breach
- Fee amounts come from tenant config; LLM and client cannot set them
- Payment blocked without explicit confirmation (state machine gate)

## Run
1. cp .env.example .env.local and add your OPENAI_API_KEY
2. npm install
3. npm run dev → http://localhost:3000

## Tenants out of the box
County (citizen complaints) · Estate (HOA maintenance) · School (parent desk)

## Stack
Next.js 15 · Vercel AI SDK · SSE live feed · Browser Speech API (sw-KE/en-KE) · M-Pesa Daraja sandbox
