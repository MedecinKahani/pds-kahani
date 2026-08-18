import { kv } from '@vercel/kv';

// Endpoint de diagnostic TEMPORAIRE — à supprimer une fois le bug résolu.
// Vérifie si hgetall renvoie prescriptions/sutures déjà déserialisés (objet/array)
// ou en string JSON brute, sur un vrai dossier existant (actif ou archivé).
export async function GET() {
  try {
    const activeKeys = await kv.keys('patient:*');
    const archiveKeys = await kv.keys('archive:*');
    const keys = [...activeKeys, ...archiveKeys].slice(0, 3);
    const samples = [];
    for (const k of keys) {
      const p = await kv.hgetall(k);
      samples.push({
        key: k,
        prescriptions_type: typeof p.prescriptions,
        prescriptions_isArray: Array.isArray(p.prescriptions),
        prescriptions_raw_preview: JSON.stringify(p.prescriptions)?.slice(0, 200),
        sutures_type: typeof p.sutures,
        sutures_isArray: Array.isArray(p.sutures),
        sutures_raw_preview: JSON.stringify(p.sutures)?.slice(0, 200),
      });
    }
    return Response.json({ nbActive: activeKeys.length, nbArchive: archiveKeys.length, samples });
  } catch (e) {
    return Response.json({ error: String(e?.message || e), stack: e?.stack }, { status: 500 });
  }
}
