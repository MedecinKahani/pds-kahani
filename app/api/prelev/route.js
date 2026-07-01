import redis from '@/lib/kv';
const TTL = 7 * 24 * 3600; // 7 jours

export async function POST(req) {
  const data = await req.json();
  const key = `prelev:${data.id}:${data.ts}`;
  await redis.set(key, JSON.stringify(data), 'EX', TTL);
  return Response.json({ ok: true });
}

export async function GET() {
  const keys = await redis.keys('prelev:*');
  if (!keys.length) return Response.json({ preleves: [] });
  const vals = await Promise.all(keys.map(k => redis.get(k)));
  const preleves = vals
    .map(v => typeof v === 'string' ? JSON.parse(v) : v)
    .filter(Boolean)
    .sort((a, b) => b.ts - a.ts);
  return Response.json({ preleves });
}
