import type { NextRequest } from "next/server";
import { COOKIE, passwordOk, sessionToken } from "@/lib/auth";

let fails = 0;
let windowStart = Date.now();

export async function POST(req: NextRequest) {
  if (Date.now() - windowStart > 10 * 60_000) { fails = 0; windowStart = Date.now(); }
  if (fails >= 10) return Response.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !passwordOk(password)) {
    fails++;
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.append(
    "set-cookie",
    `${COOKIE}=${sessionToken()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return res;
}
