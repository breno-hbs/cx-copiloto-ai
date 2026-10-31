import type { NextRequest } from "next/server";
import {
  addMessage, createTicket, getMessages, getOrCreateConversation, getOrder,
  llmCallsToday, markAiResolved, saveTrace,
} from "@/lib/db";
import { geminiLlm } from "@/lib/llm";
import { handleMessage } from "@/lib/orchestrator";
import { SAFE_ESCALATION_REPLY } from "@/lib/rules";
import { fireWebhook } from "@/lib/webhook";

const MAX_LEN = 500;
const hits = new Map<string, number[]>();

// Limite simples por IP (melhor esforço em serverless): 15 mensagens / 10 min.
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 15;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("conversationId");
  if (!id) return Response.json({ messages: [] });
  try {
    return Response.json({ messages: await getMessages(id) });
  } catch {
    return Response.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return Response.json({ error: "Muitas mensagens. Aguarde alguns minutos." }, { status: 429 });

  let body: { orderId?: string; conversationId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!body.orderId || !message) return Response.json({ error: "Informe pedido e mensagem" }, { status: 400 });
  if (message.length > MAX_LEN) return Response.json({ error: `Máximo de ${MAX_LEN} caracteres` }, { status: 400 });

  try {
    const order = await getOrder(body.orderId);
    if (!order) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });

    const conversationId = await getOrCreateConversation(order.id, body.conversationId);
    const history = (await getMessages(conversationId)).map(({ role, content }) => ({ role, content }));
    const messageId = await addMessage(conversationId, "customer", message);

    // Teto diário de chamadas ao LLM: acima dele, tudo vai para humano sem usar a IA.
    const limit = Number(process.env.DAILY_LLM_LIMIT ?? 300);
    const overBudget = (await llmCallsToday()) >= limit;
    const llm = overBudget
      ? { triage: async () => { throw new Error("teto diário de IA atingido"); }, reply: async () => { throw new Error("teto diário de IA atingido"); } }
      : geminiLlm;

    const outcome = await handleMessage(llm, { message, order, history });
    await saveTrace(conversationId, messageId, outcome.trace);
    await addMessage(conversationId, "ai", outcome.reply);

    if (outcome.kind === "escalate") {
      const t = await createTicket(conversationId, order, outcome, [...history, { role: "customer", content: message }]);
      if (t.created)
        await fireWebhook("ticket.created", {
          ticketId: t.id, orderId: order.id, priority: outcome.priority, intent: outcome.intent, reason: outcome.reason,
        });
    } else {
      await markAiResolved(conversationId);
    }

    return Response.json({
      conversationId,
      reply: outcome.reply,
      escalated: outcome.kind === "escalate",
      intent: outcome.intent,
    });
  } catch (e) {
    console.error("chat error", e);
    return Response.json({ reply: SAFE_ESCALATION_REPLY, error: "Falha interna" }, { status: 500 });
  }
}
