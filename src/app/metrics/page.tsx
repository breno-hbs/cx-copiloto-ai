"use client";

import { useEffect, useState } from "react";

type M = {
  total: number; aiResolved: number; escalated: number; aiRate: number; openTickets: number;
  avgMinToAssign: number | null; avgMinToClose: number | null; avgLlmLatencyMs: number | null;
  byIntent: Record<string, number>;
};

const Card = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-white border rounded-lg p-3">
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-xs text-neutral-500">{label}</div>
  </div>
);

export default function Metrics() {
  const [m, setM] = useState<M>();
  useEffect(() => {
    const load = () => fetch("/api/metrics").then((r) => r.json()).then(setM).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  if (!m) return <main className="p-6 text-sm">Carregando…</main>;
  const fmt = (v: number | null, s: string) => (v == null ? "—" : `${v}${s}`);
  const max = Math.max(1, ...Object.values(m.byIntent));
  return (
    <main className="max-w-4xl w-full mx-auto p-4 flex flex-col gap-4">
      <h1 className="font-semibold">Indicadores da demonstração</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Conversas" value={m.total} />
        <Card label="Resolvidas pela IA" value={`${m.aiRate}%`} />
        <Card label="Encaminhadas a humano" value={m.escalated} />
        <Card label="Chamados abertos" value={m.openTickets} />
        <Card label="Tempo médio até assumir" value={fmt(m.avgMinToAssign, " min")} />
        <Card label="Tempo médio até encerrar" value={fmt(m.avgMinToClose, " min")} />
        <Card label="Latência média do LLM" value={fmt(m.avgLlmLatencyMs, " ms")} />
      </div>
      <section className="bg-white border rounded-lg p-3">
        <h2 className="text-sm font-semibold mb-2">Contatos por intenção</h2>
        {Object.keys(m.byIntent).length === 0 && <p className="text-sm text-neutral-500">Sem dados ainda.</p>}
        {Object.entries(m.byIntent).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-sm mb-1">
            <span className="w-40">{k}</span>
            <div className="bg-red-500 h-3 rounded" style={{ width: `${(v / max) * 60}%` }} />
            <span>{v}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
