import { listOrders } from "@/lib/db";

export async function GET() {
  try {
    return Response.json(await listOrders());
  } catch {
    return Response.json({ error: "Falha ao listar pedidos" }, { status: 500 });
  }
}
