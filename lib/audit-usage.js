import { kv } from '@vercel/kv';
import { jourEtCreneauMedecin } from './creneau';

// Parcourt tout le journal d'audit (persistant, ne suit pas la purge des
// dossiers patients) et regroupe les actions par jour/créneau médecin.
// Retourne :
//  - counts[jour][creneau][matricule] = nb d'actions
//  - usersMap[matricule] = {nom, role}
//  - activiteMedecin[jour][creneau] = true si au moins un compte "medecin"
//    a fait une action sur ce créneau
export async function scanActiviteAudit(depuisTs) {
  const userKeys = await kv.keys('user:*');
  const usersArr = await Promise.all(userKeys.map(k => kv.hgetall(k)));
  const usersMap = {};
  userKeys.forEach((k, i) => { usersMap[k.replace('user:', '')] = usersArr[i] || {}; });

  const auditKeys = await kv.keys('audit:patient:*');
  const counts = {};
  let entriesVues = 0;
  const BATCH = 30;
  for (let i = 0; i < auditKeys.length; i += BATCH) {
    const lot = auditKeys.slice(i, i + BATCH);
    const listes = await Promise.all(lot.map(k => kv.lrange(k, 0, -1).catch(() => [])));
    for (const liste of listes) {
      for (const raw of liste) {
        let e;
        try { e = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { continue; }
        if (!e || !e.ts || e.ts < depuisTs) continue;
        entriesVues++;
        const { jour, creneau } = jourEtCreneauMedecin(e.ts);
        const mat = e.matricule || 'inconnu';
        counts[jour] = counts[jour] || {};
        counts[jour][creneau] = counts[jour][creneau] || {};
        counts[jour][creneau][mat] = (counts[jour][creneau][mat] || 0) + 1;
      }
    }
  }

  const activiteMedecin = {};
  for (const jour in counts) {
    for (const creneau in counts[jour]) {
      const aUnMedecin = Object.keys(counts[jour][creneau]).some(mat => usersMap[mat]?.role === 'medecin');
      if (aUnMedecin) {
        activiteMedecin[jour] = activiteMedecin[jour] || {};
        activiteMedecin[jour][creneau] = true;
      }
    }
  }

  return { counts, usersMap, activiteMedecin, patientsAudites: auditKeys.length, entriesVues };
}
