import { Redis } from '@upstash/redis';
import { getSession } from '@/lib/auth-server';
const redis = Redis.fromEnv();

const TTL = 7 * 24 * 3600; // 7 jours — le temps que l'IDE rattrape la saisie DxCare

export async function POST(req) {
  const session = getSession();
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();

  if (body.action === 'coder') {
    // L'IDE a saisi l'acte dans DxCare : on le raye du cahier (suppression).
    await redis.del(`acteide:${body.id}`);
    return Response.json({ ok: true });
  }

  // Note minimale pour retrouver le patient et l'acte à coter dans DxCare :
  // IPP + type de soin, rien de clinique (motif, diagnostic...).
  const data = {
    id: body.id,
    ts: body.ts || Date.now(),
    ipp: body.ipp || null,
    sexe: body.sexe || null,
    type: body.type || null,
    note: body.note || null,
    faitPar: body.faitPar || null,
  };

  const key = `acteide:${data.id}`;
  await redis.set(key, JSON.stringify(data), { ex: TTL });
  return Response.json({ ok: true });
}

export async function GET() {
  const session = getSession();
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const keys = await redis.keys('acteide:*');
  if (!keys.length) return Response.json({ actes: [] });
  const vals = await Promise.all(keys.map((k) => redis.get(k)));
  const actes = vals
    .map((v) => (typeof v === 'string' ? JSON.parse(v) : v))
    .filter(Boolean)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return Response.json({ actes });
}
