"use client";

import { useCallback, useEffect, useState } from "react";

type Ticket = {
  id: string; priority: "critical" | "high" | "medium" | "low"; intent: string | null; reason: string;
  summary: string; status: "open" | "assigned" | "closed"; assignee: string | null; resolution_note: string | null;
  created_at: string; order_id: string; orders?: { persona_name: string; restaurant: string };
};
type Detail = {
  ticket: Ticket;
  order: { id: string; status: string; restaurant: string; items: { name: string; qty: number; price: number }[]; total: number; eta: string | null; refund_status: string; payment_charges: { amount: number; at: string }[] } | null;
  messages: { id: string; role: string; content: string }[];
  decisions: { id: string; stage: string; intent: string | null; confidence: number | null; reason: string | null; needs_human: boolean | null }[];
  events: { id: string; type: string; created_at: string }[];
};

const PRIO: Record<string, string> = {
  critical: "bg-red-600 text-white", high: "bg-orange-500 text-white", medium: "bg-yellow-400", low: "bg-neutral-300",
};
const PRIO_LABEL: Record<string, string> = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Agent() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Ticket[]>([]);
  const [closed, setClosed] = useState<Ticket[]>([]);
  const [sel, setSel] = useState<string>();
  const [detail, setDetail] = useState<Detail>();
  const [note, setNote] = useState("");
  const [name, setName] = useState("Atendente Demo");

  const load = useCallback(async () => {
    const r = await fetch("/api/agent/tickets");
    if (r.status === 401) return setAuthed(false);
    const d = await r.json();
    setAuthed(true); setOpen(d.open); setClosed(d.closed);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 5000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);
  useEffect(() => {
    if (!sel) return;
    fetch(`/api/agent/tickets/${sel}`).then((r) => r.json()).then(setDetail);
  }, [sel, open, closed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/agent/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (r.ok) { setErr(""); load(); } else setErr((await r.json()).error ?? "Erro");
  }

  async function act(action: "assign" | "close") {
    if (!sel) return;
    const r = await fetch(`/api/agent/tickets/${sel}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, assignee: name, note }) });
    if (!r.ok) setErr((await r.json()).error ?? "Erro"); else { setErr(""); setNote(""); if (action === "close") setSel(undefined); }
    load();
  }

  if (authed === null) return <main className="p-6 text-sm">Carregando…</main>;
  if (!authed)
    return (
      <main className="max-w-sm mx-auto p-6 w-full">
        <form onSubmit={login} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <h1 className="font-semibold">Painel do atendente</h1>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha da demonstração" className="border rounded px-3 py-2" />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="bg-neutral-900 text-white rounded py-2">Entrar</button>
        </form>
      </main>
    );

  return (
    <main className="grid md:grid-cols-[320px_1fr] gap-4 p-4 flex-1 max-w-6xl w-full mx-auto">
      <aside className="flex flex-col gap-2">
        <h2 className="font-semibold text-sm">Fila ({open.length})</h2>
        {open.length === 0 && <p className="text-sm text-neutral-500">Nenhum chamado aberto.</p>}
        {open.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} className={`text-left bg-white border rounded-lg p-2 text-sm ${sel === t.id ? "ring-2 ring-neutral-900" : ""}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${PRIO[t.priority]}`}>{PRIO_LABEL[t.priority]}</span>
              <span className="text-neutral-500 text-xs">{t.order_id} · {t.status === "assigned" ? `com ${t.assignee}` : "aberto"}</span>
            </div>
            <p className="mt-1 line-clamp-2">{t.summary}</p>
          </button>
        ))}
        {closed.length > 0 && <h2 className="font-semibold text-sm mt-3">Encerrados recentes</h2>}
        {closed.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} className="text-left bg-neutral-100 border rounded-lg p-2 text-xs text-neutral-600">
            {t.order_id} · {t.intent} — {t.resolution_note}
          </button>
        ))}
      </aside>

      <section className="bg-white border rounded-lg p-4 text-sm">
        {!detail || !sel ? <p className="text-neutral-500">Selecione um chamado.</p> : (
          <div className="flex flex-col gap-4">
            <div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${PRIO[detail.ticket.priority]}`}>{PRIO_LABEL[detail.ticket.priority]}</span>
              <h2 className="font-semibold mt-1">Motivo do encaminhamento</h2>
              <p>{detail.ticket.reason}</p>
              <p className="text-neutral-500 text-xs mt-1">Intenção: {detail.ticket.intent} · Status: {detail.ticket.status}</p>
            </div>
            {detail.order && (
              <div className="bg-neutral-50 border rounded p-2">
                <h3 className="font-semibold">Pedido {detail.order.id} · {detail.order.restaurant}</h3>
                <p>Status: {detail.order.status} · Total {brl(detail.order.total)} · Reembolso: {detail.order.refund_status}</p>
                <p>Itens: {detail.order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
                <p>Cobranças: {detail.order.payment_charges.map((c) => brl(c.amount)).join(" + ")}</p>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-1">Conversa</h3>
              <div className="flex flex-col gap-1.5">
                {detail.messages.map((m) => (
                  <div key={m.id} className={`rounded px-2 py-1.5 ${m.role === "customer" ? "bg-red-50" : "bg-neutral-100"}`}>
                    <b>{m.role === "customer" ? "Cliente" : m.role === "ai" ? "IA" : "Atendente"}:</b> {m.content}
                  </div>
                ))}
              </div>
            </div>
            <details>
              <summary className="cursor-pointer font-semibold">Decisões da IA ({detail.decisions.length})</summary>
              <ul className="mt-1 text-xs text-neutral-700 list-disc pl-4">
                {detail.decisions.map((d) => (
                  <li key={d.id}>{d.stage}: {d.intent ?? "—"} {d.confidence != null ? `(conf. ${d.confidence})` : ""} {d.needs_human ? "→ humano" : ""} {d.reason ?? ""}</li>
                ))}
              </ul>
            </details>
            {detail.ticket.status !== "closed" && (
              <div className="flex flex-col gap-2 border-t pt-3">
                <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1.5" aria-label="Nome do atendente" />
                {detail.ticket.status === "open" && <button onClick={() => act("assign")} className="bg-neutral-900 text-white rounded py-2">Assumir atendimento</button>}
                {detail.ticket.status === "assigned" && (
                  <>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota de resolução (obrigatória)" className="border rounded px-2 py-1.5" rows={2} />
                    <button onClick={() => act("close")} className="bg-green-700 text-white rounded py-2">Encerrar atendimento</button>
                  </>
                )}
                {err && <p className="text-red-600">{err}</p>}
              </div>
            )}
            {detail.ticket.status === "closed" && <p className="text-neutral-600">Encerrado: {detail.ticket.resolution_note}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
