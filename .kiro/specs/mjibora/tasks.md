# Tasks

## v2.1 — Audit fixes (Nov 15)
- [x] Bilingual (Swahili + English) severity floors
- [x] Guardrail test suite (10 tests: floors + PII redaction, idempotent)
- [x] Real tool-calling agent loop with visible reasoning steps
- [x] Duplicate detection + merge
- [x] WhatsApp intake channel (Twilio sandbox, optional)
- [x] Background SLA ticker (60s) independent of dashboard polling
- [x] README v2.1 with 60-second demo script

## Remaining to full production
- [ ] Merge PR #1 to main
- [ ] Vercel deploy (needs public repo + env vars)
- [ ] 2-minute demo video
- [ ] Tenant auth/isolation (tenant admin portal + per-tenant keys)
- [ ] Neon Postgres migration (store.ts is the seam)
- [ ] M-Pesa callback endpoint (production payments)
- [ ] Field pilot with one estate/county
