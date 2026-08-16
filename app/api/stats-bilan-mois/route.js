import { getSession } from '@/lib/auth-server';
import { getBilanPeriode } from '@/lib/stats-jour';

function fmtLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export async function GET(req) {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mois = searchParams.get('mois'); // format: YYYY-M (mois 0-indexé, aligné sur getMoisOptions côté front)
    if (!mois) return Response.json({ error: 'mois requis (YYYY-M)' }, { status: 400 });

    const [annee, moisIdx] = mois.split('-').map(Number);
    if (Number.isNaN(annee) || Number.isNaN(moisIdx)) {
      return Response.json({ error: 'format mois invalide' }, { status: 400 });
    }

    const debut = new Date(annee, moisIdx, 1);
    const fin = new Date(annee, moisIdx + 1, 0);
    const bilan = await getBilanPeriode(fmtLocalDate(debut), fmtLocalDate(fin));
    return Response.json({ bilan });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
