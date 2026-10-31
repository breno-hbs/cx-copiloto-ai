"use client";

import { useEffect, useState } from "react";

type M = {
  total: number; aiResolved: number; escalated: number; aiRate: number; openTickets: number;
  avgMinToAssign: number | null; avgMinToClose: number | null; avgLlmLatencyMs: number | null;
  byIntent: Record<string, number>;
};

const LABEL = "font-mono text-xs uppercase tracking-widest text-[#6B6B6B]";

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col gap-1 py-5 border-b border-[#E6E6E6]">
    <div className="text-4xl font-extrabold tracking-tight">{value}</div>
    <div className={LABEL}>{label}</div>
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
  if (!m) return <main className="p-8 text-sm text-[#6B6B6B]">Carregando…</main>;
  const fmt = (v: number | null, s: string) => (v == null ? "—" : `${v}${s}`);
  const max = Math.max(1, ...Object.values(m.byIntent));
  return (
    <main className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-10 flex-1">
      <div className="flex flex-col gap-2">
        <span className={LABEL}>Demonstração · dados fictícios</span>
        <h1 className="text-[32px] leading-9 font-extrabold tracking-tight">Indicadores</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 border-t border-[#E6E6E6]">
        <Stat label="Conversas" value={m.total} />
        <Stat label="Resolvidas pela IA" value={`${m.aiRate}%`} />
        <Stat label="Encaminhadas a humano" value={m.escalated} />
        <Stat label="Chamados abertos" value={m.openTickets} />
        <Stat label="Tempo até assumir" value={fmt(m.avgMinToAssign, " min")} />
        <Stat label="Tempo até encerrar" value={fmt(m.avgMinToClose, " min")} />
        <Stat label="Latência média do LLM" value={fmt(m.avgLlmLatencyMs, " ms")} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className={LABEL}>Contatos por intenção</h2>
        {Object.keys(m.byIntent).length === 0 && <p className="text-sm text-[#6B6B6B]">Sem dados ainda.</p>}
        {Object.entries(m.byIntent).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0 font-mono">{k}</span>
            <div className="bg-[#1F4FD8] h-3 rounded-sm" style={{ width: `${(v / max) * 60}%` }} />
            <span className="font-mono text-[#6B6B6B]">{v}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
