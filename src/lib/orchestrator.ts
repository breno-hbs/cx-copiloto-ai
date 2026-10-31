import { kbForIntent } from "./kb";
import { applyRules, SAFE_ESCALATION_REPLY, SAFE_HEALTH_REPLY } from "./rules";
import type { ChatTurn, DecisionTrace, Intent, Llm, Order, Outcome, Priority } from "./types";
import { validateReply } from "./validator";

const MIN_CONFIDENCE = 0.7;
/** Intenções que a IA pode responder sozinha (somente informação verificada). */
const AUTO_INTENTS: Intent[] = ["atraso", "reembolso"];

const intentPriority = (intent: Intent, urgency: string): Priority => {
  if (intent === "saude_alergia") return "critical";
  if (intent === "cobranca_duplicada") return "high";
  return urgency === "high" ? "high" : urgency === "low" ? "low" : "medium";
};

const safeReply = (intent: Intent) => (intent === "saude_alergia" ? SAFE_HEALTH_REPLY : SAFE_ESCALATION_REPLY);

const timed = async <T>(fn: () => Promise<T>) => {
  const t0 = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t0 };
};

/**
 * Fluxo: regras (0 chamadas) -> triagem (1 chamada) -> atendimento (2ª chamada, só se elegível)
 * -> validador. Qualquer falha, dúvida ou política resulta em escalonamento humano.
 */
export async function handleMessage(
  llm: Llm,
  input: { message: string; order: Order; history: ChatTurn[] },
): Promise<Outcome> {
  const trace: DecisionTrace[] = [];

  const rule = applyRules(input.message);
  if (rule) {
    trace.push({ stage: "rule", intent: rule.intent, needs_human: true, reason: rule.reason });
    return { kind: "escalate", reply: safeReply(rule.intent), intent: rule.intent, priority: rule.priority, reason: rule.reason, trace };
  }

  let triage;
  try {
    const r = await timed(() => llm.triage(input));
    triage = r.value;
    trace.push({ stage: "triage", ...triage, latency_ms: r.ms });
  } catch (e) {
    const reason = `Falha na triagem (${e instanceof Error ? e.message : "erro"}); encaminhado por segurança.`;
    trace.push({ stage: "triage", needs_human: true, reason });
    return { kind: "escalate", reply: SAFE_ESCALATION_REPLY, intent: "outro", priority: "medium", reason, trace };
  }

  const escalate = (reason: string): Outcome => ({
    kind: "escalate",
    reply: safeReply(triage.intent),
    intent: triage.intent,
    priority: intentPriority(triage.intent, triage.urgency),
    reason,
    trace,
  });

  if (!AUTO_INTENTS.includes(triage.intent)) return escalate(`Intenção "${triage.intent}" exige atendimento humano. ${triage.reason}`);
  if (triage.needs_human) return escalate(`Triagem pediu humano: ${triage.reason}`);
  if (triage.confidence < MIN_CONFIDENCE) return escalate(`Baixa confiança (${triage.confidence}).`);

  try {
    const r = await timed(() => llm.reply({ ...input, intent: triage.intent, kb: kbForIntent(triage.intent) }));
    trace.push({ stage: "reply", kb_ids: r.value.kb_ids, latency_ms: r.ms, needs_human: r.value.escalate });
    const v = validateReply(r.value, input.order, triage.intent);
    if (!v.ok) {
      trace.push({ stage: "validator", needs_human: true, reason: v.why });
      return escalate(`Validador bloqueou a resposta: ${v.why}`);
    }
    trace.push({ stage: "validator", needs_human: false, reason: "ok" });
    return { kind: "auto", reply: r.value.reply, intent: triage.intent, trace };
  } catch (e) {
    return escalate(`Falha no atendimento (${e instanceof Error ? e.message : "erro"}).`);
  }
}
