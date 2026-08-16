import { kv } from '@vercel/kv';
import { jourLocal, heureLocale, jourMoinsNJours, jourPlusNJours, BORNES_CRENEAU_MEDECIN, CRENEAUX_MEDECIN, OFFSET_MS } from './creneau';

// Journal journalier des passages — remplace l'ancien système de compteurs
// agrégés (heures/parMotif/transferts/activiteMedicale, retiré le
// 09/07/2026). Un seul objet par jour calendaire (minuit à 23h59, heure de
// Mayotte), conservé 60 jours (TTL), indépendant de la purge des dossiers
// patients complets (24h). Aucune donnée identifiante stockée ici, donc pas
// de contrainte de minimisation équivalente à celle des dossiers bruts.
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
const TTL_RETENTION_STATS = 62 * 24 * 60 * 60; // secondes — 60 jours, avec marge

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
    await kv.set(key, existing, { ex: TTL_RETENTION_STATS });
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
    await kv.set(key, existing, { ex: TTL_RETENTION_STATS });
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
    await kv.set(key, existing, { ex: TTL_RETENTION_STATS });
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

// Résumé (total + totaux par type de sortie + moyens de transfert) pour une
// liste d'entrées déjà filtrée sur une plage horaire donnée.
function resumerEntrees(entrees) {
  const totaux = { domicile: 0, pse: 0, transfert: 0, gav: 0, deces: 0, soins_ide: 0, enCours: 0 };
  const moyensTransfert = { ambulance: 0, helicoptere: 0, personnels: 0 };
  entrees.forEach(e => {
    if (!e.sortie) { totaux.enCours++; return; }
    if (totaux[e.sortie] !== undefined) totaux[e.sortie]++;
    if (e.sortie === 'transfert' && e.moyen && moyensTransfert[e.moyen] !== undefined) {
      moyensTransfert[e.moyen]++;
    }
  });
  return { total: entrees.length, totaux, moyensTransfert };
}

// Entrées brutes d'un jour calendaire (cache léger pour éviter de refaire
// plusieurs kv.get sur le même jour dans une même requête).
const _cacheJour = new Map();
async function entreesDuJour(jour) {
  if (_cacheJour.has(jour)) return _cacheJour.get(jour);
  const brut = (await kv.get(cleJour(jour))) || {};
  const entrees = brut.entrees || [];
  _cacheJour.set(jour, entrees);
  return entrees;
}

// Entrées d'un créneau médecin (07-13 / 13-19 / 19-07) pour un "jour de
// service" donné (le jour où le créneau commence). Le créneau 19-07
// traverse minuit : on va chercher les heures 0-6h59 dans le jour suivant.
async function entreesDuCreneau(jourService, creneau) {
  const [hDebut, hFin] = BORNES_CRENEAU_MEDECIN[creneau];
  const entreesJour = await entreesDuJour(jourService);
  let entrees = entreesJour.filter(e => e.h >= hDebut && e.h < hFin);
  if (creneau === '19-07') {
    const lendemain = jourPlusNJours(jourService, 1);
    const entreesLendemain = await entreesDuJour(lendemain);
    entrees = entrees.concat(entreesLendemain.filter(e => e.h >= 0 && e.h < 7));
  }
  return entrees;
}

// Timestamp UTC (ms) de fin d'un créneau médecin pour un jour de service
// donné. '19-07' se termine à 7h le lendemain (heure locale Mayotte).
function finCreneauMs(jourService, creneau) {
  const [an, mo, jr] = jourService.split('-').map(Number);
  const [, hFin] = BORNES_CRENEAU_MEDECIN[creneau];
  const heure = hFin === 24 ? 0 : hFin;
  const joursSup = hFin === 24 ? 1 : 0;
  const utcNaive = Date.UTC(an, mo - 1, jr + joursSup, heure, 0, 0);
  return utcNaive - OFFSET_MS;
}

// Résumé d'un créneau médecin pour un jour de service. Le repli sur J-7 ne
// s'applique qu'une fois le créneau réellement terminé : tant qu'il est en
// cours, un 0 est un vrai 0 (pas encore de patient), pas un créneau "vide"
// à estimer.
async function creneauAvecRepli(jourService, creneau) {
  const entrees = await entreesDuCreneau(jourService, creneau);
  if (entrees.length > 0) {
    return { ...resumerEntrees(entrees), estime: false, jourSource: jourService };
  }
  const creneauTermine = Date.now() >= finCreneauMs(jourService, creneau);
  if (!creneauTermine) {
    return { ...resumerEntrees([]), estime: false, jourSource: jourService };
  }
  const jourMoins7 = jourMoinsNJours(jourService, 7);
  const entreesMoins7 = await entreesDuCreneau(jourMoins7, creneau);
  if (entreesMoins7.length > 0) {
    return { ...resumerEntrees(entreesMoins7), estime: true, jourSource: jourMoins7 };
  }
  // Même la semaine précédente est vide : on renvoie 0, pas d'estimation possible.
  return { ...resumerEntrees([]), estime: false, jourSource: jourService };
}

// Les 3 créneaux médecin d'un jour de service, avec repli J-7 individuel
// par créneau vide.
export async function getCreneauxMedecinJour(jourService) {
  const out = {};
  for (const creneau of CRENEAUX_MEDECIN) {
    out[creneau] = await creneauAvecRepli(jourService, creneau);
  }
  return { jour: jourService, creneaux: out };
}

// Bilan brut (sans repli J-7) sur une plage de jours [jourDebut, jourFin]
// inclus (format YYYY-MM-DD) : total, répartition horaire (24 cases),
// totaux par type de sortie, moyens de transfert. Utilisé pour les stats
// mensuelles (total patients, tranches "perm", types de sortie) — ne
// dépend jamais des dossiers patients complets (TTL 24h), uniquement du
// journal anonyme (TTL 60j).
export async function getBilanPeriode(jourDebut, jourFin) {
  const parHeure = new Array(24).fill(0);
  const totaux = { domicile: 0, pse: 0, transfert: 0, gav: 0, deces: 0, soins_ide: 0, enCours: 0 };
  const moyensTransfert = { ambulance: 0, helicoptere: 0, personnels: 0 };
  let total = 0;

  let cursor = jourDebut;
  let iterations = 0;
  while (cursor <= jourFin && iterations < 400) {
    const entrees = await entreesDuJour(cursor);
    total += entrees.length;
    entrees.forEach(e => {
      if (e.h >= 0 && e.h < 24) parHeure[e.h]++;
      if (!e.sortie) { totaux.enCours++; return; }
      if (totaux[e.sortie] !== undefined) totaux[e.sortie]++;
      if (e.sortie === 'transfert' && e.moyen && moyensTransfert[e.moyen] !== undefined) {
        moyensTransfert[e.moyen]++;
      }
    });
    cursor = jourPlusNJours(cursor, 1);
    iterations++;
  }
  return { total, parHeure, totaux, moyensTransfert };
}

// Somme des créneaux médecin sur une plage de jours [jourDebut, jourFin]
// inclus (format YYYY-MM-DD), avec le même repli J-7 par créneau vide,
// jour par jour. Retourne les totaux cumulés par créneau + le nombre de
// créneaux estimés (utile pour un badge récapitulatif dans les vues
// mensuelles).
export async function getCreneauxMedecinPeriode(jourDebut, jourFin) {
  const totauxParCreneau = {};
  CRENEAUX_MEDECIN.forEach(c => {
    totauxParCreneau[c] = { total: 0, totaux: { domicile:0,pse:0,transfert:0,gav:0,deces:0,soins_ide:0,enCours:0 }, moyensTransfert: { ambulance:0,helicoptere:0,personnels:0 }, nbEstimes: 0, nbJours: 0 };
  });

  let cursor = jourDebut;
  let iterations = 0;
  while (cursor <= jourFin && iterations < 400) { // garde-fou anti-boucle infinie
    for (const creneau of CRENEAUX_MEDECIN) {
      const r = await creneauAvecRepli(cursor, creneau);
      const acc = totauxParCreneau[creneau];
      acc.total += r.total;
      acc.nbJours += 1;
      if (r.estime) acc.nbEstimes += 1;
      Object.keys(acc.totaux).forEach(k => { acc.totaux[k] += r.totaux[k]||0; });
      Object.keys(acc.moyensTransfert).forEach(k => { acc.moyensTransfert[k] += r.moyensTransfert[k]||0; });
    }
    cursor = jourPlusNJours(cursor, 1);
    iterations++;
  }
  return totauxParCreneau;
}
