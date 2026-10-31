import type { Intent } from "./types";

export interface KbArticle {
  id: string;
  intent: Intent;
  title: string;
  body: string;
}

/** Base de conhecimento controlada (fictícia). A IA só pode responder com base nela. */
export const KB: KbArticle[] = [
  {
    id: "KB-ATRASO-1",
    intent: "atraso",
    title: "Pedido em andamento ou atrasado",
    body: "Informe o status atual e a previsão de entrega (eta) que constam no pedido. Se o horário previsto já passou e o pedido ainda não foi entregue, peça desculpas pela demora e informe que o pedido segue em rota. Não prometa novo horário, compensação nem cancelamento. Se o cliente pedir cancelamento ou compensação, encaminhe a um atendente.",
  },
  {
    id: "KB-REEMBOLSO-1",
    intent: "reembolso",
    title: "Acompanhamento de reembolso",
    body: "Informe apenas o estado atual do reembolso conforme o campo refund_status do pedido: none = nenhum pedido de reembolso registrado; requested = solicitado; in_review = em análise; approved = aprovado; paid = pago. Não informe prazos nem valores que não estejam no pedido. Não execute, prometa ou antecipe resultado de reembolso.",
  },
  {
    id: "KB-FALTANDO-1",
    intent: "item_faltando",
    title: "Item faltando no pedido",
    body: "Casos de item faltando exigem análise humana. Confirme ao cliente que o relato foi registrado e será analisado por um atendente. Não confirme nem negue a falta e não prometa reembolso.",
  },
  {
    id: "KB-COBRANCA-1",
    intent: "cobranca_duplicada",
    title: "Cobrança duplicada",
    body: "Casos de cobrança duplicada exigem análise humana. Confirme ao cliente que o relato foi registrado e será analisado por um atendente. Não prometa estorno.",
  },
  {
    id: "KB-SAUDE-1",
    intent: "saude_alergia",
    title: "Saúde ou alergia",
    body: "Situações de saúde ou alergia são prioridade crítica e sempre tratadas por humano. Oriente o cliente a procurar atendimento médico se sentir sintomas e informe que um atendente entrará em contato.",
  },
];

export const kbForIntent = (intent: Intent) => KB.filter((a) => a.intent === intent);
export const kbIds = new Set(KB.map((a) => a.id));
