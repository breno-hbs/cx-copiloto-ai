"use client";

import { useEffect, useRef, useState } from "react";

type OrderRow = { id: string; persona_name: string; restaurant: string; status: string };
type Msg = { role: "customer" | "ai" | "agent"; content: string };

const EXAMPLES = [
  "Meu pedido está atrasado, cadê ele?",
  "Como está o meu reembolso?",
  "Faltou a batata frita no meu pedido.",
  "Fui cobrado duas vezes pelo mesmo pedido.",
  "Tenho alergia a camarão e acho que passei mal.",
];

const STATUS: Record<string, string> = {
  out_for_delivery: "Em rota de entrega", delivered: "Entregue", cancelled: "Cancelado",
};

export default function Chat() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderId, setOrderId] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((o: OrderRow[]) => {
      if (Array.isArray(o)) { setOrders(o); setOrderId(o[0]?.id ?? ""); }
    });
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const change = (id: string) => { setOrderId(id); setConversationId(undefined); setMsgs([]); setEscalated(false); };

  async function send(message: string) {
    if (!message.trim() || busy || !orderId) return;
    setBusy(true);
    setText("");
    setMsgs((m) => [...m, { role: "customer", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, conversationId, message }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMsgs((m) => [...m, { role: "ai", content: data.reply ?? data.error ?? "Erro inesperado." }]);
      if (data.escalated) setEscalated(true);
    } catch {
      setMsgs((m) => [...m, { role: "ai", content: "Não foi possível enviar agora. Tente novamente." }]);
    } finally {
      setBusy(false);
    }
  }

  const current = orders.find((o) => o.id === orderId);

  const initials = (current?.restaurant ?? "CX").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <main className="flex-1 bg-[#F1EEE2] flex justify-center">
      <div className="w-full max-w-md flex flex-col h-[calc(100dvh-6.5rem)] min-h-[520px]">
        <header className="flex items-center gap-3 px-5 pt-4 pb-3.5 border-b border-[#D9D5C3]">
          <div className="size-10 rounded-full bg-[#4F5D2F] text-white font-extrabold flex items-center justify-center shrink-0">{initials}</div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-[17px] text-[#1C1F14] truncate">{current?.restaurant ?? "Carregando…"}</span>
            <span className="text-[13px] text-[#4F5D2F]">{current ? `${current.id} · ${STATUS[current.status] ?? current.status}` : ""}</span>
          </div>
        </header>

        <div className="flex items-center gap-2 px-5 py-2.5">
          <label htmlFor="sim" className="font-mono text-[11px] uppercase tracking-wider text-[#5B5E4A] shrink-0">Simular cliente</label>
          <select id="sim" value={orderId} onChange={(e) => change(e.target.value)} className="flex-1 min-w-0 bg-transparent border border-[#D9D5C3] rounded-lg px-2 py-1 text-sm text-[#1C1F14]">
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.id} · {o.persona_name}</option>
            ))}
          </select>
        </div>

        <section aria-live="polite" className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-3">
          {msgs.length === 0 && (
            <p className="text-sm text-[#5B5E4A] pt-2">Escreva uma mensagem ou toque em um exemplo abaixo.</p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex flex-col gap-1 ${m.role === "customer" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 text-base leading-snug whitespace-pre-wrap ${m.role === "customer" ? "bg-[#4F5D2F] text-white rounded-[18px_18px_4px_18px]" : "bg-white text-[#1C1F14] rounded-[18px_18px_18px_4px]"}`}>
                {m.content}
              </div>
              {m.role !== "customer" && <span className="text-xs text-[#5B5E4A]">Copiloto</span>}
            </div>
          ))}
          {busy && <div className="self-start text-sm text-[#5B5E4A]">Analisando…</div>}
          {escalated && (
            <div className="self-center text-[13px] font-medium bg-[#E3E0CC] text-[#3F4A25] rounded-2xl px-3.5 py-2 text-center">
              Caso encaminhado a um atendente humano com todo o contexto.
            </div>
          )}
          <div ref={bottom} />
        </section>

        <div className="border-t border-[#D9D5C3] pt-3 pb-5 flex flex-col gap-3">
          {msgs.length === 0 && (
            <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => send(e)} className="shrink-0 whitespace-nowrap border border-[#4F5D2F] text-[#3F4A25] font-medium text-sm rounded-full px-3.5 py-2 hover:bg-[#E3E0CC]">{e}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2.5 px-5">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Digite sua mensagem…" aria-label="Mensagem" className="flex-1 h-12 rounded-full bg-white px-[18px] text-base text-[#1C1F14] placeholder:text-[#6F7260] outline-none focus:ring-2 focus:ring-[#4F5D2F]" />
            <button disabled={busy || !text.trim()} aria-label="Enviar" className="size-12 rounded-full bg-[#4F5D2F] text-white flex items-center justify-center shrink-0 disabled:opacity-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
