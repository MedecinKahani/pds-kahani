export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kv } from '@vercel/kv';

// Endpoint de rattrapage TEMPORAIRE — usage unique, à supprimer après exécution.
// Recalcule les compteurs du mois en cours à partir des dossiers archive:* encore
// présents (non purgés par le TTL 24h), pour récupérer ce qui peut encore l'être
// suite au bug JSON.parse qui empêchait tout incrément depuis le début du mois.
// Protégé par un secret simple passé en query pour éviter un déclenchement accidentel.

function safeParse(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function calculerIncrements(patient) {
  const inc = {};
  function add(k, n = 1) { inc[k] = (inc[k] || 0) + n; }

  if (patient.fc || patient.sat || patient.tas || patient.temp) add('nbConstStd');
  if (patient.tas || patient.tad) add('nbTensiometre');
  if (patient.dextro) add('nbDextro');
  if (patient.hemocue) add('nbHemocue');
  if (patient.cetonemie) add('nbCetonem');
  if (patient.crp_test) add('nbActimCRP');
  if (patient.tdr_palu) add('nbTdrPalu');
  if (patient.tdr_dengue) add('nbTdrDengue');
  if (patient.quicktest) add('nbTetanotop');
  if (patient.bu_fait) add('nbBU');
  if (patient.bhcg_fait) add('nbTGrossesse');
  if (patient.bu_fait || patient.bhcg_fait) add('nbUrine');
  if (patient.ecg_fait) add('nbECG');
  if (patient.drp) add('nbDRP');
  if (patient.educ_drp) add('nbEducDRP');

  const sutures = safeParse(patient.sutures);
  if (sutures.includes('sut_sup5')) add('nbSutSup5');
  if (sutures.includes('sut_inf5')) add('nbSutInf5');
  if (sutures.includes('sut_colle')) add('nbSutColle');
  if (sutures.includes('sut_agraf')) add('nbSutAgraf');
  if (sutures.includes('sut_steri')) add('nbSutSteri');

  const prescriptions = safeParse(patient.prescriptions);
  prescriptions.filter(r => r.fait).forEach(r => {
    const t = (r.texte || '').toLowerCase();
    if (t.includes('test optimal')) add('nbTestOptimal');
    if (t.includes('bilan sanguin') || t.includes('bio délocalisée')) add('nbBilanSanguin');
    if (t.includes('ecbu')) add('nbECBU');
    if (t.includes('hémoculture')) add('nbHemocult');
    if (t.includes('coproculture')) add('nbCoprocultures');
    if (t.includes('gaz du sang')) add('nbGazSang');
    if (t.includes('prélèvement mamoudzou')) add('nbPrelevMam');
    if (t.includes('ecg')) add('nbECG');
    if (t.includes('vvp')) add('nbVVP');
    if (t.includes('sonde urinaire')) add('nbSondeUrinaire');
    if (t.includes('aérosol')) add('nbAerosol');
    if (t.includes('meopa')) add('nbMEOPA');
    if (t.includes('o2')) add('nbOxygene');
    if (t.includes('tensiomètre')) add('nbTensiometre');
    if (t.includes('drp')) add('nbDRP');
    if (t.includes('pansement simple')) add('nbPansementSimple');
    if (t.includes('pansement complexe')) add('nbPansementComplexe');
    if (t.includes('lavage cae')) add('nbLavageCAE');
    if (t.includes('vaccin')) {
      if (t.includes('covid')) add('nbVaccinsCovid'); else add('nbAutresVaccins');
    }
    if (t.includes('ablation abcès') || t.includes('ablation abces')) add('nbAbces');
    if (t.includes('pose implant')) add('nbPoseImpl');
    if (t.includes('retrait implant')) add('nbRetrImpl');
    if (t.includes('reprise constantes')) add('nbSurveillance');
    if (t.includes('ducation')) add('nbEducation');
    if (t.includes('maternité')) add('nbMaternite');
    if (r.categorie === 'therapeutique' && r.texte?.includes(' IV')) add('nbIV');
    if (r.categorie === 'therapeutique' && r.texte?.includes(' IM')) add('nbIM');
    if (r.categorie === 'therapeutique' && r.texte?.includes(' SC')) add('nbSC');
    if (t.includes('tramadol') || t.includes('morphine') || t.includes('meopa') || t.includes('kétoprofène')) add('nbOrdoSecurisees');
  });

  return inc;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('confirm') !== 'oui') {
      return Response.json({ error: 'Ajouter ?confirm=oui pour exécuter le rattrapage' }, { status: 400 });
    }

    const archiveKeys = await kv.keys('archive:*');
    const patients = archiveKeys.length ? await Promise.all(archiveKeys.map(k => kv.hgetall(k))) : [];

    const totaux = {};
    let nbTraites = 0;
    for (const p of patients.filter(Boolean)) {
      if (!p.arrivee) continue;
      const inc = calculerIncrements(p);
      for (const [k, n] of Object.entries(inc)) totaux[k] = (totaux[k] || 0) + n;
      nbTraites++;
    }

    const now = new Date();
    const moisKey = `stats:compteurs:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existing = (await kv.get(moisKey)) || {};
    const fusionne = { ...existing };
    for (const [k, n] of Object.entries(totaux)) fusionne[k] = (fusionne[k] || 0) + n;
    await kv.set(moisKey, fusionne);

    return Response.json({ ok: true, nbTraites, totauxAjoutes: totaux, resultatFinal: fusionne });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
