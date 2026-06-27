'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function safeJSON(val, fallback=[]) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function getMoisOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      debut: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
      fin: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime(),
    });
  }
  return opts;
}

function Ligne({ label, valeur }) {
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '7px 12px', fontSize: 13, color: '#374151' }}>{label}</td>
      <td style={{ padding: '7px 12px', fontSize: 15, fontWeight: 700, color: valeur > 0 ? '#111827' : '#d1d5db', textAlign: 'right', minWidth: 50 }}>{valeur}</td>
    </tr>
  );
}

function Section({ titre, couleur, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: couleur + '18', padding: '7px 12px', borderRadius: '8px 8px 0 0', fontWeight: 700, color: couleur, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{titre}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function StatsMensuelles() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const moisOptions = getMoisOptions();
  const [moisIdx, setMoisIdx] = useState(0);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    setUser(JSON.parse(s));
  }, []);

  useEffect(() => { if (user) charger(); }, [user, moisIdx]);

  async function charger() {
    setLoading(true);
    const r = await fetch('/api/patients?all=1');
    const d = await r.json();
    const { debut, fin } = moisOptions[moisIdx];
    const pts = (d.patients || []).filter(p => {
      const t = parseInt(p.arrivee);
      return t >= debut && t <= fin;
    });
    setPatients(pts);
    setLoading(false);
  }

  const mois = moisOptions[moisIdx];
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const toutesRx = patients.flatMap(p => safeJSON(p.prescriptions, []).filter(r => r.fait));

  function countRx(needle) {
    return toutesRx.filter(r => (r.texte || '').toLowerCase().includes(needle.toLowerCase())).length;
  }

  const nbPatients = patients.length;
  const nbDextro = patients.filter(p => p.dextro).length + countRx('dextro');
  const nbHemocue = patients.filter(p => p.hemocue).length + countRx('hémocue');
  const nbCetonem = patients.filter(p => p.cetonemie).length + countRx('cétonémie');
  const nbCRP = patients.filter(p => p.crp_test).length + countRx('crp');
  const nbTdrPalu = patients.filter(p => p.tdr_palu).length + countRx('paludisme');
  const nbTdrDengue = patients.filter(p => p.tdr_dengue).length + countRx('dengue');
  const nbTetanos = patients.filter(p => p.quicktest).length + countRx('tétanotop');
  const nbBU = patients.filter(p => p.bu_fait).length + countRx('bu');
  const nbBhcg = patients.filter(p => p.bhcg_fait).length + countRx('bhcg');
  const nbUrine = patients.filter(p =>
    p.bu_fait || p.bhcg_fait ||
    safeJSON(p.prescriptions, []).some(r => r.fait && (r.texte?.toLowerCase().includes('bu') || r.texte?.toLowerCase().includes('bhcg')))
  ).length;
  const nbECBU = countRx('ecbu');
  const nbHemocult = countRx('hémoculture');
  const nbCoprocult = countRx('coproculture');
  const nbBioDeloc = toutesRx.filter(r => r.texte?.includes('Bio délocalisée')).length;
  const nbGazSang = countRx('gaz du sang');
  const nbPrelevMam = toutesRx.filter(r => r.texte?.includes('Prélèvement Mamoudzou')).length;

  const nbECG = patients.filter(p => p.ecg_fait).length + countRx('ecg');
  const nbVVP = countRx('vvp');
  const nbIV = toutesRx.filter(r => r.categorie === 'therapeutique' && r.texte?.includes(' IV')).length;
  const nbIM = toutesRx.filter(r => r.categorie === 'therapeutique' && r.texte?.includes(' IM')).length;
  const nbSC = toutesRx.filter(r => r.categorie === 'therapeutique' && r.texte?.includes(' SC')).length;
  const nbO2 = countRx('o2');
  const nbAerosol = countRx('aérosol');
  const nbMeopa = countRx('meopa');
  const nbDRP = patients.filter(p => p.drp).length + countRx('drp');
  const nbEducDRP = patients.filter(p => p.educ_drp).length;
  const nbSondeU = countRx('sonde urinaire');
  const nbSurveillance = countRx('reprise constantes');
  const nbEducAsthme = countRx('éducation asthme');

  function countSuture(id) {
    return patients.filter(p => safeJSON(p.sutures, []).includes(id)).length;
  }
  const nbSutSup5 = countSuture('sut_sup5');
  const nbSutInf5 = countSuture('sut_inf5');
  const nbSutColle = countSuture('sut_colle');
  const nbSutAgraf = countSuture('sut_agraf');
  const nbSutSteri = countSuture('sut_steri');

  const nbPSTSimple = countRx('pansement simple');
  const nbPSTCompl = countRx('pansement complexe');
  const nbLavCAE = countRx('lavage cae');
  const nbPoseImpl = countRx('pose implant');
  const nbRetrImpl = countRx('retrait implant');
  const nbVaccin = countRx('vaccin');

  const nbTransfHellico = toutesRx.filter(r => r.texte?.toLowerCase().includes('hellico')).length;
  const nbTransfMDZ = toutesRx.filter(r => r.texte?.toLowerCase().includes('mdz') || r.texte?.toLowerCase().includes('mamoudzou')).length;

  const ordoSecurisees = toutesRx.filter(r => {
    const t = r.texte || '';
    return t.includes('Tramadol') || t.includes('Morphine') || t.includes('MEOPA') || t.includes('Kétoprofène');
  });

  if (!user) return null;

  return (
    <div style={{ fontFamily: 'system-ui', background: '#f3f4f6', minHeight: '100vh' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ padding: '7px 14px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280', fontSize: 12, border: '1px solid #e5e7eb', cursor: 'pointer' }}>Retour</button>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Statistiques mensuelles</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={moisIdx} onChange={e => setMoisIdx(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, cursor: 'pointer' }}>
            {moisOptions.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
          </select>
          <button onClick={() => window.print()} style={{ padding: '9px 20px', borderRadius: 8, background: '#0d9488', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            Exporter PDF
          </button>
        </div>
      </nav>

      <div id="print-zone" style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem 1.5rem', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>CMR Kahani — Statistiques mensuelles</div>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>{mois.label} — Généré le {dateStr}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{user?.nom} ({user?.matricule})</div>
        </div>

        <div style={{ background: '#0d9488', borderRadius: 12, padding: '1rem 1.5rem', marginBottom: 16, display: 'flex', gap: 32 }}>
          <div><div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Patients</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 44, lineHeight: 1 }}>{nbPatients}</div></div>
          <div><div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Consultations</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 44, lineHeight: 1 }}>{nbPatients}</div></div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Chargement...</div>}

        {!loading && <>
          <Section titre="🔬 Biologie délocalisée / Point of care" couleur="#f59e0b">
            <Ligne label="Dextro" valeur={nbDextro}/>
            <Ligne label="Hémocue" valeur={nbHemocue}/>
            <Ligne label="Cétonémie" valeur={nbCetonem}/>
            <Ligne label="CRP test" valeur={nbCRP}/>
            <Ligne label="TDR Paludisme" valeur={nbTdrPalu}/>
            <Ligne label="TDR Dengue" valeur={nbTdrDengue}/>
            <Ligne label="Tétanotop (Quick test)" valeur={nbTetanos}/>
            <Ligne label="BU (bandelette urinaire)" valeur={nbBU}/>
            <Ligne label="bHCG urinaire" valeur={nbBhcg}/>
            <Ligne label="Urine (recueil — BU et/ou bHCG)" valeur={nbUrine}/>
            <Ligne label="ECBU" valeur={nbECBU}/>
            <Ligne label="Hémoculture" valeur={nbHemocult}/>
            <Ligne label="Coproculture" valeur={nbCoprocult}/>
            <Ligne label="Bio délocalisée" valeur={nbBioDeloc}/>
            <Ligne label="Gaz du sang" valeur={nbGazSang}/>
            <Ligne label="Prélèvement Mamoudzou" valeur={nbPrelevMam}/>
          </Section>

          <Section titre="🩺 Actes infirmiers" couleur="#3b82f6">
            <Ligne label="ECG" valeur={nbECG}/>
            <Ligne label="VVP" valeur={nbVVP}/>
            <Ligne label="Traitement IV" valeur={nbIV}/>
            <Ligne label="Traitement IM" valeur={nbIM}/>
            <Ligne label="Traitement SC" valeur={nbSC}/>
            <Ligne label="O2 (oxygénothérapie)" valeur={nbO2}/>
            <Ligne label="Aérosol" valeur={nbAerosol}/>
            <Ligne label="MEOPA" valeur={nbMeopa}/>
            <Ligne label="DRP (lavage de nez)" valeur={nbDRP}/>
            <Ligne label="Éducation DRP (parents)" valeur={nbEducDRP}/>
            <Ligne label="Sonde urinaire" valeur={nbSondeU}/>
            <Ligne label="Reprise constantes post-thérapeutique" valeur={nbSurveillance}/>
            <Ligne label="Éducation thérapeutique asthme" valeur={nbEducAsthme}/>
          </Section>

          <Section titre="✂️ Sutures / Fermeture de plaie" couleur="#dc2626">
            <Ligne label="Suture ≥ 5 points" valeur={nbSutSup5}/>
            <Ligne label="Suture < 5 points" valeur={nbSutInf5}/>
            <Ligne label="Suture colle" valeur={nbSutColle}/>
            <Ligne label="Suture agrafes" valeur={nbSutAgraf}/>
            <Ligne label="Suture Steri-strip" valeur={nbSutSteri}/>
          </Section>

          <Section titre="🩹 Pansements / Soins locaux" couleur="#f59e0b">
            <Ligne label="Pansement simple" valeur={nbPSTSimple}/>
            <Ligne label="Pansement complexe" valeur={nbPSTCompl}/>
            <Ligne label="Lavage CAE" valeur={nbLavCAE}/>
          </Section>

          <Section titre="💉 Autres actes" couleur="#7c3aed">
            <Ligne label="Vaccin" valeur={nbVaccin}/>
            <Ligne label="Pose implant" valeur={nbPoseImpl}/>
            <Ligne label="Retrait implant" valeur={nbRetrImpl}/>
          </Section>

          <Section titre="🚑 Transferts" couleur="#6b7280">
            <Ligne label="Transfert Hellico" valeur={nbTransfHellico}/>
            <Ligne label="Transfert urgences MDZ" valeur={nbTransfMDZ}/>
          </Section>

          <Section titre="🔴 Ordonnances sécurisées" couleur="#dc2626">
            {ordoSecurisees.length === 0
              ? <tr><td colSpan={2} style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 13 }}>Aucune</td></tr>
              : ordoSecurisees.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: '#374151' }}>{r.texte}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{r.faitPar || ''}</td>
                </tr>
              ))
            }
          </Section>
        </>}

        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '8px' }}>CMR Kahani PDS v1.0 — {dateStr}</div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } #print-zone { margin: 0 !important; padding: 0.5rem !important; max-width: 100% !important; } }`}</style>
    </div>
  );
}
