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

const DOT: Record<string, string> = {
  critical: "bg-[#D92D20]", high: "bg-[#F79009]", medium: "bg-[#EAB308]", low: "bg-[#98A2B3]",
};
const PRIO_LABEL: Record<string, string> = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };
const STATUS_LABEL: Record<string, string> = { open: "Aberto", assigned: "Em atendimento", closed: "Encerrado" };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const LABEL = "font-mono text-xs uppercase tracking-widest text-[#6B6B6B]";
const INPUT = "border border-[#CCCCCC] rounded-md px-3 outline-none focus:border-[#1F4FD8] focus:ring-2 focus:ring-[#1F4FD8]/20";
const waited = (iso: string, now: number) => {
  if (!now) return "—";
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`;
};

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
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch("/api/agent/tickets");
    if (r.status === 401) return setAuthed(false);
    const d = await r.json();
    setAuthed(true); setOpen(d.open); setClosed(d.closed); setNow(Date.now());
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

  if (authed === null) return <main className="p-8 text-sm text-[#6B6B6B]">Carregando…</main>;
  if (!authed)
    return (
      <main className="max-w-sm mx-auto px-6 py-16 w-full">
        <form onSubmit={login} className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Painel do atendente</h1>
          <p className="text-sm text-[#6B6B6B]">Acesso restrito à demonstração.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha da demonstração" aria-label="Senha" className={`${INPUT} h-11`} />
          {err && <p className="text-sm text-[#D92D20]">{err}</p>}
          <button className="bg-[#1F4FD8] text-white font-semibold rounded-md h-11">Entrar</button>
        </form>
      </main>
    );

  return (
    <main className="grid lg:grid-cols-[minmax(0,760px)_1fr] flex-1 w-full">
      <aside className="flex flex-col border-b lg:border-b-0 lg:border-r border-[#E6E6E6]">
        <div className="flex items-baseline justify-between px-8 pt-7 pb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[28px] font-extrabold tracking-tight">Fila</h2>
            <span className="font-mono text-sm text-[#6B6B6B]">{open.length} abertos</span>
          </div>
          <span className={`hidden sm:block ${LABEL}`}>Ordenado por prioridade</span>
        </div>
        <div className={`flex items-center h-9 px-8 gap-3 border-y border-[#E6E6E6] ${LABEL}`}>
          <span className="w-7 shrink-0" />
          <span className="w-24 shrink-0">Pedido</span>
          <span className="flex-1">Motivo</span>
          <span className="hidden sm:block w-32 shrink-0">Status</span>
          <span className="w-14 shrink-0 text-right">Espera</span>
        </div>
        {open.length === 0 && <p className="px-8 py-6 text-sm text-[#6B6B6B]">Nenhum chamado aberto.</p>}
        {open.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} className={`w-full flex items-center gap-3 h-16 px-8 text-left border-b border-[#E6E6E6] border-l-[3px] hover:bg-[#F7F8FC] ${sel === t.id ? "bg-[#EEF2FD] border-l-[#1F4FD8]" : "border-l-transparent"}`}>
            <span className="w-7 shrink-0"><span className={`block size-2.5 rounded-full ${DOT[t.priority]}`} title={PRIO_LABEL[t.priority]} /></span>
            <span className="w-24 shrink-0 font-mono text-sm font-semibold">{t.order_id}</span>
            <span className={`flex-1 min-w-0 truncate text-[15px] ${sel === t.id ? "font-semibold" : ""}`}>{t.summary}</span>
            <span className="hidden sm:block w-32 shrink-0 text-sm">{STATUS_LABEL[t.status]}</span>
            <span className={`w-14 shrink-0 text-right font-mono text-sm ${t.priority === "critical" ? "text-[#D92D20]" : "text-[#6B6B6B]"}`}>{waited(t.created_at, now)}</span>
          </button>
        ))}
        {closed.length > 0 && <h3 className={`px-8 pt-6 pb-2 ${LABEL}`}>Encerrados recentes</h3>}
        {closed.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} className={`text-left px-8 py-3 border-b border-[#E6E6E6] text-sm text-[#6B6B6B] hover:bg-[#F7F8FC] ${sel === t.id ? "bg-[#EEF2FD]" : ""}`}>
            <span className="font-mono font-semibold text-[#111111]">{t.order_id}</span> · {t.intent} — {t.resolution_note}
          </button>
        ))}
      </aside>

      <section className="p-8 text-[15px]">
        {!detail || !sel ? <p className="text-[#6B6B6B]">Selecione um chamado.</p> : (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col gap-2">
              <span className={`font-mono text-xs uppercase tracking-widest ${detail.ticket.priority === "critical" ? "text-[#D92D20]" : "text-[#6B6B6B]"}`}>
                ● {PRIO_LABEL[detail.ticket.priority]} · {STATUS_LABEL[detail.ticket.status]}
              </span>
              <h2 className="text-[32px] leading-9 font-extrabold tracking-tight">
                {detail.ticket.order_id}{detail.ticket.orders ? ` · ${detail.ticket.orders.persona_name}` : ""}
              </h2>
              {detail.order && <p className="text-[#6B6B6B]">{detail.order.restaurant} · {detail.order.status} · {brl(detail.order.total)}</p>}
            </div>

            <div className="flex flex-col gap-2 pt-5 border-t border-[#E6E6E6]">
              <h3 className={LABEL}>Por que chegou aqui</h3>
              <p className="text-base leading-6">{detail.ticket.reason}</p>
              <p className="text-sm text-[#6B6B6B]">Intenção: {detail.ticket.intent ?? "—"}</p>
            </div>

            {detail.order && (
              <div className="flex flex-col gap-1.5 pt-5 border-t border-[#E6E6E6]">
                <h3 className={LABEL}>Pedido</h3>
                <p>Reembolso: {detail.order.refund_status}</p>
                <p>Itens: {detail.order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
                <p>Cobranças: {detail.order.payment_charges.map((c) => brl(c.amount)).join(" + ")}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-5 border-t border-[#E6E6E6]">
              <h3 className={LABEL}>Conversa</h3>
              {detail.messages.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <span className={`w-[72px] shrink-0 font-mono text-[13px] ${m.role === "customer" ? "text-[#6B6B6B]" : "text-[#1F4FD8]"}`}>
                    {m.role === "customer" ? "Cliente" : m.role === "ai" ? "Copiloto" : "Atendente"}
                  </span>
                  <span className="flex-1 leading-[22px]">{m.content}</span>
                </div>
              ))}
            </div>

            <details className="pt-5 border-t border-[#E6E6E6]">
              <summary className={`cursor-pointer ${LABEL}`}>Decisões da IA ({detail.decisions.length})</summary>
              <ul className="mt-2 text-sm text-[#444444] list-disc pl-4 flex flex-col gap-1">
                {detail.decisions.map((d) => (
                  <li key={d.id}>{d.stage}: {d.intent ?? "—"} {d.confidence != null ? `(conf. ${d.confidence})` : ""} {d.needs_human ? "→ humano" : ""} {d.reason ?? ""}</li>
                ))}
              </ul>
            </details>

            {detail.ticket.status !== "closed" && (
              <div className="flex flex-col gap-3 mt-auto pt-5 border-t border-[#E6E6E6]">
                <input value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} h-11`} aria-label="Nome do atendente" />
                {detail.ticket.status === "assigned" && (
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota de resolução (obrigatória)" className={`${INPUT} py-2`} rows={2} />
                )}
                <div className="flex gap-3">
                  {detail.ticket.status === "open" && <button onClick={() => act("assign")} className="bg-[#1F4FD8] text-white font-semibold rounded-md h-11 px-5">Assumir atendimento</button>}
                  {detail.ticket.status === "assigned" && <button onClick={() => act("close")} className="bg-[#1F4FD8] text-white font-semibold rounded-md h-11 px-5">Encerrar atendimento</button>}
                </div>
                {err && <p className="text-[#D92D20]">{err}</p>}
              </div>
            )}
            {detail.ticket.status === "closed" && <p className="text-[#6B6B6B]">Encerrado: {detail.ticket.resolution_note}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
