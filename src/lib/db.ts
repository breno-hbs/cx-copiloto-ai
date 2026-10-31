import { createClient } from "@supabase/supabase-js";
import type { ChatTurn, DecisionTrace, Order, Outcome } from "./types";

// Sem tipos gerados do schema: o cliente é deliberadamente não tipado por tabela.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = ReturnType<typeof createClient<any>>;
let _db: Db | null = null;
export function db() {
  if (!_db) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase não configurado");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _db = createClient<any>(url, key, { auth: { persistSession: false } });
  }
  return _db;
}

const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export async function listOrders() {
  return must(await db().from("orders").select("id,persona_name,restaurant,status").order("id")) as Pick<
    Order,
    "id" | "persona_name" | "restaurant" | "status"
  >[];
}

export async function getOrder(id: string) {
  const { data } = await db().from("orders").select("*").eq("id", id).maybeSingle();
  return data as Order | null;
}

export async function getOrCreateConversation(orderId: string, conversationId?: string) {
  if (conversationId) {
    const { data } = await db().from("conversations").select("id,order_id").eq("id", conversationId).maybeSingle();
    if (data && (data as { order_id: string }).order_id === orderId) return conversationId;
  }
  const row = must(await db().from("conversations").insert({ order_id: orderId }).select("id").single()) as { id: string };
  return row.id;
}

export async function addMessage(conversationId: string, role: ChatTurn["role"], content: string) {
  const row = must(
    await db().from("messages").insert({ conversation_id: conversationId, role, content }).select("id").single(),
  ) as { id: string };
  return row.id;
}

export async function getMessages(conversationId: string) {
  return must(
    await db().from("messages").select("id,role,content,created_at").eq("conversation_id", conversationId).order("created_at"),
  ) as (ChatTurn & { id: string; created_at: string })[];
}

export async function saveTrace(conversationId: string, messageId: string, trace: DecisionTrace[]) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!trace.length) return;
  must(
    await db().from("agent_decisions").insert(
      trace.map((t) => ({
        conversation_id: conversationId,
        message_id: messageId,
        stage: t.stage,
        intent: t.intent ?? null,
        urgency: t.urgency ?? null,
        needs_human: t.needs_human ?? null,
        confidence: t.confidence ?? null,
        reason: t.reason ?? null,
        kb_ids: t.kb_ids ?? null,
        model: t.stage === "triage" || t.stage === "reply" ? model : null,
        latency_ms: t.latency_ms ?? null,
      })),
    ),
  );
}

export async function createTicket(
  conversationId: string,
  order: Order,
  o: Extract<Outcome, { kind: "escalate" }>,
  history: ChatTurn[],
) {
  // Um ticket aberto por conversa: mensagens seguintes só atualizam o motivo.
  const { data: existing } = await db()
    .from("tickets")
    .select("id")
    .eq("conversation_id", conversationId)
    .neq("status", "closed")
    .maybeSingle();
  if (existing) {
    const id = (existing as { id: string }).id;
    await db().from("ticket_events").insert({ ticket_id: id, type: "note", payload: { reason: o.reason } });
    return { id, created: false };
  }
  const summary = history
    .filter((t) => t.role === "customer")
    .slice(-3)
    .map((t) => t.content)
    .join(" | ")
    .slice(0, 400);
  const row = must(
    await db()
      .from("tickets")
      .insert({
        conversation_id: conversationId,
        order_id: order.id,
        priority: o.priority,
        intent: o.intent,
        reason: o.reason,
        summary,
      })
      .select("id")
      .single(),
  ) as { id: string };
  await db().from("ticket_events").insert({ ticket_id: row.id, type: "created", payload: { priority: o.priority, intent: o.intent } });
  await db().from("conversations").update({ status: "escalated" }).eq("id", conversationId);
  return { id: row.id, created: true };
}

export async function markAiResolved(conversationId: string) {
  await db().from("conversations").update({ status: "ai_resolved" }).eq("id", conversationId).eq("status", "open");
}

export async function llmCallsToday() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await db()
    .from("agent_decisions")
    .select("id", { count: "exact", head: true })
    .eq("stage", "triage")
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export async function listTickets() {
  const rows = must(
    await db().from("tickets").select("*, orders(persona_name, restaurant)").neq("status", "closed").order("created_at"),
  ) as (Record<string, unknown> & { priority: keyof typeof PRIORITY_ORDER })[];
  return rows.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export async function listClosedTickets(limit = 10) {
  return must(
    await db().from("tickets").select("*, orders(persona_name, restaurant)").eq("status", "closed").order("closed_at", { ascending: false }).limit(limit),
  ) as Record<string, unknown>[];
}

export async function getTicketDetail(id: string) {
  const ticket = must(await db().from("tickets").select("*").eq("id", id).single()) as {
    conversation_id: string;
    order_id: string;
  } & Record<string, unknown>;
  const [order, messages, decisions, events] = await Promise.all([
    getOrder(ticket.order_id),
    getMessages(ticket.conversation_id),
    db().from("agent_decisions").select("*").eq("conversation_id", ticket.conversation_id).order("created_at"),
    db().from("ticket_events").select("*").eq("ticket_id", id).order("created_at"),
  ]);
  return { ticket, order, messages, decisions: decisions.data ?? [], events: events.data ?? [] };
}

export async function assignTicket(id: string, assignee: string) {
  const { data } = await db()
    .from("tickets")
    .update({ status: "assigned", assignee, assigned_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open")
    .select("id");
  if (!data || data.length === 0) return false;
  await db().from("ticket_events").insert({ ticket_id: id, type: "assigned", payload: { assignee } });
  return true;
}

export async function closeTicket(id: string, note: string, assignee: string) {
  const { data } = await db()
    .from("tickets")
    .update({ status: "closed", resolution_note: note, closed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["open", "assigned"])
    .select("id,conversation_id");
  if (!data || data.length === 0) return false;
  const t = data[0] as { id: string; conversation_id: string };
  await db().from("conversations").update({ status: "closed" }).eq("id", t.conversation_id);
  await db().from("ticket_events").insert({ ticket_id: id, type: "closed", payload: { assignee, note } });
  return true;
}

export async function metrics() {
  const [convs, tickets, decisions] = await Promise.all([
    db().from("conversations").select("status"),
    db().from("tickets").select("status,priority,intent,created_at,assigned_at,closed_at"),
    db().from("agent_decisions").select("stage,intent,latency_ms"),
  ]);
  return {
    conversations: (convs.data ?? []) as { status: string }[],
    tickets: (tickets.data ?? []) as {
      status: string; priority: string; intent: string | null;
      created_at: string; assigned_at: string | null; closed_at: string | null;
    }[],
    decisions: (decisions.data ?? []) as { stage: string; intent: string | null; latency_ms: number | null }[],
  };
}
