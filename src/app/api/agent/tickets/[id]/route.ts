import type { NextRequest } from "next/server";
import { isAgent } from "@/lib/auth";
import { assignTicket, closeTicket, getTicketDetail } from "@/lib/db";
import { fireWebhook } from "@/lib/webhook";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/agent/tickets/[id]">) {
  if (!(await isAgent())) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    return Response.json(await getTicketDetail(id));
  } catch {
    return Response.json({ error: "Chamado não encontrado" }, { status: 404 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/agent/tickets/[id]">) {
  if (!(await isAgent())) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; assignee?: string; note?: string };
  const assignee = (body.assignee ?? "Atendente Demo").slice(0, 60);

  if (body.action === "assign") {
    if (!(await assignTicket(id, assignee)))
      return Response.json({ error: "Chamado já assumido ou encerrado" }, { status: 409 });
    await fireWebhook("ticket.assigned", { ticketId: id, assignee });
    return Response.json({ ok: true });
  }
  if (body.action === "close") {
    const note = (body.note ?? "").trim().slice(0, 500);
    if (!note) return Response.json({ error: "Informe a nota de resolução" }, { status: 400 });
    if (!(await closeTicket(id, note, assignee)))
      return Response.json({ error: "Chamado já encerrado" }, { status: 409 });
    await fireWebhook("ticket.closed", { ticketId: id, assignee });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Ação inválida" }, { status: 400 });
}
