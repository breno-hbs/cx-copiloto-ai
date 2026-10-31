import { metrics } from "@/lib/db";

const avgMin = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length / 60000) * 10) / 10 : null);

export async function GET() {
  try {
    const m = await metrics();
    const total = m.conversations.length;
    const aiResolved = m.conversations.filter((c) => c.status === "ai_resolved").length;
    const escalated = m.conversations.filter((c) => c.status === "escalated" || c.status === "closed").length;
    const toAssign = m.tickets.filter((t) => t.assigned_at).map((t) => +new Date(t.assigned_at!) - +new Date(t.created_at));
    const toClose = m.tickets.filter((t) => t.closed_at).map((t) => +new Date(t.closed_at!) - +new Date(t.created_at));
    const byIntent: Record<string, number> = {};
    for (const d of m.decisions.filter((d) => d.stage === "triage" || d.stage === "rule"))
      if (d.intent) byIntent[d.intent] = (byIntent[d.intent] ?? 0) + 1;
    const lat = m.decisions.filter((d) => d.latency_ms != null).map((d) => d.latency_ms!);
    return Response.json({
      total, aiResolved, escalated,
      aiRate: total ? Math.round((aiResolved / total) * 100) : 0,
      openTickets: m.tickets.filter((t) => t.status !== "closed").length,
      avgMinToAssign: avgMin(toAssign),
      avgMinToClose: avgMin(toClose),
      avgLlmLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
      byIntent,
    });
  } catch {
    return Response.json({ error: "Falha ao calcular métricas" }, { status: 500 });
  }
}
