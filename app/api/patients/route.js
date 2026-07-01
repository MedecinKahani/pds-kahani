import { kv } from '@/lib/kv';

function genId() {
  return 'pt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all');

    const activeKeys = await kv.keys('patient:*');
    const active = activeKeys.length ? await Promise.all(activeKeys.map(k => kv.hgetall(k))) : [];

    if (all) {
      const archiveKeys = await kv.keys('archive:*');
      const archives = archiveKeys.length ? await Promise.all(archiveKeys.map(k => kv.hgetall(k))) : [];
      const tous = [...active, ...archives].filter(Boolean).sort((a,b)=>(a.arrivee||0)-(b.arrivee||0));
      return Response.json({ patients: tous });
    }

    const sorted = active.filter(Boolean).sort((a, b) => (a.arrivee || 0) - (b.arrivee || 0));
    return Response.json({ patients: sorted });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const id = genId();
      const patient = {
        ...body.patient,
        id,
        arrivee: Date.now(),
        statut: body.patient?.statut || 'attente_medecin',
        emplacement: body.patient?.emplacement || null,
      };
      await kv.hset(`patient:${id}`, patient);
      await kv.expire(`patient:${id}`, 172800); // 48h en secondes
      const all = await getAllPatients();
      return Response.json({ ok: true, id, patients: all });
    }

    if (action === 'update') {
      const { id, patch } = body;
      await kv.hset(`patient:${id}`, patch);
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'restore') {
      const { id, emplacement } = body;
      const patient = await kv.hgetall(`archive:${id}`);
      if (patient) {
        patient.statut = emplacement ? 'attente_medecin' : 'dehors';
        patient.emplacement = emplacement || null;
        delete patient.sortie;
        delete patient.modalite_sortie;
        delete patient.moyen_sortie;
        await kv.hset(`patient:${id}`, patient);
        await kv.expire(`patient:${id}`, 172800);
        await kv.del(`archive:${id}`);
      }
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'delete') {
      const { id: delId } = body;
      await kv.del(`patient:${delId}`);
      return Response.json({ ok: true });
    }

    if (action === 'discharge') {
      const { id, modalite_sortie, moyen_sortie } = body;
      const patient = await kv.hgetall(`patient:${id}`);
      if (patient) {
        patient.sortie = Date.now();
        patient.statut = 'sorti';
        if (modalite_sortie) patient.modalite_sortie = modalite_sortie;
        if (moyen_sortie) patient.moyen_sortie = moyen_sortie;
        await kv.hset(`archive:${id}`, patient);
        await kv.expire(`archive:${id}`, 172800);
        await kv.del(`patient:${id}`);
        await incrementerCompteurs(patient);
      }
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'addActe') {
      const { id, acte } = body;
      const patient = await kv.hgetall(`patient:${id}`);
      const actes = patient.actes ? JSON.parse(patient.actes) : [];
      actes.push({ ...acte, heure: Date.now() });
      await kv.hset(`patient:${id}`, { actes: JSON.stringify(actes) });
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'addPrescription') {
      const { id, prescription } = body;
      const patient = await kv.hgetall(`patient:${id}`);
      const prescriptions = patient.prescriptions ? JSON.parse(patient.prescriptions) : [];
      prescriptions.push({ ...prescription, heure: Date.now() });
      await kv.hset(`patient:${id}`, { prescriptions: JSON.stringify(prescriptions) });
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

async function incrementerCompteurs(patient) {
  try {
    const d = new Date(parseInt(patient.arrivee));
    const moisKey = `stats:compteurs:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const existing = await kv.get(moisKey) || {};

    function inc(k, n=1) { existing[k] = (existing[k]||0) + n; }

    inc('nbPatients');
    if (patient.fc || patient.sat || patient.tas || patient.temp) inc('nbConstStd');
    if (patient.dextro) inc('nbDextro');
    if (patient.hemocue) inc('nbHemocue');
    if (patient.cetonemie) inc('nbCetonem');
    if (patient.crp_test) inc('nbCRP');
    if (patient.tdr_palu) inc('nbTdrPalu');
    if (patient.tdr_dengue) inc('nbTdrDengue');
    if (patient.quicktest) inc('nbTetanos');
    if (patient.bu_fait) inc('nbBU');
    if (patient.bhcg_fait) inc('nbBhcg');
    if (patient.bu_fait || patient.bhcg_fait) inc('nbUrine');
    if (patient.ecg_fait) inc('nbECG');
    if (patient.drp) inc('nbDRP');
    if (patient.educ_drp) inc('nbEducDRP');

    // Sutures
    const sutures = patient.sutures ? JSON.parse(patient.sutures) : [];
    if (sutures.includes('sut_sup5')) inc('nbSutSup5');
    if (sutures.includes('sut_inf5')) inc('nbSutInf5');
    if (sutures.includes('sut_colle')) inc('nbSutColle');
    if (sutures.includes('sut_agraf')) inc('nbSutAgraf');
    if (sutures.includes('sut_steri')) inc('nbSutSteri');

    // Prescriptions réalisées
    const prescriptions = patient.prescriptions ? JSON.parse(patient.prescriptions) : [];
    prescriptions.filter(r=>r.fait).forEach(r => {
      const t = (r.texte||'').toLowerCase();
      if (t.includes('ecbu')) inc('nbECBU');
      if (t.includes('hémoculture')) inc('nbHemocult');
      if (t.includes('coproculture')) inc('nbCoprocult');
      if (t.includes('bio délocalisée')) inc('nbBioDeloc');
      if (t.includes('gaz du sang')) inc('nbGazSang');
      if (t.includes('prélèvement mamoudzou')) inc('nbPrelevMam');
      if (t.includes('ecg')) inc('nbECG');
      if (t.includes('vvp')) inc('nbVVP');
      if (t.includes('sonde urinaire')) inc('nbSondeU');
      if (t.includes('aérosol')) inc('nbAerosol');
      if (t.includes('meopa')) inc('nbMeopa');
      if (t.includes('o2')) inc('nbO2');
      if (t.includes('drp')) inc('nbDRP');
      if (t.includes('pansement simple')) inc('nbPSTSimple');
      if (t.includes('pansement complexe')) inc('nbPSTCompl');
      if (t.includes('lavage cae')) inc('nbLavCAE');
      if (t.includes('vaccin')) inc('nbVaccin');
      if (t.includes('pose implant')) inc('nbPoseImpl');
      if (t.includes('retrait implant')) inc('nbRetrImpl');
      if (t.includes('reprise constantes')) inc('nbSurveillance');
      if (t.includes('éducation asthme')) inc('nbEducAsthme');
      if (t.includes('hellico')) inc('nbTransfHellico');
      if (t.includes('mdz') || t.includes('mamoudzou')) inc('nbTransfMDZ');
      if (r.categorie==='therapeutique' && r.texte?.includes(' IV')) inc('nbIV');
      if (r.categorie==='therapeutique' && r.texte?.includes(' IM')) inc('nbIM');
      if (r.categorie==='therapeutique' && r.texte?.includes(' SC')) inc('nbSC');
      if (t.includes('tramadol')||t.includes('morphine')||t.includes('meopa')||t.includes('kétoprofène')) inc('nbOrdoSecurisees');
    });

    await kv.set(moisKey, existing); // pas de TTL — persistant à vie
  } catch(e) { console.error('incrementerCompteurs error', e); }
}

async function getAllPatients() {
  const keys = await kv.keys('patient:*');
  if (!keys.length) return [];
  const patients = await Promise.all(keys.map(k => kv.hgetall(k)));
  return patients.filter(Boolean).sort((a, b) => (a.arrivee || 0) - (b.arrivee || 0));
}
