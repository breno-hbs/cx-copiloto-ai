import { db } from "./db";

/** Dispara o webhook (Make/n8n) e registra o resultado. Nunca derruba o fluxo principal. */
export async function fireWebhook(event: string, payload: Record<string, unknown>) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  let status: number | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, at: new Date().toISOString(), source: "cx-copiloto-ai", ...payload }),
      signal: AbortSignal.timeout(5000),
    });
    status = res.status;
  } catch (e) {
    error = e instanceof Error ? e.message : "erro";
  }
  await db().from("webhook_log").insert({ event, status_code: status, error });
}
