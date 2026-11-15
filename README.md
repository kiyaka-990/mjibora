# MjiBora v2.1 — Multi-Tenant, Voice-First AI Service Desk

Residents describe an issue by **voice (Swahili or English), text, or WhatsApp**; a
tool-calling AI agent classifies it, code-enforced guardrails set severity/SLA,
an official letter is drafted, statutory fees collect via M-Pesa (simulated by
default), and a public accountability dashboard tracks SLA compliance.

## The agent loop (visible reasoning)
One tool-calling agent: `classify` → `file` → letter draft, streamed to the
live SSE feed so judges watch every step. Duplicate reports merge automatically.

## Guardrails — code, not prompts (10 passing tests)
- **PII redacted by deterministic regex BEFORE any LLM call** — idempotent
- **Bilingual severity floors (English + Kiswahili)**: "bomba limepasuka",
  "moto", "hakuna maji", "takataka" trigger the same floors as
  "burst pipe", "fire", "no water", "garbage". The LLM may raise severity,
  **never lower it** — proven in `src/lib/severity.test.ts`
- **SLA clock deterministic**; background ticker escalates breaches every 60s
- **Fee amounts from tenant config only** — LLM and client cannot set them
- **Confirm-gate state machine** blocks payment without explicit confirmation

## Intake channels
- Web (voice sw-KE / en-KE + text) — always works
- WhatsApp via Twilio sandbox webhook (`POST /api/whatsapp`) — optional

## Tenants out of the box
County (citizen complaints) · Estate (HOA maintenance) · School (parent desk)

## Run
```bash
cp .env.example .env.local   # add OPENAI_API_KEY (others optional)
npm install
npm test                      # 10 guardrail tests
npm run dev                   # http://localhost:3000
```

## Demo script (60 seconds)
1. County tab → Sample → Submit: watch `[intake]` tool calls + floor enforcement
2. Submit the same text again → **duplicate merged** into the same ref
3. Estate/School tabs → whole config flips (multi-tenant proof)
4. Submit again in Swahili: "Bomba la maji limepasuka…" → critical floor fires
5. Fee flow: "Blocked drain…" → confirm-gated STK push (sim) → paid ✓

## Stack
Next.js 15 · Vercel AI SDK (tool-calling) · SSE live feed · Browser Speech API
(sw-KE/en-KE) · M-Pesa Daraja sandbox · Twilio WhatsApp sandbox (optional)

MIT License.
