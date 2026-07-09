import { kv } from '@vercel/kv';
import { heureLocale, jourLocal, jourMoinsNJours, jourEtCreneauMedecin, CRENEAUX_MEDECIN } from './creneau';

// Compteurs journaliers "passages" et "transferts" — conservés 1 mois
// (comme le cahier Actes IDE), indépendamment de la purge des dossiers
// patients complets (24h). Ne stocke que des compteurs agrégés, jamais de
// données patient identifiantes : cohérent avec la politique de minimisation
// des données déjà en place.
//
// Pas de lissage / substitution : on affiche toujours les vrais chiffres,
// même à zéro. (Le mécanisme de seuil d'usage médecin + remplacement
// silencieux par la semaine précédente a été retiré le 07/07/2026, jugé pas
// fiable — à reprendre à zéro si besoin plus tard.)
const TTL_UN_MOIS = 32 * 24 * 60 * 60; // secondes, avec marge

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

// Compte un patient comme "activité médicale" sur le créneau médecin
// (07-13/13-19/19-07) correspondant au moment où sa PREMIÈRE prescription a
// été marquée faite (pas la sortie — plus fiable et plus réactif : le
// patient n'a pas besoin d'être déjà sorti pour compter). Le dédoublonnage
// par patient se fait côté appelant (flag activiteMedicaleComptee).
export async function incrementerActiviteMedicaleJour(ts) {
  try {
    const { jour, creneau } = jourEtCreneauMedecin(ts);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    existing.activiteMedicale = existing.activiteMedicale || {};
    existing.activiteMedicale[creneau] = (existing.activiteMedicale[creneau] || 0) + 1;
    await kv.set(key, existing, { ex: TTL_UN_MOIS });
  } catch (e) { console.error('incrementerActiviteMedicaleJour error', e); }
}

export async function getActiviteMedicaleSemaine(jours) {
  const valeurs = await Promise.all(jours.map(j => kv.get(cleJour(j))));
  return jours.map((jour, i) => {
    const brut = valeurs[i] || {};
    return {
      jour,
      creneaux: CRENEAUX_MEDECIN.map(creneau => ({
        creneau,
        n: (brut.activiteMedicale && brut.activiteMedicale[creneau]) || 0,
      })),
    };
  });
}
async function lireJoursBrut(jours) {
  const valeurs = await Promise.all(jours.map(j => kv.get(cleJour(j))));
  const out = {};
  jours.forEach((j, i) => { out[j] = valeurs[i] || null; });
  return out;
}

// Renvoie, pour chaque jour demandé, les vrais compteurs (24 heures,
// parMotif, transferts) — aucune substitution, aucun seuil.
export async function getStatsJour(joursDemandes) {
  const joursSuivants = joursDemandes.map(j => jourMoinsNJours(j, -1));
  const tousLesJours = [...new Set([...joursDemandes, ...joursSuivants])];
  const brut = await lireJoursBrut(tousLesJours);

  function heuresDuJour(jour) {
    return (brut[jour] && brut[jour].heures) || new Array(24).fill(0);
  }

  return joursDemandes.map(jour => {
    const heures = heuresDuJour(jour);
    const heuresLendemain = heuresDuJour(jourMoinsNJours(jour, -1));
    const parMotif = (brut[jour] && brut[jour].parMotif) || {};
    const transferts = (brut[jour] && brut[jour].transferts) || {};
    const transfertsTotal = (brut[jour] && brut[jour].transfertsTotal) || 0;
    const passages = heures.reduce((a, b) => a + b, 0);
    return { jour, heures, heuresLendemain, parMotif, transferts, transfertsTotal, passages };
  });
}
