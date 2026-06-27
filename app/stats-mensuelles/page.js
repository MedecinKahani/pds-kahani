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
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      debut: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
      fin: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime(),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    });
  }
  return opts;
}

function calcStats(patients) {
  const toutesRx = patients.flatMap(p => safeJSON(p.prescriptions, []).filter(r => r.fait));
  function countRx(needle) {
    return toutesRx.filter(r => (r.texte||'').toLowerCase().includes(needle.toLowerCase())).length;
  }
  function countSuture(id) {
    return patients.filter(p => safeJSON(p.sutures, []).includes(id)).length;
  }
  return {
    nbPatients: patients.length,
    nbDextro: patients.filter(p=>p.dextro).length + countRx('dextro'),
    nbHemocue: patients.filter(p=>p.hemocue).length + countRx('hémocue'),
    nbCetonem: patients.filter(p=>p.cetonemie).length + countRx('cétonémie'),
    nbCRP: patients.filter(p=>p.crp_test).length + countRx('crp'),
    nbTdrPalu: patients.filter(p=>p.tdr_palu).length + countRx('paludisme'),
    nbTdrDengue: patients.filter(p=>p.tdr_dengue).length + countRx('dengue'),
    nbTetanos: patients.filter(p=>p.quicktest).length + countRx('tétanotop'),
    nbBU: patients.filter(p=>p.bu_fait).length + countRx('bu'),
    nbBhcg: patients.filter(p=>p.bhcg_fait).length + countRx('bhcg'),
    nbUrine: patients.filter(p=>p.bu_fait||p.bhcg_fait||safeJSON(p.prescriptions,[]).some(r=>r.fait&&(r.texte?.toLowerCase().includes('bu')||r.texte?.toLowerCase().includes('bhcg')))).length,
    nbECBU: countRx('ecbu'),
    nbHemocult: countRx('hémoculture'),
    nbCoprocult: countRx('coproculture'),
    nbBioDeloc: toutesRx.filter(r=>r.texte?.includes('Bio délocalisée')).length,
    nbGazSang: countRx('gaz du sang'),
    nbPrelevMam: toutesRx.filter(r=>r.texte?.includes('Prélèvement Mamoudzou')).length,
    nbECG: patients.filter(p=>p.ecg_fait).length + countRx('ecg'),
    nbVVP: countRx('vvp'),
    nbIV: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' IV')).length,
    nbIM: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' IM')).length,
    nbSC: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' SC')).length,
    nbO2: countRx('o2'),
    nbAerosol: countRx('aérosol'),
    nbMeopa: countRx('meopa'),
    nbDRP: patients.filter(p=>p.drp).length + countRx('drp'),
    nbEducDRP: patients.filter(p=>p.educ_drp).length,
    nbSondeU: countRx('sonde urinaire'),
    nbSurveillance: countRx('reprise constantes'),
    nbEducAsthme: countRx('éducation asthme'),
    nbSutSup5: countSuture('sut_sup5'),
    nbSutInf5: countSuture('sut_inf5'),
    nbSutColle: countSuture('sut_colle'),
    nbSutAgraf: countSuture('sut_agraf'),
    nbSutSteri: countSuture('sut_steri'),
    nbPSTSimple: countRx('pansement simple'),
    nbPSTCompl: countRx('pansement complexe'),
    nbLavCAE: countRx('lavage cae'),
    nbVaccin: countRx('vaccin'),
    nbPoseImpl: countRx('pose implant'),
    nbRetrImpl: countRx('retrait implant'),
    nbTransfHellico: toutesRx.filter(r=>r.texte?.toLowerCase().includes('hellico')).length,
    nbTransfMDZ: toutesRx.filter(r=>r.texte?.toLowerCase().includes('mdz')||r.texte?.toLowerCase().includes('mamoudzou')).length,
    ordoSecurisees: toutesRx.filter(r=>{const t=r.texte||'';return t.includes('Tramadol')||t.includes('Morphine')||t.includes('MEOPA')||t.includes('Kétoprofène');}),
  };
}

function L({ l, v }) {
  return (
    <tr style={{borderBottom:'1px solid #f9fafb'}}>
      <td style={{padding:'6px 12px',fontSize:13,color:'#374151'}}>{l}</td>
      <td style={{padding:'6px 12px',fontSize:14,fontWeight:700,color:v>0?'#111827':'#d1d5db',textAlign:'right'}}>{v}</td>
    </tr>
  );
}

function Sec({ titre, color, children }) {
  return <>
    <tr><td colSpan={2} style={{padding:'6px 12px',background:color+'18',fontSize:10,fontWeight:700,color:color,textTransform:'uppercase',letterSpacing:0.5}}>{titre}</td></tr>
    {children}
  </>;
}

export default function StatsMensuelles() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPatients, setAllPatients] = useState([]);
  const [moisIdx, setMoisIdx] = useState(0);
  const [impressions, setImpressions] = useState({});
  const moisOptions = getMoisOptions();

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    setUser(JSON.parse(s));
    charger();
    // Charger l'état des impressions
    fetch('/api/stats-alerte').then(r=>r.json()).then(d=>{
      if (d.impressions) setImpressions(d.impressions);
    });
  }, []);

  async function charger() {
    setLoading(true);
    const r = await fetch('/api/patients?all=1');
    const d = await r.json();
    setAllPatients(d.patients || []);
    setLoading(false);
  }

  const mois = moisOptions[moisIdx];
  const patientsduMois = allPatients.filter(p => {
    const t = parseInt(p.arrivee);
    return t >= mois.debut && t <= mois.fin;
  });
  const s = calcStats(patientsduMois);
  const imprime = impressions[mois.key];
  const dateStr = new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'});

  async function marquerImprime() {
    const nouv = { ...impressions, [mois.key]: { par: user?.nom, le: dateStr } };
    setImpressions(nouv);
    await fetch('/api/stats-alerte', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ action: 'marquer_imprime', impressions: nouv })
    });
    window.print();
  }

  return (
    <div style={{fontFamily:'system-ui',background:'#f3f4f6',minHeight:'100vh'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}} className="no-print">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.back()} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>Retour</button>
          <span style={{fontWeight:700,fontSize:15,color:'#111827'}}>Statistiques mensuelles</span>
        </div>
      </nav>

      <div style={{maxWidth:720,margin:'2rem auto',padding:'0 1rem'}}>

        {/* Navigation mois */}
        <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 16px',marginBottom:16}}>
          <button onClick={()=>setMoisIdx(i=>Math.min(i+1,6))} disabled={moisIdx>=6}
            style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e5e7eb',background:moisIdx>=6?'#f9fafb':'#fff',cursor:moisIdx>=6?'not-allowed':'pointer',fontSize:18,color:moisIdx>=6?'#d1d5db':'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>
            ←
          </button>
          <div style={{textAlign:'center'}}>
            <div style={{fontWeight:800,fontSize:18,color:'#111827'}}>{mois.label}</div>
            <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{s.nbPatients} patients</div>
          </div>
          <button onClick={()=>setMoisIdx(i=>Math.max(i-1,0))} disabled={moisIdx<=0}
            style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e5e7eb',background:moisIdx<=0?'#f9fafb':'#fff',cursor:moisIdx<=0?'not-allowed':'pointer',fontSize:18,color:moisIdx<=0?'#d1d5db':'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>
            →
          </button>
        </div>

        {/* Statut impression */}
        <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12}}>
          {imprime ? (
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 14px',fontSize:13,color:'#16a34a',fontWeight:600,flex:1}}>
              ✅ Imprimé et donné à la secrétaire — par {imprime.par} le {imprime.le}
            </div>
          ) : (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 14px',fontSize:13,color:'#dc2626',fontWeight:600,flex:1}}>
              ⏳ Pas encore imprimé pour la secrétaire
            </div>
          )}
          <button onClick={marquerImprime}
            style={{padding:'9px 18px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none',flexShrink:0}}>
            🖨️ À imprimer et à donner à la secrétaire
          </button>
        </div>

        {loading && <div style={{textAlign:'center',padding:'3rem',color:'#6b7280'}}>Chargement...</div>}

        {!loading && (
          <div id="print-zone">
            {/* En-tête print */}
            <div style={{display:'none'}} className="print-only">
              <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>CMR Kahani — Statistiques — {mois.label}</div>
              <div style={{fontSize:12,color:'#6b7280',marginBottom:12}}>{s.nbPatients} patients — Généré le {dateStr}{imprime?` — Imprimé par ${imprime.par}`:''}</div>
            </div>

            <div style={{background:'#0d9488',color:'#fff',padding:'10px 14px',borderRadius:'8px 8px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:800,fontSize:15}}>CMR Kahani — {mois.label}</span>
              <span style={{fontWeight:800,fontSize:22}}>{s.nbPatients} patients</span>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',background:'#fff',border:'1px solid #e5e7eb',borderTop:'none',marginBottom:16}}>
              <tbody>
                <Sec titre="🔬 Biologie / Point of care" color="#f59e0b">
                  <L l="Dextro" v={s.nbDextro}/><L l="Hémocue" v={s.nbHemocue}/><L l="Cétonémie" v={s.nbCetonem}/>
                  <L l="CRP test" v={s.nbCRP}/><L l="TDR Paludisme" v={s.nbTdrPalu}/><L l="TDR Dengue" v={s.nbTdrDengue}/>
                  <L l="Tétanotop" v={s.nbTetanos}/><L l="BU" v={s.nbBU}/><L l="bHCG urinaire" v={s.nbBhcg}/>
                  <L l="Urine (recueil)" v={s.nbUrine}/><L l="ECBU" v={s.nbECBU}/><L l="Hémoculture" v={s.nbHemocult}/>
                  <L l="Coproculture" v={s.nbCoprocult}/><L l="Bio délocalisée" v={s.nbBioDeloc}/>
                  <L l="Gaz du sang" v={s.nbGazSang}/><L l="Prélèvement Mamoudzou" v={s.nbPrelevMam}/>
                </Sec>
                <Sec titre="🩺 Actes infirmiers" color="#3b82f6">
                  <L l="ECG" v={s.nbECG}/><L l="VVP" v={s.nbVVP}/><L l="IV" v={s.nbIV}/><L l="IM" v={s.nbIM}/>
                  <L l="SC" v={s.nbSC}/><L l="O2" v={s.nbO2}/><L l="Aérosol" v={s.nbAerosol}/><L l="MEOPA" v={s.nbMeopa}/>
                  <L l="DRP" v={s.nbDRP}/><L l="Éducation DRP" v={s.nbEducDRP}/><L l="Sonde urinaire" v={s.nbSondeU}/>
                  <L l="Reprise constantes" v={s.nbSurveillance}/><L l="Éducation asthme" v={s.nbEducAsthme}/>
                </Sec>
                <Sec titre="✂️ Sutures / Pansements" color="#dc2626">
                  <L l="Suture ≥ 5 pts" v={s.nbSutSup5}/><L l="Suture < 5 pts" v={s.nbSutInf5}/>
                  <L l="Suture colle" v={s.nbSutColle}/><L l="Suture agrafes" v={s.nbSutAgraf}/><L l="Steri-strip" v={s.nbSutSteri}/>
                  <L l="Pansement simple" v={s.nbPSTSimple}/><L l="Pansement complexe" v={s.nbPSTCompl}/><L l="Lavage CAE" v={s.nbLavCAE}/>
                </Sec>
                <Sec titre="💉 Autres actes" color="#7c3aed">
                  <L l="Vaccin" v={s.nbVaccin}/><L l="Pose implant" v={s.nbPoseImpl}/><L l="Retrait implant" v={s.nbRetrImpl}/>
                  <L l="Transfert Hellico" v={s.nbTransfHellico}/><L l="Transfert MDZ" v={s.nbTransfMDZ}/>
                  <L l="Consultations" v={s.nbPatients}/>
                </Sec>
                {s.ordoSecurisees.length > 0 && (
                  <Sec titre={`🔴 Ordonnances sécurisées (${s.ordoSecurisees.length})`} color="#dc2626">
                    {s.ordoSecurisees.map((r,i)=>(
                      <tr key={i}><td colSpan={2} style={{padding:'5px 12px',fontSize:12,color:'#374151',borderBottom:'1px solid #fef2f2'}}>{r.texte} <span style={{color:'#9ca3af'}}>— {r.faitPar||''}</span></td></tr>
                    ))}
                  </Sec>
                )}
              </tbody>
            </table>
            <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',padding:'4px'}}>
              CMR Kahani PDS v1.0 — {dateStr}{imprime?` — Imprimé par ${imprime.par}`:''}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          #print-zone { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
