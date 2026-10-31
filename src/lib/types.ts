import { z } from "zod";

export const INTENTS = [
  "atraso",
  "reembolso",
  "item_faltando",
  "cobranca_duplicada",
  "saude_alergia",
  "outro",
] as const;
export type Intent = (typeof INTENTS)[number];

export const TriageSchema = z.object({
  intent: z.enum(INTENTS),
  urgency: z.enum(["low", "medium", "high"]),
  needs_human: z.boolean(),
  reason: z.string().max(300),
  confidence: z.number().min(0).max(1),
});
export type Triage = z.infer<typeof TriageSchema>;

export const ReplySchema = z.object({
  reply: z.string().max(900),
  kb_ids: z.array(z.string()),
  escalate: z.boolean(),
});
export type Reply = z.infer<typeof ReplySchema>;

export interface Order {
  id: string;
  persona_name: string;
  status: "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  restaurant: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  placed_at: string;
  eta: string | null;
  delivered_at: string | null;
  payment_charges: { amount: number; at: string }[];
  refund_status: "none" | "requested" | "in_review" | "approved" | "paid";
}

export interface ChatTurn {
  role: "customer" | "ai" | "agent";
  content: string;
}

export type Priority = "critical" | "high" | "medium" | "low";

export interface DecisionTrace {
  stage: "rule" | "triage" | "reply" | "validator";
  intent?: Intent;
  urgency?: string;
  needs_human?: boolean;
  confidence?: number;
  reason?: string;
  kb_ids?: string[];
  latency_ms?: number;
}

export type Outcome =
  | { kind: "auto"; reply: string; intent: Intent; trace: DecisionTrace[] }
  | {
      kind: "escalate";
      reply: string; // mensagem segura enviada ao cliente
      intent: Intent;
      priority: Priority;
      reason: string;
      trace: DecisionTrace[];
    };

/** Interface do LLM, injetável para testes sem chamar a API. */
export interface Llm {
  triage(input: { message: string; order: Order; history: ChatTurn[] }): Promise<Triage>;
  reply(input: {
    message: string;
    order: Order;
    history: ChatTurn[];
    intent: Intent;
    kb: { id: string; title: string; body: string }[];
  }): Promise<Reply>;
}
