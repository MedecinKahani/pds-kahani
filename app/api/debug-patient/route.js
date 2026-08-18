export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kv } from '@vercel/kv';

// Endpoint de diagnostic TEMPORAIRE — à supprimer une fois le bug résolu.
// Vérifie si hgetall renvoie prescriptions/sutures déjà déserialisés (objet/array)
// ou en string JSON brute, sur des dossiers qui ont réellement des prescriptions/sutures.
export async function GET() {
  try {
    const activeKeys = await kv.keys('patient:*');
    const archiveKeys = await kv.keys('archive:*');
    const allKeys = [...archiveKeys, ...activeKeys]; // archives d'abord: plus susceptibles d'avoir des prescriptions
    const samples = [];
    for (const k of allKeys) {
      const p = await kv.hgetall(k);
      if (p.prescriptions || p.sutures) {
        samples.push({
          key: k,
          prescriptions_type: typeof p.prescriptions,
          prescriptions_isArray: Array.isArray(p.prescriptions),
          prescriptions_raw_preview: JSON.stringify(p.prescriptions)?.slice(0, 300),
          sutures_type: typeof p.sutures,
          sutures_isArray: Array.isArray(p.sutures),
          sutures_raw_preview: JSON.stringify(p.sutures)?.slice(0, 200),
        });
      }
      if (samples.length >= 5) break;
    }
    return Response.json(
      { nbActive: activeKeys.length, nbArchive: archiveKeys.length, nbAvecDonnees: samples.length, samples },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    return Response.json({ error: String(e?.message || e), stack: e?.stack }, { status: 500 });
  }
}
