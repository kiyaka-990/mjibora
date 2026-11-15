"use client";

import { useEffect, useRef, useState } from "react";

const TENANTS = [
  { id: "county", label: "County 🏛️", sample: "There has been a burst water pipe flooding Moi Avenue since yesterday, water everywhere and the road is collapsing. Call 0712345678." },
  { id: "estate", label: "Estate 🏡", sample: "Street light at Gate B is out and it is very dark at night, someone almost got injured yesterday." },
  { id: "school", label: "School 🎓", sample: "The bathroom in Block C has been dirty for a week and parents are complaining." },
];

interface CaseRow {
  ref: string; tenantId: string; category: string; department: string;
  severity: string; status: string; slaDueAt: string; slaHours: number;
  payStatus: string; feeKes: number;
}

interface ReportResult {
  ref: string; category: string; department: string; severity: string;
  slaHours: number; feeKes: number; payStatus: string; letter: string;
}

export default function Desk() {
  const [tenantId, setTenantId] = useState("county");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [phone, setPhone] = useState("");
  const [feed, setFeed] = useState<{ at: string; agent: string; msg: string }[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [stats, setStats] = useState<{ total: number; open: number; escalated: number; resolved: number; slaCompliance: number } | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const tenant = TENANTS.find((t) => t.id === tenantId)!;

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => setFeed((f) => [...f, JSON.parse(e.data)]);
    return () => es.close();
  }, []);

  useEffect(() => {
    const load = async () => {
      const r = await fetch(`/api/reports?tenantId=${tenantId}`);
      const d = await r.json();
      setCases(d.cases ?? []);
      setStats(d.stats ?? null);
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [tenantId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, text }),
      });
      setResult(await r.json());
      setText("");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!result) return;
    await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: result.ref, phone, confirm: true }),
    });
    setResult({ ...result, payStatus: "paid" });
  }

  function startVoice() {
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) { alert("Voice not supported — use Chrome."); return; }
    const rec = new SR();
    rec.lang = tenantId === "school" ? "en-KE" : "sw-KE";
    rec.onresult = (e: any) => setText(e.results[0][0].transcript);
    rec.start();
  }

  const sevColor: Record<string, string> = { low: "#8bc34a", medium: "#ffc107", high: "#ff9800", critical: "#f44336" };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>🌍 MjiBora <span style={{ fontSize: 14, opacity: 0.6 }}>AI Service Desk — voice-first, multi-tenant</span></h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TENANTS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTenantId(t.id)}
            style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${tenantId === t.id ? "#4caf50" : "#24344d"}`,
              background: tenantId === t.id ? "#16351f" : "#0f1b2b", color: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
        <section>
          <h3 style={{ margin: "0 0 8px" }}>Report an issue</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={tenant.sample}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #24344d", background: "#0c1826", color: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={startVoice} style={btn}>🎙️ Voice</button>
            <button onClick={submit} disabled={busy} style={{ ...btn, background: "#2e7d32" }}>
              {busy ? "Agents working…" : "Submit"}
            </button>
            <button onClick={() => setText(tenant.sample)} style={btn}>Sample</button>
          </div>

          {result && (
            <div style={{ marginTop: 16, border: "1px solid #24344d", borderRadius: 12, padding: 16 }}>
              <h4 style={{ marginTop: 0 }}>
                Case {result.ref} — <span style={{ color: sevColor[result.severity] }}>{result.severity}</span>
              </h4>
              <p style={{ fontSize: 14 }}>
                {result.category} → {result.department} · SLA {result.slaHours}h
                {result.feeKes > 0 ? ` · fee KES ${result.feeKes}` : " · no fee"}
              </p>
              <p style={{ fontSize: 13, whiteSpace: "pre-wrap", opacity: 0.85 }}>{result.letter}</p>
              {result.payStatus === "awaiting_confirmation" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="2547XXXXXXXX"
                    style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #24344d", background: "#0c1826", color: "inherit" }}
                  />
                  <button onClick={pay} style={{ ...btn, background: "#b8860b" }}>Pay fee</button>
                </div>
              )}
              {result.payStatus === "paid" && <p style={{ color: "#8bc34a" }}>Fee paid ✓ (simulated)</p>}
            </div>
          )}

          <h3 style={{ marginTop: 24 }}>📋 Cases & accountability</h3>
          {stats && (
            <p style={{ fontSize: 14 }}>
              {stats.total} total · {stats.open} open · {stats.escalated} escalated · {stats.resolved} resolved ·
              <strong style={{ color: stats.slaCompliance >= 90 ? "#8bc34a" : "#f44336" }}> {stats.slaCompliance}% SLA compliance</strong>
            </p>
          )}
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th>Ref</th><th>Category</th><th>Severity</th><th>Status</th><th>SLA due</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.ref} style={{ borderTop: "1px solid #1a2a3d" }}>
                  <td>{c.ref}</td>
                  <td>{c.category}</td>
                  <td style={{ color: sevColor[c.severity] }}>{c.severity}</td>
                  <td>{c.status}</td>
                  <td>{new Date(c.slaDueAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>⚡ Live agent feed</h3>
          <div ref={feedRef} style={{ border: "1px solid #24344d", borderRadius: 12, padding: 12, height: 520, overflowY: "auto", fontSize: 13 }}>
            {feed.length === 0 && <p style={{ opacity: 0.5 }}>Agents idle — submit a report to watch the pipeline work.</p>}
            {feed.map((e, i) => (
              <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #16243a" }}>
                <span style={{ opacity: 0.5 }}>{new Date(e.at).toLocaleTimeString()} </span>
                <strong style={{ color: e.agent === "payment" ? "#ffc107" : "#4fc3f7" }}>[{e.agent}]</strong> {e.msg}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 8, cursor: "pointer",
  border: "1px solid #24344d", background: "#0f1b2b", color: "inherit",
};