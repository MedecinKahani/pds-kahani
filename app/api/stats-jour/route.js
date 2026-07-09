import { getSession } from '@/lib/auth-server';
import { getJourDetail } from '@/lib/stats-jour';

export async function GET(req) {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jour = searchParams.get('jour'); // YYYY-MM-DD
    if (!jour) return Response.json({ error: 'jour requis (YYYY-MM-DD)' }, { status: 400 });

    const result = await getJourDetail(jour);
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
