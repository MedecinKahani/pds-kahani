import { kv } from '@vercel/kv';
import { heureLocale, jourLocal, jourMoinsNJours, jourEtCreneauMedecin, CRENEAUX_MEDECIN, BORNES_CRENEAU_MEDECIN } from './creneau';

// Compteurs journaliers "passages" et "transferts" — conservés 1 mois
// (comme le cahier Actes IDE), indépendamment de la purge des dossiers
// patients complets (24h). Ne stocke que des compteurs agrégés, jamais de
// données patient identifiantes : cohérent avec la politique de minimisation
// des données déjà en place.
//
// Règle d'usage médecin (remplace la détection par journal d'audit) : un
// créneau est considéré "utilisé" si au moins 4 patients enregistrés sur ce
// créneau ont eu au moins une prescription à la fois demandée ET réalisée
// (marquée faite). En dessous de 5, on considère que le médecin s'est
// connecté sans réellement utiliser le site, et les stats de passages /
// transferts de ce créneau sont silencieusement remplacées par celles du
// même créneau la semaine précédente (si exploitables).
const TTL_UN_MOIS = 32 * 24 * 60 * 60; // secondes, avec marge
const SEUIL_USAGE = 4;

function cleJour(jour) { return `statsjour:${jour}`; }

export async function incrementerPassageJour(patient) {
  try {
    const ts = parseInt(patient.arrivee);
    if (!ts) return;
    const jour = jourLocal(ts);
    const h = heureLocale(ts);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    existing.heures = existing.heures || new Array(24).fill(0);
    existing.heures[h] = (existing.heures[h] || 0) + 1;
    existing.parMotif = existing.parMotif || {};
    const motif = patient.symptome || 'autre';
    existing.parMotif[motif] = (existing.parMotif[motif] || 0) + 1;
    await kv.set(key, existing, { ex: TTL_UN_MOIS });
  } catch (e) { console.error('incrementerPassageJour error', e); }
}

export async function incrementerTransfertJour(patient) {
  try {
    if (patient.modalite_sortie !== 'transfert') return;
    const tsSortie = parseInt(patient.sortie) || Date.now();
    const { jour, creneau } = jourEtCreneauMedecin(tsSortie);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    const moyen = patient.moyen_sortie || 'non précisé';
    existing.transferts = existing.transferts || {};
    existing.transferts[moyen] = (existing.transferts[moyen] || 0) + 1;
    existing.transfertsTotal = (existing.transfertsTotal || 0) + 1;
    existing.transfertsParCreneau = existing.transfertsParCreneau || {};
    existing.transfertsParCreneau[creneau] = existing.transfertsParCreneau[creneau] || { total: 0, moyens: {} };
    existing.transfertsParCreneau[creneau].total += 1;
    existing.transfertsParCreneau[creneau].moyens[moyen] = (existing.transfertsParCreneau[creneau].moyens[moyen] || 0) + 1;
    await kv.set(key, existing, { ex: TTL_UN_MOIS });
  } catch (e) { console.error('incrementerTransfertJour error', e); }
}

// Appelé à la sortie : compte le patient comme "qualifiant" pour le créneau
// durant lequel il a été DÉCHARGÉ (pas celui de son arrivée) si au moins une
// prescription a été à la fois demandée et réalisée (marquée faite) au cours
// du séjour. C'est le créneau de sortie qui reflète le travail réel du
// médecin sur ce créneau (ex: patient arrivé la nuit, sorti le matin par le
// médecin du matin → ça doit compter pour 07h-13h, pas pour 19h-07h).
export async function incrementerUsageQualifieJour(patient) {
  try {
    const prescriptions = patient.prescriptions ? JSON.parse(patient.prescriptions) : [];
    const qualifie = Array.isArray(prescriptions) && prescriptions.some(r => r && r.fait);
    if (!qualifie) return;
    const ts = parseInt(patient.sortie) || Date.now();
    const { jour, creneau } = jourEtCreneauMedecin(ts);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    existing.usageQualifies = existing.usageQualifies || {};
    existing.usageQualifies[creneau] = (existing.usageQualifies[creneau] || 0) + 1;
    await kv.set(key, existing, { ex: TTL_UN_MOIS });
  } catch (e) { console.error('incrementerUsageQualifieJour error', e); }
}

async function lireJoursBrut(jours) {
  const valeurs = await Promise.all(jours.map(j => kv.get(cleJour(j))));
  const out = {};
  jours.forEach((j, i) => { out[j] = valeurs[i] || null; });
  return out;
}

export async function getUsageSemaine(jours) {
  const brut = await lireJoursBrut(jours);
  return jours.map(jour => ({
    jour,
    creneaux: CRENEAUX_MEDECIN.map(creneau => {
      const qualifies = (brut[jour] && brut[jour].usageQualifies && brut[jour].usageQualifies[creneau]) || 0;
      return { creneau, qualifies, ok: qualifies >= SEUIL_USAGE };
    }),
  }));
}

export function creneauUtilise(brutJour, creneau) {
  const n = (brutJour && brutJour.usageQualifies && brutJour.usageQualifies[creneau]) || 0;
  return n >= SEUIL_USAGE;
}

// Renvoie, pour chaque jour demandé, les 24 heures + parMotif + transferts,
// avec substitution silencieuse par le même créneau médecin de la semaine
// précédente si le créneau n'est pas "utilisé" (règle des 4 patients) et
// que la référence de la semaine précédente est exploitable.
export async function getStatsJourAvecBackfill(joursDemandes) {
  const joursRef = joursDemandes.map(j => jourMoinsNJours(j, 7));
  const joursSuivants = joursDemandes.map(j => jourMoinsNJours(j, -1));
  const joursRefSuivants = joursRef.map(j => jourMoinsNJours(j, -1));
  const tousLesJours = [...new Set([...joursDemandes, ...joursRef, ...joursSuivants, ...joursRefSuivants])];
  const brut = await lireJoursBrut(tousLesJours);

  function heuresDuJour(jour) {
    return (brut[jour] && brut[jour].heures) || new Array(24).fill(0);
  }

  CRENEAUX_MEDECIN; // no-op keep import used

  return joursDemandes.map(jour => {
    const jourRef = jourMoinsNJours(jour, 7);
    let heuresFinal = [...heuresDuJour(jour)];
    let heuresLendemainFinal = [...heuresDuJour(jourMoinsNJours(jour, -1))];
    const parMotifFinal = { ...((brut[jour] && brut[jour].parMotif) || {}) };
    let transfertsTotalFinal = (brut[jour] && brut[jour].transfertsTotal) || 0;
    const transfertsMoyensFinal = { ...((brut[jour] && brut[jour].transferts) || {}) };
    const tpcJour = (brut[jour] && brut[jour].transfertsParCreneau) || {};
    const tpcRef = (brut[jourRef] && brut[jourRef].transfertsParCreneau) || {};

    CRENEAUX_MEDECIN.forEach(creneau => {
      const utilise = creneauUtilise(brut[jour], creneau);
      if (utilise) return; // créneau validé, on ne touche à rien

      const refUtilise = creneauUtilise(brut[jourRef], creneau);
      if (!refUtilise) return; // pas de référence exploitable non plus, on laisse le vrai

      // Substitution silencieuse : on copie les heures du créneau de référence
      const [d, f] = BORNES_CRENEAU_MEDECIN[creneau];
      const heuresRef = heuresDuJour(jourRef);
      for (let h = d; h < f; h++) heuresFinal[h] = heuresRef[h] || 0;
      if (creneau === '19-07') {
        const heuresRefLendemain = heuresDuJour(jourMoinsNJours(jourRef, -1));
        for (let h = 0; h < 7; h++) heuresLendemainFinal[h] = heuresRefLendemain[h] || 0;
      }

      // Idem pour les transferts (comptés eux à l'heure de sortie, pas d'arrivée)
      const refCreneauTransferts = tpcRef[creneau];
      const reelCreneauTransferts = tpcJour[creneau];
      if (!reelCreneauTransferts && refCreneauTransferts) {
        transfertsTotalFinal += refCreneauTransferts.total || 0;
        Object.entries(refCreneauTransferts.moyens || {}).forEach(([m, n]) => {
          transfertsMoyensFinal[m] = (transfertsMoyensFinal[m] || 0) + n;
        });
      }
    });

    const passagesTotal = heuresFinal.reduce((a, b) => a + b, 0);
    return {
      jour,
      heures: heuresFinal,
      heuresLendemain: heuresLendemainFinal,
      parMotif: parMotifFinal,
      transferts: transfertsMoyensFinal,
      transfertsTotal: transfertsTotalFinal,
      passages: passagesTotal,
    };
  });
}
