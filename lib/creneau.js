// Fuseau : Mayotte = UTC+3 toute l'année (pas d'heure d'été).
const OFFSET_MS = 3 * 60 * 60 * 1000;

export const CRENEAUX_MEDECIN = ['07-13', '13-19', '19-07'];

// Heure locale (0-23) Mayotte pour un timestamp ms UTC.
export function heureLocale(ts) {
  return new Date(ts + OFFSET_MS).getUTCHours();
}

// Date locale (YYYY-MM-DD) Mayotte pour un timestamp ms UTC.
export function jourLocal(ts) {
  return new Date(ts + OFFSET_MS).toISOString().slice(0, 10);
}

// À quel créneau médecin (07-13/13-19/19-07) et quel "jour de service" appartient
// ce timestamp. Le créneau 19-07 traverse minuit : les heures 00h-06h59
// appartiennent au jour de la veille (le créneau qui a commencé la veille à 19h).
export function jourEtCreneauMedecin(ts) {
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

export function jourMoinsNJours(jourStr, n) {
  const d = new Date(jourStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function jourPlusNJours(jourStr, n) {
  return jourMoinsNJours(jourStr, -n);
}

// Bornes horaires [debut,fin) locales d'un créneau médecin, pour retrouver
// à quelles heures d'un tableau de 24 cases (heures[0..23]) il correspond.
// '19-07' est spécial : couvre 19..23 du jour J ET 0..6 du jour J+1.
export const BORNES_CRENEAU_MEDECIN = {
  '07-13': [7, 13],
  '13-19': [13, 19],
  '19-07': [19, 24], // + [0,7[ le jour suivant, géré séparément par l'appelant
};
