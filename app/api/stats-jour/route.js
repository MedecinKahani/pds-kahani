import { getSession } from '@/lib/auth-server';
import { getStatsJour } from '@/lib/stats-jour';
import { jourMoinsNJours } from '@/lib/creneau';

export async function GET(req) {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const debut = searchParams.get('debut'); // YYYY-MM-DD
    const fin = searchParams.get('fin'); // YYYY-MM-DD
    if (!debut || !fin) return Response.json({ error: 'debut et fin requis (YYYY-MM-DD)' }, { status: 400 });

    const joursDemandes = [];
    let cur = debut;
    let garde = 0;
    while (cur <= fin && garde < 400) {
      joursDemandes.push(cur);
      cur = jourMoinsNJours(cur, -1);
      garde++;
    }

    const result = await getStatsJour(joursDemandes);
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
