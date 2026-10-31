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

  return (
    <main className="max-w-2xl w-full mx-auto p-4 flex flex-col gap-3 flex-1">
      <section className="bg-white border rounded-lg p-3 text-sm">
        <label className="block text-neutral-600 mb-1">Simular cliente (pedido fictício)</label>
        <select value={orderId} onChange={(e) => change(e.target.value)} className="w-full border rounded px-2 py-1.5">
          {orders.map((o) => (
            <option key={o.id} value={o.id}>{o.id} · {o.persona_name} · {o.restaurant}</option>
          ))}
        </select>
        {current && <p className="mt-1 text-xs text-neutral-500">Status do pedido: {current.status}</p>}
      </section>

      <section className="bg-white border rounded-lg p-3 flex-1 min-h-80 overflow-y-auto flex flex-col gap-2">
        {msgs.length === 0 && (
          <div className="text-sm text-neutral-500">
            <p className="mb-2">Escreva uma mensagem ou use um exemplo:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => send(e)} className="border rounded-full px-3 py-1 hover:bg-neutral-100 text-left">{e}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "customer" ? "self-end bg-red-600 text-white" : "self-start bg-neutral-100"}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="self-start text-sm text-neutral-400">Analisando…</div>}
        {escalated && (
          <div className="self-center text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-2 py-1">
            Caso encaminhado a um atendente humano com todo o contexto.
          </div>
        )}
        <div ref={bottom} />
      </section>

      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Digite sua mensagem…" className="flex-1 border rounded px-3 py-2 bg-white" />
        <button disabled={busy || !text.trim()} className="bg-red-600 text-white rounded px-4 disabled:opacity-50">Enviar</button>
      </form>
    </main>
  );
}
