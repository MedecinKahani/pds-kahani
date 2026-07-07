import { kv } from '@vercel/kv';
import { getSession } from '@/lib/auth-server';

// Vue rétrospective de l'usage du site par créneau médecin (07-13 / 13-19 / 19-07)
// sur les 7 derniers jours, construite à partir du journal d'audit (lib/audit.js).
// Le journal d'audit est la seule source qui survit à la purge des dossiers patients
// (24h) — c'est donc la seule façon de reconstituer un historique de 7 jours.
//
// Fuseau : Mayotte = UTC+3 toute l'année (pas d'heure d'été).
const OFFSET_MS = 3 * 60 * 60 * 1000;
const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;

function jourEtCreneau(ts) {
  const local = new Date(ts + OFFSET_MS);
  const h = local.getUTCHours();
  let jour = local.toISOString().slice(0, 10);
  let creneau;
  if (h >= 7 && h < 13) creneau = '07-13';
  else if (h >= 13 && h < 19) creneau = '13-19';
  else {
    creneau = '19-07';
    if (h < 7) {
      const veille = new Date(local.getTime() - 24 * 60 * 60 * 1000);
      jour = veille.toISOString().slice(0, 10);
    }
  }
  return { jour, creneau };
}

export async function GET() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (!['medecin', 'secretaire'].includes(session.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Annuaire matricule -> {nom, role}
    const userKeys = await kv.keys('user:*');
    const usersArr = await Promise.all(userKeys.map(k => kv.hgetall(k)));
    const usersMap = {};
    userKeys.forEach((k, i) => { usersMap[k.replace('user:', '')] = usersArr[i] || {}; });

    const since = Date.now() - SEPT_JOURS_MS;
    const auditKeys = await kv.keys('audit:patient:*');

    // { jour: { creneau: { matricule: count } } }
    const counts = {};
    let entriesVues = 0;
    let cle_en_erreur = 0;
    const BATCH = 30;
    for (let i = 0; i < auditKeys.length; i += BATCH) {
      const lot = auditKeys.slice(i, i + BATCH);
      const listes = await Promise.all(lot.map(k => kv.lrange(k, 0, -1).catch(() => { cle_en_erreur++; return []; })));
      for (const liste of listes) {
        for (const raw of liste) {
          let e;
          try { e = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { continue; }
          if (!e || !e.ts || e.ts < since) continue;
          entriesVues++;
          const { jour, creneau } = jourEtCreneau(e.ts);
          const mat = e.matricule || 'inconnu';
          counts[jour] = counts[jour] || {};
          counts[jour][creneau] = counts[jour][creneau] || {};
          counts[jour][creneau][mat] = (counts[jour][creneau][mat] || 0) + 1;
        }
      }
    }

    // 7 derniers jours (aujourd'hui inclus), du plus ancien au plus récent
    const jours = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(Date.now() + OFFSET_MS - d * 24 * 60 * 60 * 1000);
      jours.push(dt.toISOString().slice(0, 10));
    }
    const CRENEAUX = ['07-13', '13-19', '19-07'];

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
      creneaux: CRENEAUX.map(creneau => {
        const parJC = (counts[jour] || {})[creneau] || {};
        const medecins = detail(parJC, 'medecin');
        const autres = detail(parJC, 'autre');
        return { creneau, medecins, autres, actifMedecin: medecins.length > 0 };
      }),
    }));

    return Response.json({ result, meta: { patientsAudites: auditKeys.length, entriesVues, cle_en_erreur } });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur', detail: String(e?.message || e) }, { status: 500 });
  }
}
