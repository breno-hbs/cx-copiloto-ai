import { isAgent } from "@/lib/auth";
import { listClosedTickets, listTickets } from "@/lib/db";

export async function GET() {
  if (!(await isAgent())) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const [open, closed] = await Promise.all([listTickets(), listClosedTickets()]);
  return Response.json({ open, closed });
}
