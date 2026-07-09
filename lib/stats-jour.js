import { kv } from '@vercel/kv';
import { jourLocal, heureLocale } from './creneau';

// Journal journalier des passages — remplace l'ancien système de compteurs
// agrégés (heures/parMotif/transferts/activiteMedicale, retiré le
// 09/07/2026). Un seul objet par jour calendaire (minuit à 23h59, heure de
// Mayotte), conservé 7 jours (TTL), indépendant de la purge des dossiers
// patients complets (24h).
//
// Contenu : liste d'entrées anonymes { id, h, sortie, moyen }
//  - id     : identifiant interne du patient (même opaque id que patient:id
//             / archive:id — sert uniquement à retrouver l'entrée à la
//             sortie, pas une donnée patient en soi)
//  - h      : heure d'arrivée (0-23, heure locale)
//  - sortie : null tant que le patient n'est pas sorti, puis un type parmi
//             'domicile' | 'pse' | 'transfert' | 'gav' | 'deces' | 'soins_ide'
//  - moyen  : uniquement si sortie==='transfert' : 'ambulance' | 'helicoptere' | 'personnels'
//
// Aucune donnée identifiante (pas de nom, IPP, diagnostic...) n'est stockée
// ici, conformément à la politique de minimisation déjà en place.
const TTL_SEPT_JOURS = 8 * 24 * 60 * 60; // secondes, avec marge

function cleJour(jour) { return `statsjour:${jour}`; }

// Appelé à la création d'un patient (triage normal ou acte IDE direct).
// Pour un acte IDE direct, sortie/moyen peuvent être fournis directement
// (le patient est créé et sorti au même instant).
export async function enregistrerEntreeJour(patient, sortieImmediate) {
  try {
    const arrivee = parseInt(patient.arrivee) || Date.now();
    const jour = jourLocal(arrivee);
    const h = heureLocale(arrivee);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    existing.entrees = existing.entrees || [];
    existing.entrees.push({
      id: patient.id,
      h,
      sortie: sortieImmediate || null,
      moyen: null,
    });
    await kv.set(key, existing, { ex: TTL_SEPT_JOURS });
  } catch (e) { console.error('enregistrerEntreeJour error', e); }
}

// Appelé à la sortie (discharge) : retrouve l'entrée du jour d'ARRIVÉE du
// patient (pas forcément le jour de sortie, ex. patient arrivé la veille au
// soir) et y renseigne le type de sortie.
export async function enregistrerSortieJour(patient, modaliteSortie, moyenSortie) {
  try {
    const arrivee = parseInt(patient.arrivee) || Date.now();
    const jour = jourLocal(arrivee);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    if (!existing.entrees) return;
    const idx = existing.entrees.findIndex(e => e.id === patient.id);
    if (idx === -1) return;
    existing.entrees[idx].sortie = modaliteSortie || null;
    existing.entrees[idx].moyen = modaliteSortie === 'transfert' ? (moyenSortie || null) : null;
    await kv.set(key, existing, { ex: TTL_SEPT_JOURS });
  } catch (e) { console.error('enregistrerSortieJour error', e); }
}

// Appelé quand un dossier est annulé (erreur de création) : retire
// entièrement l'entrée, aucune trace ne doit rester dans les stats.
export async function supprimerEntreeJour(patient) {
  try {
    const arrivee = parseInt(patient.arrivee) || Date.now();
    const jour = jourLocal(arrivee);
    const key = cleJour(jour);
    const existing = (await kv.get(key)) || {};
    if (!existing.entrees) return;
    existing.entrees = existing.entrees.filter(e => e.id !== patient.id);
    await kv.set(key, existing, { ex: TTL_SEPT_JOURS });
  } catch (e) { console.error('supprimerEntreeJour error', e); }
}

// Détail d'un jour : compte par heure + liste des entrées (pour les
// symboles) + totaux par type de sortie.
export async function getJourDetail(jour) {
  const brut = (await kv.get(cleJour(jour))) || {};
  const entrees = brut.entrees || [];

  const parHeure = new Array(24).fill(0).map(() => []);
  entrees.forEach(e => {
    if (e.h >= 0 && e.h < 24) parHeure[e.h].push(e);
  });

  const totaux = { domicile: 0, pse: 0, transfert: 0, gav: 0, deces: 0, soins_ide: 0, enCours: 0 };
  const moyensTransfert = { ambulance: 0, helicoptere: 0, personnels: 0 };
  entrees.forEach(e => {
    if (!e.sortie) { totaux.enCours++; return; }
    if (totaux[e.sortie] !== undefined) totaux[e.sortie]++;
    if (e.sortie === 'transfert' && e.moyen && moyensTransfert[e.moyen] !== undefined) {
      moyensTransfert[e.moyen]++;
    }
  });

  return { jour, total: entrees.length, parHeure, totaux, moyensTransfert };
}
