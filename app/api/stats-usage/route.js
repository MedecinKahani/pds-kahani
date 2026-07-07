import { getSession } from '@/lib/auth-server';
import { getUsageSemaine } from '@/lib/stats-jour';

// Vue rétrospective "usage médecin par créneau" sur 7 jours — page discrète,
// accès verrouillé sur un matricule précis, pas par rôle.
// Règle : un créneau est "utilisé" si ≥4 patients enregistrés dessus ont eu
// au moins une prescription demandée ET réalisée (cf. lib/stats-jour.js).
const MATRICULE_AUTORISE = '023799';

export async function GET() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (session.matricule !== MATRICULE_AUTORISE) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const jours = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(Date.now() + 3 * 60 * 60 * 1000 - d * 24 * 60 * 60 * 1000);
      jours.push(dt.toISOString().slice(0, 10));
    }

    const result = await getUsageSemaine(jours);
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
