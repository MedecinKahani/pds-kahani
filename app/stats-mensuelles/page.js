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

function calcStatsPerm(patients, hDebut, hFin) {
  return patients.filter(p => {
    const h = new Date(parseInt(p.arrivee)).getHours();
    return h >= hDebut && h < hFin;
  }).length;
}

function calcStats(patients) {
  const toutesRx = patients.flatMap(p => safeJSON(p.prescriptions, []).filter(r => r.fait));
  function countRx(needle) {
    return toutesRx.filter(r => (r.texte||'').toLowerCase().includes(needle.toLowerCase())).length;
  }
  function countSuture(id) {
    return patients.filter(p => safeJSON(p.sutures, []).includes(id)).length;
  }
  // Sorties
  const sortis = patients.filter(p => p.statut === 'sorti');
  function countSortie(modalite) {
    return sortis.filter(p => p.modalite_sortie === modalite).length;
  }
  return {
    nbPatients: patients.length,
    // Bio
    nbDextro: patients.filter(p=>p.dextro).length + countRx('dextro'),
    nbHemocue: patients.filter(p=>p.hemocue).length + countRx('hémocue'),
    nbCetonem: countRx('cétonémie'),
    nbCRP: patients.filter(p=>p.crp_test).length + countRx('crp'),
    nbTdrPalu: patients.filter(p=>p.tdr_palu).length + countRx('paludisme'),
    nbTdrDengue: patients.filter(p=>p.tdr_dengue).length + countRx('dengue'),
    nbTetanos: patients.filter(p=>p.quicktest).length + countRx('tétanotop'),
    nbBU: patients.filter(p=>p.bu_fait).length + countRx('bu'),
    nbBhcg: patients.filter(p=>p.bhcg_fait).length + countRx('bhcg'),
    nbECBU: countRx('ecbu'),
    nbHemocult: countRx('hémoculture'),
    nbCoprocult: countRx('coproculture'),
    nbBioDeloc: toutesRx.filter(r=>r.texte?.includes('Bio délocalisée')).length,
    nbGazSang: countRx('gaz du sang'),
    nbPrelevMam: toutesRx.filter(r=>r.texte?.includes('Mamoudzou')).length,
    // Actes infirmiers
    nbECG: patients.filter(p=>p.ecg_fait).length + countRx('ecg'),
    nbVVP: countRx('vvp'),
    nbIV: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' IV')).length,
    nbIM: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' IM')).length,
    nbSC: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' SC')).length,
    nbO2: countRx('o2'),
    nbAerosol: countRx('érosol'),
    nbMeopa: countRx('meopa'),
    nbDRP: patients.filter(p=>p.drp).length + countRx('drp'),
    nbSondeUPose: countRx('pose sonde'),
    nbSondeURetrait: countRx('retrait sonde'),
    nbSurveillance: countRx('reprise constantes'),
    nbEducAsthme: countRx('ducation asthme'),
    // Sutures / Pansements
    nbSutSup5: countSuture('sut_sup5'),
    nbSutInf5: countSuture('sut_inf5'),
    nbSutColle: countSuture('sut_colle'),
    nbSutAgraf: countSuture('sut_agraf'),
    nbSutSteri: countSuture('sut_steri'),
    nbAbces: countSuture('abces'),
    nbAbces: countRx('ablation abcès'),
    nbPSTSimple: countRx('pansement simple'),
    nbPSTCompl: countRx('pansement complexe'),
    nbLavCAE: countRx('lavage cae'),
    // Autres
    nbVaccin: countRx('vaccin'),
    nbPoseImpl: countRx('pose implant'),
    nbRetrImpl: countRx('retrait implant'),
    // Sorties
    nbDomicile: countSortie('domicile'),
    nbTransfMDZ: countSortie('transfert') + toutesRx.filter(r=>r.texte?.toLowerCase().includes('mamoudzou')).length,
    nbTransfHellico: toutesRx.filter(r=>r.texte?.toLowerCase().includes('hellico')).length,
    nbGAV: countSortie('gav'),
    nbDeces: countSortie('deces'),
    // Ordonnances sécurisées
    ordoSecurisees: toutesRx.filter(r=>{const t=r.texte||'';return t.includes('Tramadol')||t.includes('Morphine')||t.includes('MEOPA')||t.includes('Kétoprofène');}),
    // Par motif
    parMotif: ['coma','avc','detresse_respi','plaie','fievre','vertige','douleur','soins_ide','autre'].reduce((acc,m)=>{
      acc[m]=patients.filter(p=>p.symptome===m).length;return acc;},{})
  };
}

function L({ l, v }) {
  return (
    <tr style={{borderBottom:'1px solid #f9fafb'}}>
      <td style={{padding:'5px 12px',fontSize:12,color:'#374151'}}>{l}</td>
      <td style={{padding:'5px 12px',fontSize:13,fontWeight:700,color:v>0?'#111827':'#d1d5db',textAlign:'right'}}>{v}</td>
    </tr>
  );
}

function Sec({ titre, color, children }) {
  return <>
    <tr><td colSpan={2} style={{padding:'5px 12px',background:color+'18',fontSize:10,fontWeight:700,color,textTransform:'uppercase',letterSpacing:0.5}}>{titre}</td></tr>
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
  const [onglet, setOnglet] = useState('passages');
  // Onglet passages
  const [jourOffset, setJourOffset] = useState(0); // 0 = aujourd'hui, -1 = hier...
  const moisOptions = getMoisOptions();

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    setUser(u);
    if (u.role === 'secretaire') setOnglet('passages');
    charger();
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

  // ── ONGLET PASSAGES ──
  const jourCible = new Date();
  jourCible.setDate(jourCible.getDate() + jourOffset);
  const jourLabel = jourCible.toLocaleDateString('fr-FR', {weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const debutJour = new Date(jourCible.getFullYear(), jourCible.getMonth(), jourCible.getDate()).getTime();
  const finJour   = debutJour + 86400000 - 1;

  const patientsJour = allPatients.filter(p => {
    const t = parseInt(p.arrivee);
    return t >= debutJour && t <= finJour;
  });

  function countCreneau(hDebut, hFin) {
    return patientsJour.filter(p => {
      const d = new Date(parseInt(p.arrivee));
      const h = d.getHours();
      return h >= hDebut && h < hFin;
    }).length;
  }

  const c00_07 = countCreneau(0, 7);
  const c07_19 = countCreneau(7, 19);
  const c19_24 = countCreneau(19, 24);

  // ── ONGLET ACTES ──
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

  const btnStyle = (active) => ({
    padding:'8px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13,
    fontWeight: active ? 700 : 500,
    color: active ? '#0d9488' : '#6b7280',
    borderBottom: active ? '2px solid #0d9488' : '2px solid transparent',
  });

  return (
    <div style={{fontFamily:'system-ui',background:'#f3f4f6',minHeight:'100vh'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}} className="no-print">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.back()} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>← Retour</button>
          <span style={{fontWeight:700,fontSize:15,color:'#111827'}}>Statistiques</span>
        </div>
        <div style={{display:'flex',borderBottom:'none'}}>
          <button style={btnStyle(onglet==='passages')} onClick={()=>setOnglet('passages')}>Passages du jour</button>
          <button style={btnStyle(onglet==='actes')} onClick={()=>setOnglet('actes')}>Actes du mois</button>
          <button style={btnStyle(onglet==='tableau')} onClick={()=>setOnglet('tableau')}>Tableau secrétaire</button>
        </div>
      </nav>

      <div style={{maxWidth:720,margin:'2rem auto',padding:'0 1rem'}}>

        {loading && <div style={{textAlign:'center',padding:'3rem',color:'#6b7280'}}>Chargement...</div>}

        {/* ── ONGLET PASSAGES ── */}
        {!loading && onglet==='passages' && (
          <div>
            {/* Navigation jour */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'14px 20px',marginBottom:16}}>
              <button onClick={()=>setJourOffset(j=>j-1)}
                style={{width:38,height:38,borderRadius:'50%',border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:20,color:'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>
                ←
              </button>
              <div style={{textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:16,color:'#111827',textTransform:'capitalize'}}>{jourLabel}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{patientsJour.length} passage{patientsJour.length>1?'s':''} au total</div>
              </div>
              <button onClick={()=>setJourOffset(j=>Math.min(j+1,0))} disabled={jourOffset>=0}
                style={{width:38,height:38,borderRadius:'50%',border:'1px solid #e5e7eb',background:jourOffset>=0?'#f9fafb':'#fff',cursor:jourOffset>=0?'not-allowed':'pointer',fontSize:20,color:jourOffset>=0?'#d1d5db':'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>
                →
              </button>
            </div>

            {/* Tableau créneaux */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden',marginBottom:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',textAlign:'center'}}>
                {[['00h — 07h',c00_07,'#7c3aed'],['07h — 19h',c07_19,'#0d9488'],['19h — 00h',c19_24,'#ea580c']].map(([label,count,color])=>(
                  <div key={label} style={{padding:'20px 16px',borderRight:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:8}}>{label}</div>
                    <div style={{fontSize:48,fontWeight:800,color:count>0?color:'#e5e7eb',lineHeight:1}}>{count}</div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>passage{count>1?'s':''}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#f9fafb',padding:'10px 20px',borderTop:'1px solid #e5e7eb',display:'flex',justifyContent:'center'}}>
                <div style={{fontSize:13,color:'#374151',fontWeight:600}}>Total : <span style={{fontSize:18,fontWeight:800,color:'#111827'}}>{patientsJour.length}</span></div>
              </div>
            </div>

            {/* Détail par motif */}
            {patientsJour.length>0&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 16px'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',marginBottom:8}}>Détail par motif</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {Object.entries({
                    'Coma':patientsJour.filter(p=>p.symptome==='coma').length,
                    'AVC':patientsJour.filter(p=>p.symptome==='avc').length,
                    'Détresse respi':patientsJour.filter(p=>p.symptome==='detresse_respi').length,
                    'Plaie':patientsJour.filter(p=>p.symptome==='plaie').length,
                    'Fièvre':patientsJour.filter(p=>p.symptome==='fievre').length,
                    'Vertige':patientsJour.filter(p=>p.symptome==='vertige').length,
                    'Douleur':patientsJour.filter(p=>p.symptome==='douleur').length,
                    'Soins IDE':patientsJour.filter(p=>p.symptome==='soins_ide').length,
                    'Autre':patientsJour.filter(p=>p.symptome==='autre'||!p.symptome).length,
                  }).filter(([,v])=>v>0).map(([l,v])=>(
                    <div key={l} style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:8,padding:'4px 10px',fontSize:12}}>
                      <span style={{fontWeight:700,color:'#0d9488'}}>{v}</span> <span style={{color:'#374151'}}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET ACTES ── */}
        {!loading && onglet==='actes' && (
          <div>
            {/* Navigation mois */}
            <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 16px',marginBottom:12}}>
              <button onClick={()=>setMoisIdx(i=>Math.min(i+1,6))} disabled={moisIdx>=6}
                style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e5e7eb',background:moisIdx>=6?'#f9fafb':'#fff',cursor:moisIdx>=6?'not-allowed':'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:moisIdx>=6?'#d1d5db':'#374151'}}>←</button>
              <div style={{textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:18,color:'#111827'}}>{mois.label}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{s.nbPatients} patients</div>
              </div>
              <button onClick={()=>setMoisIdx(i=>Math.max(i-1,0))} disabled={moisIdx<=0}
                style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e5e7eb',background:moisIdx<=0?'#f9fafb':'#fff',cursor:moisIdx<=0?'not-allowed':'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:moisIdx<=0?'#d1d5db':'#374151'}}>→</button>
            </div>

            <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,gap:10}}>
              {imprime
                ? <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#16a34a',fontWeight:600,flex:1}}>✅ Imprimé par {imprime.par} le {imprime.le}</div>
                : <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#dc2626',fontWeight:600,flex:1}}>⏳ Pas encore imprimé</div>
              }
              <button onClick={marquerImprime} style={{padding:'9px 18px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none',flexShrink:0}}>
                🖨️ Imprimer
              </button>
            </div>

            <div id="print-zone">
              <div style={{display:'none'}} className="print-only">
                <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>CMR Kahani — {mois.label}</div>
                <div style={{fontSize:12,color:'#6b7280',marginBottom:12}}>{s.nbPatients} patients — {dateStr}</div>
              </div>
              <div style={{background:'#0d9488',color:'#fff',padding:'10px 14px',borderRadius:'8px 8px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontWeight:800,fontSize:15}}>CMR Kahani — {mois.label}</span>
                <span style={{fontWeight:800,fontSize:22}}>{s.nbPatients} patients</span>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',background:'#fff',border:'1px solid #e5e7eb',borderTop:'none',marginBottom:12}}>
                <tbody>
                  <Sec titre="🔬 Biologie / Point of care" color="#f59e0b">
                    <L l="Dextro" v={s.nbDextro}/><L l="Hémocue" v={s.nbHemocue}/><L l="Cétonémie" v={s.nbCetonem}/>
                    <L l="CRP rapide" v={s.nbCRP}/><L l="TDR Paludisme" v={s.nbTdrPalu}/><L l="TDR Dengue" v={s.nbTdrDengue}/>
                    <L l="Tétanotop" v={s.nbTetanos}/><L l="BU" v={s.nbBU}/><L l="bHCG urinaire" v={s.nbBhcg}/>
                    <L l="ECBU" v={s.nbECBU}/><L l="Hémoculture" v={s.nbHemocult}/><L l="Coproculture" v={s.nbCoprocult}/>
                    <L l="Bio délocalisée" v={s.nbBioDeloc}/><L l="Gaz du sang" v={s.nbGazSang}/><L l="Prélèvement Mamoudzou" v={s.nbPrelevMam}/>
                  </Sec>
                  <Sec titre="🩺 Actes infirmiers" color="#3b82f6">
                    <L l="ECG" v={s.nbECG}/><L l="VVP" v={s.nbVVP}/><L l="IV" v={s.nbIV}/><L l="IM" v={s.nbIM}/>
                    <L l="SC" v={s.nbSC}/><L l="O2" v={s.nbO2}/><L l="Aérosol" v={s.nbAerosol}/><L l="MEOPA" v={s.nbMeopa}/>
                    <L l="DRP" v={s.nbDRP}/><L l="Pose sonde urinaire" v={s.nbSondeUPose}/><L l="Retrait sonde urinaire" v={s.nbSondeURetrait}/>
                    <L l="Reprise constantes" v={s.nbSurveillance}/><L l="Éducation asthme" v={s.nbEducAsthme}/>
                  </Sec>
                  <Sec titre="✂️ Sutures / Pansements / Actes" color="#dc2626">
                    <L l="Suture ≥ 5 pts" v={s.nbSutSup5}/><L l="Suture < 5 pts" v={s.nbSutInf5}/>
                    <L l="Suture colle" v={s.nbSutColle}/><L l="Suture agrafes" v={s.nbSutAgraf}/><L l="Steri-strip" v={s.nbSutSteri}/>
                    <L l="Ablation abcès" v={s.nbAbces}/>
                    <L l="Pansement simple" v={s.nbPSTSimple}/><L l="Pansement complexe" v={s.nbPSTCompl}/><L l="Lavage CAE" v={s.nbLavCAE}/>
                  </Sec>
                  <Sec titre="💉 Autres actes" color="#7c3aed">
                    <L l="Vaccin" v={s.nbVaccin}/><L l="Pose implant" v={s.nbPoseImpl}/><L l="Retrait implant" v={s.nbRetrImpl}/>
                  </Sec>
                  <Sec titre="🚪 Sorties" color="#6b7280">
                    <L l="Retour à domicile" v={s.nbDomicile}/><L l="Transfert Mamoudzou" v={s.nbTransfMDZ}/>
                    <L l="Transfert hélicoptère" v={s.nbTransfHellico}/><L l="GAV — Réquisition" v={s.nbGAV}/>
                    <L l="Décès" v={s.nbDeces}/>
                  </Sec>
                  {s.ordoSecurisees.length > 0 && (
                    <Sec titre={`🔴 Ordonnances sécurisées (${s.ordoSecurisees.length})`} color="#dc2626">
                      {s.ordoSecurisees.map((r,i)=>(
                        <tr key={i}><td colSpan={2} style={{padding:'4px 12px',fontSize:11,color:'#374151',borderBottom:'1px solid #fef2f2'}}>{r.texte} <span style={{color:'#9ca3af'}}>— {r.faitPar||''}</span></td></tr>
                      ))}
                    </Sec>
                  )}
                </tbody>
              </table>
              <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',padding:'4px'}}>
                CMR Kahani PDS — {dateStr}
              </div>
            </div>
          </div>
        )}

        {/* ── ONGLET TABLEAU SECRÉTAIRE ── */}
        {!loading && onglet==='tableau' && (
          <div>
            {/* Navigation mois */}
            <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 16px',marginBottom:12}}>
              <button onClick={()=>setMoisIdx(i=>Math.min(i+1,6))} disabled={moisIdx>=6}
                style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e5e7eb',background:moisIdx>=6?'#f9fafb':'#fff',cursor:moisIdx>=6?'not-allowed':'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:moisIdx>=6?'#d1d5db':'#374151'}}>←</button>
              <div style={{textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:18,color:'#111827'}}>{mois.label}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{s.nbPatients} patients</div>
              </div>
              <button onClick={()=>setMoisIdx(i=>Math.max(i-1,0))} disabled={moisIdx<=0}
                style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e5e7eb',background:moisIdx<=0?'#f9fafb':'#fff',cursor:moisIdx<=0?'not-allowed':'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:moisIdx<=0?'#d1d5db':'#374151'}}>→</button>
            </div>
            <div className="no-print" style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
              <button onClick={()=>window.print()} style={{padding:'9px 18px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}>
                🖨️ Imprimer
              </button>
            </div>

            <div id="print-zone-sec" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
              {/* En-tête */}
              <div style={{background:'#374151',color:'#fff',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontWeight:800,fontSize:14}}>CMR Kahani — Tableau mensuel</span>
                <span style={{fontWeight:700,fontSize:14}}>{mois.label}</span>
              </div>

              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <tbody>

                  {/* ── SECTION IDE / AS ── */}
                  <tr style={{background:'#dbeafe'}}>
                    <td rowSpan={3} style={{padding:'6px 10px',fontWeight:700,color:'#1e40af',fontSize:11,textTransform:'uppercase',textAlign:'center',border:'1px solid #bfdbfe',width:60,writingMode:'vertical-rl',transform:'rotate(180deg)'}}>IDE / AS</td>
                    <td style={{padding:'6px 12px',border:'1px solid #bfdbfe',color:'#374151'}}>Nombre de passages AS</td>
                    <td style={{padding:'6px 12px',border:'1px solid #bfdbfe',fontWeight:700,textAlign:'center',width:80}}>{s.parMotif ? '' : ''}</td>
                  </tr>
                  <tr style={{background:'#eff6ff'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #bfdbfe',color:'#374151'}}>Nombre de passages IDE</td>
                    <td style={{padding:'6px 12px',border:'1px solid #bfdbfe',fontWeight:700,textAlign:'center'}}></td>
                  </tr>
                  <tr style={{background:'#dbeafe'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #bfdbfe',color:'#374151',fontWeight:600}}>TOTAL passages IDE/AS</td>
                    <td style={{padding:'6px 12px',border:'1px solid #bfdbfe',fontWeight:800,textAlign:'center',color:'#1e40af'}}>{s.nbPatients}</td>
                  </tr>

                  {/* ── SECTION PERM ── */}
                  <tr style={{background:'#fef3c7'}}>
                    <td rowSpan={5} style={{padding:'6px 10px',fontWeight:700,color:'#92400e',fontSize:11,textTransform:'uppercase',textAlign:'center',border:'1px solid #fde68a',writingMode:'vertical-rl',transform:'rotate(180deg)'}}>PERM</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',color:'#374151'}}>Nb passages perm 07h00 à 17h00</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:700,textAlign:'center'}}>{calcStatsPerm(patientsduMois,7,17)}</td>
                  </tr>
                  <tr style={{background:'#fffbeb'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',color:'#374151'}}>Nb passages perm 17h00 à 00h00</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:700,textAlign:'center'}}>{calcStatsPerm(patientsduMois,17,24)}</td>
                  </tr>
                  <tr style={{background:'#fef3c7'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',color:'#374151'}}>Nb passages perm 00h00 à 07h00</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:700,textAlign:'center'}}>{calcStatsPerm(patientsduMois,0,7)}</td>
                  </tr>
                  <tr style={{background:'#fffbeb'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',color:'#374151'}}>Nb total passages perm</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:800,textAlign:'center',color:'#92400e'}}>{s.nbPatients}</td>
                  </tr>

                  {/* ── SECTION MÉDECINS ── */}
                  <tr style={{background:'#f3f4f6'}}>
                    <td colSpan={2} style={{padding:'5px 12px',fontWeight:700,color:'#374151',fontSize:10,textTransform:'uppercase',letterSpacing:0.5,border:'1px solid #e5e7eb'}}>MÉDECINS</td>
                  </tr>
                  {[
                    ['Nombre de consultations', s.nbPatients],
                    ['', ''],
                    ['Sutures', s.nbSutSup5+s.nbSutInf5+s.nbSutColle+s.nbSutAgraf+s.nbSutSteri],
                    ['  — Suture ≥ 5 pts', s.nbSutSup5],
                    ['  — Suture < 5 pts', s.nbSutInf5],
                    ['  — Suture colle', s.nbSutColle],
                    ['  — Agrafes', s.nbSutAgraf],
                    ['  — Steri-strip', s.nbSutSteri],
                    ['Ablation abcès', s.nbAbces],
                    ['Implants — Pose', s.nbPoseImpl],
                    ['Implants — Retrait', s.nbRetrImpl],
                    ['Vaccins', s.nbVaccin],
                    ['Sonde urinaire — Pose', s.nbSondeUPose],
                    ['Sonde urinaire — Retrait', s.nbSondeURetrait],
                  ].map(([l,v],i)=>(
                    <tr key={i} style={{background:i%2===0?'#fff':'#f9fafb'}}>
                      <td style={{padding:'5px 12px',border:'1px solid #e5e7eb',color:'#374151',paddingLeft:l.startsWith('  ')?24:12}}>{l||' '}</td>
                      <td style={{padding:'5px 12px',border:'1px solid #e5e7eb',fontWeight:700,textAlign:'center',color:v>0?'#111827':'#d1d5db'}}>{v===''?' ':v}</td>
                    </tr>
                  ))}

                  {/* Sorties */}
                  <tr style={{background:'#f3f4f6'}}>
                    <td colSpan={2} style={{padding:'5px 12px',fontWeight:700,color:'#374151',fontSize:10,textTransform:'uppercase',letterSpacing:0.5,border:'1px solid #e5e7eb'}}>SORTIES</td>
                  </tr>
                  {[
                    ['Retour à domicile', s.nbDomicile],
                    ['Transfert Mamoudzou', s.nbTransfMDZ],
                    ['Transfert hélicoptère (SAMU)', s.nbTransfHellico],
                    ['GAV — Réquisition', s.nbGAV],
                    ['Constat (décès)', s.nbDeces],
                  ].map(([l,v],i)=>(
                    <tr key={i} style={{background:i%2===0?'#fff':'#f9fafb'}}>
                      <td style={{padding:'5px 12px',border:'1px solid #e5e7eb',color:'#374151'}}>{l}</td>
                      <td style={{padding:'5px 12px',border:'1px solid #e5e7eb',fontWeight:700,textAlign:'center',color:v>0?'#111827':'#d1d5db'}}>{v}</td>
                    </tr>
                  ))}

                </tbody>
              </table>

              <div style={{padding:'6px 12px',fontSize:10,color:'#9ca3af',borderTop:'1px solid #e5e7eb',textAlign:'right'}}>
                CMR Kahani PDS — Généré le {dateStr}
              </div>
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
