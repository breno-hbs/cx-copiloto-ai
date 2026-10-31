import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const token = () =>
  createHash("sha256").update(`cx-agent:${process.env.AGENT_PASSWORD ?? ""}`).digest("hex");

export const COOKIE = "cx_agent";

export function passwordOk(input: string) {
  const expected = process.env.AGENT_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(createHash("sha256").update(input).digest("hex"));
  const b = Buffer.from(createHash("sha256").update(expected).digest("hex"));
  return timingSafeEqual(a, b);
}

export const sessionToken = token;

export async function isAgent() {
  if (!process.env.AGENT_PASSWORD) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  return c === token();
}
