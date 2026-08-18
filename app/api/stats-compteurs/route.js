import { kv } from '@vercel/kv';

// Anciens noms de compteurs (avant le renommage du 18/08/2026) → nouveaux noms.
// Les compteurs déjà accumulés dans Redis sous l'ancien nom sont fusionnés ici
// à la lecture, sans réécrire le stockage — aucune donnée perdue, aucun risque
// de double-comptage puisque le code n'écrit plus jamais sous l'ancien nom.
const ALIAS_ANCIENNES_CLES = {
  nbCRP: 'nbActimCRP',
  nbTetanos: 'nbTetanotop',
  nbBhcg: 'nbTGrossesse',
  nbCoprocult: 'nbCoprocultures',
  nbBioDeloc: 'nbBilanSanguin',
  nbSondeU: 'nbSondeUrinaire',
  nbMeopa: 'nbMEOPA',
  nbO2: 'nbOxygene',
  nbPSTSimple: 'nbPansementSimple',
  nbPSTCompl: 'nbPansementComplexe',
  nbLavCAE: 'nbLavageCAE',
  nbEducAsthme: 'nbEducation',
  // nbVaccin (ancien, non scindé covid/autres) : reversé sur nbAutresVaccins par défaut,
  // faute de pouvoir départager rétroactivement — impact limité aux dossiers du
  // 1er au 18/08/2026 encore présents dans ce compteur mensuel.
  nbVaccin: 'nbAutresVaccins',
};

function fusionnerAnciensCompteurs(val) {
  if (!val) return val;
  const out = { ...val };
  for (const [ancien, nouveau] of Object.entries(ALIAS_ANCIENNES_CLES)) {
    if (val[ancien]) {
      out[nouveau] = (out[nouveau] || 0) + val[ancien];
    }
  }
  return out;
}

export async function GET() {
  try {
    const now = new Date();
    const compteurs = {};
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `stats:compteurs:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const moisKey = `${d.getFullYear()}-${d.getMonth()}`;
      const val = await kv.get(key);
      if (val) compteurs[moisKey] = fusionnerAnciensCompteurs(val);
    }
    return Response.json({ compteurs });
  } catch {
    return Response.json({ compteurs: {} });
  }
}
