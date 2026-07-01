import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const TTL = 7 * 24 * 3600; // 7 jours — durée de conservation de la note (identité + coordonnées, rien d'autre)

export async function POST(req) {
  const body = await req.json();

  // La note ne contient QUE l'identité et les coordonnées pour rappeler le
  // patient si le labo appelle. Aucune info clinique n'est jamais stockée
  // ici, même si le formulaire d'origine en envoie (on filtre côté serveur).
  const data = {
    id: body.id,
    ts: body.ts || Date.now(),
    nom: body.nom || null,
    prenom: body.prenom || null,
    tel: body.tel || null,
    ville: body.ville || null,
    manuel: body.manuel || false, // indicateur d'origine (panne), pas une donnée clinique
    faitPar: body.faitPar || null, // identité du soignant qui a enregistré, pas du patient
  };

  const key = `prelev:${data.id}:${data.ts}`;
  await redis.set(key, JSON.stringify(data), { ex: TTL });
  return Response.json({ ok: true });
}

export async function GET() {
  const keys = await redis.keys('prelev:*');
  if (!keys.length) return Response.json({ preleves: [] });
  const vals = await Promise.all(keys.map((k) => redis.get(k)));
  const preleves = vals
    .map((v) => (typeof v === 'string' ? JSON.parse(v) : v))
    .filter(Boolean)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return Response.json({ preleves });
}
