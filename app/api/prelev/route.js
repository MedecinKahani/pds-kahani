import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const TTL = 7 * 24 * 3600; // 7 jours — durée totale de conservation avant suppression complète
const DELAI_MINIMISATION = 24 * 3600; // 24h — au-delà, on ne garde que le strict nécessaire pour recontacter le patient

// Champs conservés après minimisation (les seuls utiles pour rappeler le patient).
// Tout le reste (nom, prénom, motif, diagnostic, anamnèse, notes...) est détruit.
function minimiser(data) {
  return {
    id: data.id,
    ts: data.ts,
    tel: data.tel || null,
    ville: data.ville || null,
    minimise: true,
  };
}

export async function POST(req) {
  const data = await req.json();
  const key = `prelev:${data.id}:${data.ts}`;
  await redis.set(key, JSON.stringify(data), { ex: TTL });
  return Response.json({ ok: true });
}

export async function GET() {
  const keys = await redis.keys('prelev:*');
  if (!keys.length) return Response.json({ preleves: [] });

  const vals = await Promise.all(keys.map((k) => redis.get(k)));
  const maintenant = Date.now();
  const preleves = [];

  for (let i = 0; i < keys.length; i++) {
    const raw = vals[i];
    if (!raw) continue;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data) continue;

    const age = maintenant - (data.ts || 0);

    if (age >= DELAI_MINIMISATION && !data.minimise) {
      // Minimisation physique : on réécrit l'entrée en Redis avec uniquement
      // tel/ville, en conservant le TTL restant (pas de reset à 7 jours).
      const allege = minimiser(data);
      try {
        const ttlRestant = await redis.ttl(keys[i]);
        await redis.set(keys[i], JSON.stringify(allege), { ex: ttlRestant > 0 ? ttlRestant : 1 });
      } catch (e) {
        console.error('minimisation prelev error', e);
      }
      preleves.push(allege);
    } else {
      preleves.push(data);
    }
  }

  preleves.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return Response.json({ preleves });
}
