import { getSession } from '@/lib/auth-server';
import { scanActiviteAudit } from '@/lib/audit-usage';
import { CRENEAUX_MEDECIN } from '@/lib/creneau';

// Vue rétrospective de l'usage du site par créneau médecin (07-13 / 13-19 / 19-07)
// sur les 7 derniers jours, construite à partir du journal d'audit.
// Accès restreint à un matricule précis (page discrète), pas par rôle.
const MATRICULE_AUTORISE = '023799';
const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (session.matricule !== MATRICULE_AUTORISE) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const since = Date.now() - SEPT_JOURS_MS;
    const { counts, usersMap, patientsAudites, entriesVues } = await scanActiviteAudit(since);

    const jours = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(Date.now() + 3 * 60 * 60 * 1000 - d * 24 * 60 * 60 * 1000);
      jours.push(dt.toISOString().slice(0, 10));
    }

    const detail = (parJourCreneau, role) =>
      Object.entries(parJourCreneau || {})
        .map(([matricule, n]) => ({
          matricule, n,
          nom: usersMap[matricule]?.nom || matricule,
          role: usersMap[matricule]?.role || '?',
        }))
        .filter(x => (role === 'medecin' ? x.role === 'medecin' : x.role !== 'medecin'))
        .sort((a, b) => b.n - a.n);

    const result = jours.map(jour => ({
      jour,
      creneaux: CRENEAUX_MEDECIN.map(creneau => {
        const parJC = (counts[jour] || {})[creneau] || {};
        const medecins = detail(parJC, 'medecin');
        const autres = detail(parJC, 'autre');
        return { creneau, medecins, autres, actifMedecin: medecins.length > 0 };
      }),
    }));

    return Response.json({ result, meta: { patientsAudites, entriesVues } });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
