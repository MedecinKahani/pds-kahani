// Minimisation des dossiers patients dans PDS Kahani.
//
// PDS Kahani n'est PAS le dossier médical légal (celui-ci vit dans DxCare).
// C'est un outil de travail pour la garde, dont les données n'ont plus
// besoin d'exister ici au-delà d'un court délai.
//
// Règle : 24h après l'arrivée du patient, on ne garde que l'essentiel pour
// le recontacter (nom, prénom, téléphone, ville) et les métadonnées de
// statut. Toutes les infos cliniques (anamnèse, examen, prescriptions,
// constantes, actes...) sont détruites. Suppression totale à 7 jours.
//
// ATTENTION UNITÉS : Date.now() est en MILLISECONDES. Toute comparaison de
// délai doit être en millisecondes. Toute durée passée à Redis (EX / expire)
// doit être en SECONDES. Un mélange des deux a déjà causé un bug en
// production sur le module prélevés — les constantes ci-dessous sont
// explicitement nommées avec leur unité pour éviter la récidive.

export const TTL_TOTAL_SECONDES = 7 * 24 * 3600; // 7 jours, pour kv.expire()
export const DELAI_MINIMISATION_MS = 24 * 3600 * 1000; // 24h, pour comparaison avec Date.now()

// Champs conservés après minimisation. Tout le reste est supprimé du hash Redis.
const CHAMPS_CONSERVES = [
  'id',
  'nom',
  'prenom',
  'tel',
  'ville',
  'arrivee',
  'statut',
  'emplacement',
  'sortie',
  'modalite_sortie',
  'moyen_sortie',
  'minimise',
];

function construireVersionAllegee(patient) {
  const allege = {};
  for (const champ of CHAMPS_CONSERVES) {
    if (patient[champ] !== undefined && patient[champ] !== null) {
      allege[champ] = patient[champ];
    }
  }
  allege.minimise = 'true'; // stocké comme string dans un hash Redis
  return allege;
}

// Minimise un patient si nécessaire (24h dépassées) en réécrivant
// physiquement le hash Redis (HDEL des champs cliniques). HDEL/HSET ne
// touchent pas le TTL déjà posé sur la clé, donc pas besoin de le regérer.
// Retourne la version (allégée ou non) à utiliser pour la réponse.
export async function minimiserPatientSiNecessaire(kv, key, patient) {
  if (!patient || patient.minimise) return patient;

  const arrivee = parseInt(patient.arrivee, 10);
  if (!arrivee || Number.isNaN(arrivee)) return patient;

  const age = Date.now() - arrivee;
  if (age < DELAI_MINIMISATION_MS) return patient;

  const allege = construireVersionAllegee(patient);
  const champsASupprimer = Object.keys(patient).filter((c) => !CHAMPS_CONSERVES.includes(c));

  try {
    if (champsASupprimer.length) {
      await kv.hdel(key, ...champsASupprimer);
    }
    // On force aussi la valeur de 'minimise' (peut ne pas exister encore).
    await kv.hset(key, { minimise: 'true' });
  } catch (e) {
    console.error('minimiserPatientSiNecessaire error', e);
    return patient; // en cas d'échec, on renvoie les données non modifiées plutôt que de planter
  }

  return allege;
}

// Applique la minimisation à une liste de patients (clés + données déjà
// chargées), en parallèle plutôt qu'en boucle séquentielle.
export async function minimiserListe(kv, keys, patients) {
  const resultats = await Promise.all(
    keys.map((key, i) => minimiserPatientSiNecessaire(kv, key, patients[i]))
  );
  return resultats.filter(Boolean);
}
