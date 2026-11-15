# Design

## Pipeline
Voice/Text -> Intake Agent (LLM classify, redacted) -> Triage (code:
severity floor, SLA) -> Records Agent (LLM letter) -> Ref issued ->
Payment Agent (fee table, confirm gate) -> Dashboard (SLA stats).

## Trust boundary
LLM proposes; code disposes. Nothing the model outputs can:
lower severity, change SLA, alter the fee amount, or trigger payment
without the confirm-gate state machine (pending -> awaiting_confirmation
-> paid | blocked). PII never reaches the LLM (regex redaction upstream).

## Events
In-memory pub/sub; /api/events streams SSE for the live agent feed.

## Store
In-memory maps keyed by tenant + ref. Swap to Neon Postgres later;
the repository interface (store.ts) is the seam.
