import type { Intent, Priority } from "./types";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const HEALTH = [
  "alergi", "anafilax", "intoxica", "passei mal", "passando mal", "vomit", "hospital",
  "pronto socorro", "emergencia", "falta de ar", "inchou", "inchad", "celiac",
  "intolerancia", "envenen", "mal estar", "dor de barriga", "diarreia", "contaminad",
];
const LEGAL = ["procon", "processo", "advogado", "justica", "policia", "denunci", "boletim de ocorrencia"];
const INJECTION = [
  "ignore as instrucoes", "ignore previous", "ignore todas as", "desconsidere as regras",
  "system prompt", "voce agora e", "aja como", "modo desenvolvedor",
];

export type RuleHit = {
  intent: Intent;
  priority: Priority;
  reason: string;
};

/** Regras determinísticas: rodam antes de qualquer LLM e nunca são sobrescritas por ele. */
export function applyRules(message: string): RuleHit | null {
  const t = norm(message);
  if (HEALTH.some((k) => t.includes(k)))
    return { intent: "saude_alergia", priority: "critical", reason: "Termo de saúde/alergia detectado por regra." };
  if (LEGAL.some((k) => t.includes(k)))
    return { intent: "outro", priority: "high", reason: "Menção jurídica/ameaça detectada por regra." };
  if (INJECTION.some((k) => t.includes(k)))
    return { intent: "outro", priority: "medium", reason: "Possível tentativa de manipular instruções (prompt injection)." };
  return null;
}

export const SAFE_ESCALATION_REPLY =
  "Obrigado por avisar. Registramos o seu caso e um atendente humano vai analisá-lo com todo o contexto da conversa. Você não precisa repetir as informações.";

export const SAFE_HEALTH_REPLY =
  "Sentimos muito. Se você estiver com sintomas, procure atendimento médico imediatamente. Já encaminhamos o seu caso como prioridade para um atendente humano, que entrará em contato.";
