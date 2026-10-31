import { kbForIntent } from "./kb";
import type { Intent, Order, Reply } from "./types";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Promessas/ações que a IA não pode assumir.
const PROMISES = [
  /\b(vou|vamos|iremos|irei|faremos|farei)\s+(reembols|estorn|cancel|compens|creditar|enviar outro|reenviar)/,
  /\b(sera|serao)\s+(reembols|estorn|cancel|compens|credit)/,
  /\bja\s+(reembolsei|estornei|cancelei|reembolsamos|estornamos|cancelamos)/,
  /\b(garanto|garantimos|garantia de)\b/,
  /\bcom certeza\b/,
  /\bcupom\b/,
];

export type Validation = { ok: true } | { ok: false; why: string };

export function validateReply(r: Reply, order: Order, intent: Intent): Validation {
  if (r.escalate) return { ok: false, why: "O agente de atendimento pediu escalonamento." };
  if (!r.reply.trim()) return { ok: false, why: "Resposta vazia." };

  const allowed = new Set(kbForIntent(intent).map((a) => a.id));
  if (r.kb_ids.length === 0) return { ok: false, why: "Resposta sem citação da base de conhecimento." };
  if (r.kb_ids.some((id) => !allowed.has(id)))
    return { ok: false, why: "Citou artigo inexistente ou de outra intenção." };

  const t = norm(r.reply);
  if (PROMISES.some((p) => p.test(t))) return { ok: false, why: "Resposta contém promessa/ação não permitida." };

  // Todo valor em R$ citado precisa existir no pedido.
  const known = new Set<number>([
    order.total,
    ...order.items.flatMap((i) => [i.price, i.price * i.qty]),
    ...order.payment_charges.map((c) => c.amount),
  ].map((n) => Math.round(n * 100)));
  for (const m of r.reply.matchAll(/R\$\s*([\d.]+,\d{2}|\d+(?:\.\d{2})?)/g)) {
    const raw = m[1].includes(",") ? m[1].replace(/\./g, "").replace(",", ".") : m[1];
    if (!known.has(Math.round(parseFloat(raw) * 100)))
      return { ok: false, why: `Valor R$ ${m[1]} não consta no pedido.` };
  }

  // Estado de reembolso não pode ser contradito.
  if (intent === "reembolso") {
    const says = (re: RegExp) => re.test(t);
    if (order.refund_status === "none" && says(/\b(em analise|aprovad\w*|pago|paga)\b/))
      return { ok: false, why: "Resposta contradiz refund_status." };
    if (order.refund_status === "in_review" && says(/\b(aprovad\w*|foi pago|ja foi paga)\b/))
      return { ok: false, why: "Resposta contradiz refund_status." };
  }
  return { ok: true };
}
