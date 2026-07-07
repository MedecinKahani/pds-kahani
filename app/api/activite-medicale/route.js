import { getSession } from '@/lib/auth-server';
import { getActiviteMedicaleSemaine } from '@/lib/stats-jour';
import { jourLocal, jourMoinsNJours } from '@/lib/creneau';

// Vue réservée au matricule 023799 : nombre de patients ayant eu au moins
// une prescription réalisée par créneau médecin (07-13/13-19/19-07), sur les
// 7 derniers jours. Sert uniquement à repérer si un médecin n'a pas du tout
// utilisé le site sur son créneau — pas de seuil, pas de lissage, juste le
// chiffre brut.
const MATRICULE_AUTORISE = '023799';

export async function GET() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (session.matricule !== MATRICULE_AUTORISE) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const aujourdhui = jourLocal(Date.now());
    const jours = [];
    for (let d = 6; d >= 0; d--) {
      jours.push(jourMoinsNJours(aujourdhui, d));
    }

    const result = await getActiviteMedicaleSemaine(jours);
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
