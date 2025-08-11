export const runtime = "edge";
import { redis } from "../_client";

const LOGO_KEY = "media:logo";
const BG_KEY = "media:bg";

export async function GET() {
  const [logo, bg] = await Promise.all([
    redis.get<string>(LOGO_KEY),
    redis.get<string>(BG_KEY),
  ]);
  return new Response(JSON.stringify({ logo, bg }), { headers: { "content-type": "application/json" } });
}
