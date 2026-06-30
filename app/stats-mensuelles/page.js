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

const LISTE_ACTES = [
  'Dextro','Hémocue','Test optimal','BU','T grossesse U','Tétanotop','Actim CRP','Bilan sanguin',
  'ECBU','Coprocultures','Sonde urinaire','VVP','IV','IM','Autres vaccins','Vaccins COVID-19','SC',
  'DRP','Oxygène','Tensiomètre','ECG','MEOPA','Lavage CAE','Pansements simple','Pansements complexe',
  'Surveillance','Éducation','Aérosol','Gaz de sang','Décès sur site',
  '§Sutures et actes annexes',
  'Suture ≥5 pts','Suture <5 pts','Suture colle','Suture agrafes','Steri-strip','Ablation abcès',
  'Pose implant','Retrait implant','Hémoculture','Prélèvement Mamoudzou',
  '§Sorties',
  'Transfert Urgence','Transfert SMUR','Urgence moyen propre','Maternité','Retour à domicile','Parti sans attendre','GAV — Réquisition',
];

const ACTES_KEYS = [
  'nbDextro','nbHemocue','nbTestOptimal','nbBU','nbTGrossesse','nbTetanotop','nbActimCRP','nbBilanSanguin',
  'nbECBU','nbCoprocultures','nbSondeUrinaire','nbVVP','nbIV','nbIM','nbAutresVaccins','nbVaccinsCovid','nbSC',
  'nbDRP','nbOxygene','nbTensiometre','nbECG','nbMEOPA','nbLavageCAE','nbPansementSimple','nbPansementComplexe',
  'nbSurveillance','nbEducation','nbAerosol','nbGazSang','nbDecesSurSite',
  null,
  'nbSutSup5','nbSutInf5','nbSutColle','nbSutAgraf','nbSutSteri','nbAbces',
  'nbPoseImpl','nbRetrImpl','nbHemocult','nbPrelevMam',
  null,
  'nbTransfertUrgence','nbTransfertSMUR','nbUrgenceMoyenPropre','nbMaternite','nbRetourDomicile','nbPartiSansAttendre','nbGAV',
];

function calcStats(patients) {
  const toutesRx = patients.flatMap(p => safeJSON(p.prescriptions, []).filter(r => r.fait));
  function countRx(needle) {
    return toutesRx.filter(r => (r.texte||'').toLowerCase().includes(needle.toLowerCase())).length;
  }
  function countSuture(id) {
    return patients.filter(p => safeJSON(p.sutures, []).includes(id)).length;
  }
  const sortis = patients.filter(p => p.statut === 'sorti');
  function countSortie(modalite) {
    return sortis.filter(p => p.modalite_sortie === modalite).length;
  }
  return {
    nbPatients: patients.length,
    // ── Ordre exact liste secrétaire (photo 1) ──
    nbDextro: patients.filter(p=>p.dextro).length + countRx('dextro'),
    nbHemocue: patients.filter(p=>p.hemocue).length + countRx('hémocue'),
    nbTestOptimal: countRx('test optimal'),
    nbBU: patients.filter(p=>p.bu_fait).length + countRx(' bu'),
    nbTGrossesse: patients.filter(p=>p.bhcg_fait).length + countRx('grossesse'),
    nbTetanotop: patients.filter(p=>p.quicktest).length + countRx('tétanotop'),
    nbActimCRP: patients.filter(p=>p.crp_test).length + countRx('crp'),
    nbBilanSanguin: countRx('bilan sanguin') + countRx('bio délocalisée'),
    nbECBU: countRx('ecbu'),
    nbCoprocultures: countRx('coproculture'),
    nbSondeUrinaire: countRx('sonde urinaire'),
    nbVVP: countRx('vvp'),
    nbIV: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' IV')).length,
    nbIM: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' IM')).length,
    nbAutresVaccins: countRx('vaccin')-countRx('covid'),
    nbVaccinsCovid: countRx('covid'),
    nbSC: toutesRx.filter(r=>r.categorie==='therapeutique'&&r.texte?.includes(' SC')).length,
    nbDRP: patients.filter(p=>p.drp).length + countRx('drp'),
    nbOxygene: countRx('o2 '),
    nbTensiometre: countRx('tensiomètre'),
    nbECG: patients.filter(p=>p.ecg_fait).length + countRx('ecg'),
    nbMEOPA: countRx('meopa'),
    nbLavageCAE: countRx('lavage cae'),
    nbPansementSimple: countRx('pansement simple'),
    nbPansementComplexe: countRx('pansement complexe'),
    nbSurveillance: countRx('reprise constantes'),
    nbEducation: countRx('ducation'),
    nbAerosol: countRx('érosol'),
    nbGazSang: countRx('gaz du sang'),
    nbDecesSurSite: countSortie('deces'),
    // ── Sutures / actes annexes ──
    nbSutSup5: countSuture('sut_sup5'),
    nbSutInf5: countSuture('sut_inf5'),
    nbSutColle: countSuture('sut_colle'),
    nbSutAgraf: countSuture('sut_agraf'),
    nbSutSteri: countSuture('sut_steri'),
    nbAbces: countRx('ablation abcès'),
    nbPoseImpl: countRx('pose implant'),
    nbRetrImpl: countRx('retrait implant'),
    nbHemocult: countRx('hémoculture'),
    nbPrelevMam: toutesRx.filter(r=>r.texte?.includes('Mamoudzou')).length,
    // ── Sorties (photo 2) ──
    nbTransfertUrgence: countSortie('transfert'),
    nbTransfertSMUR: toutesRx.filter(r=>r.texte?.toLowerCase().includes('hellico')||r.texte?.toLowerCase().includes('smur')).length,
    nbUrgenceMoyenPropre: sortis.filter(p=>p.modalite_sortie==='transfert'&&p.moyen_transport==='propre').length,
    nbMaternite: countRx('maternité'),
    nbRetourDomicile: countSortie('domicile'),
    nbPartiSansAttendre: countSortie('pse'),
    nbGAV: countSortie('gav'),
    // Ordonnances sécurisées
    ordoSecurisees: toutesRx.filter(r=>{const t=r.texte||'';return t.includes('Tramadol')||t.includes('Morphine')||t.includes('MEOPA')||t.includes('Kétoprofène');}),
    // Par motif
    parMotif: ['coma','avc','detresse_respi','plaie','fievre','vertige','douleur','soins_ide','autre'].reduce((acc,m)=>{
      acc[m]=patients.filter(p=>p.symptome===m).length;return acc;},{}),
    // Enregistrement / consultation (onglet 3)
    nbEnregistresParAS: patients.filter(p=>p.creePar).length,
    nbPartiSansAttendreT3: countSortie('pse'),
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
  const jourSemaine = jourCible.getDay(); // 0=dimanche, 6=samedi

  const patientsJour = allPatients.filter(p => {
    const t = parseInt(p.arrivee);
    return t >= debutJour && t <= finJour;
  });

  function countCreneau(hDebut, hFin) {
    return patientsJour.filter(p => {
      const d = new Date(parseInt(p.arrivee));
      const h = d.getHours();
      if (hDebut <= hFin) return h >= hDebut && h < hFin;
      return h >= hDebut || h < hFin; // créneau qui traverse minuit
    }).length;
  }

  // Créneaux selon jour : semaine = 4 créneaux, samedi = 2, dimanche = 1
  let creneaux;
  if (jourSemaine === 6) { // samedi
    creneaux = [
      ['00h — 13h', countCreneau(0,13), '#7c3aed'],
      ['13h — 07h (dim.)', countCreneau(13,7), '#ea580c'],
    ];
  } else if (jourSemaine === 0) { // dimanche
    creneaux = [
      ['07h — 07h (lun.)', countCreneau(7,7), '#0d9488'],
    ];
  } else { // semaine
    creneaux = [
      ['00h — 07h', countCreneau(0,7), '#7c3aed'],
      ['07h — 17h', countCreneau(7,17), '#0d9488'],
      ['17h — 00h', countCreneau(17,24), '#ea580c'],
      ['22h — 07h', countCreneau(22,7), '#dc2626'],
    ];
  }

  const nbTransfertsJour = patientsJour.filter(p => p.statut==='sorti' && p.modalite_sortie==='transfert').length;

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
              <div style={{display:'grid',gridTemplateColumns:`repeat(${creneaux.length},1fr)`,textAlign:'center'}}>
                {creneaux.map(([label,count,color])=>(
                  <div key={label} style={{padding:'20px 12px',borderRight:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:8}}>{label}</div>
                    <div style={{fontSize:42,fontWeight:800,color:count>0?color:'#e5e7eb',lineHeight:1}}>{count}</div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>passage{count>1?'s':''}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#f9fafb',padding:'10px 20px',borderTop:'1px solid #e5e7eb',display:'flex',justifyContent:'center'}}>
                <div style={{fontSize:13,color:'#374151',fontWeight:600}}>Total : <span style={{fontSize:18,fontWeight:800,color:'#111827'}}>{patientsJour.length}</span></div>
              </div>
            </div>

            {/* Transferts Mamoudzou du jour */}
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#9a3412'}}>🚑 Transferts vers Mamoudzou</div>
              <div style={{fontSize:28,fontWeight:800,color:'#ea580c'}}>{nbTransfertsJour}</div>
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
              <button onClick={()=>{
                const lignes = LISTE_ACTES.map((l,i)=>{
                  if (l.startsWith('§')) return '';
                  const k = ACTES_KEYS[i];
                  return String(s[k] ?? 0);
                });
                navigator.clipboard.writeText(lignes.join('\n'));
              }} style={{padding:'9px 14px',borderRadius:8,background:'#374151',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',flexShrink:0}}>
                📋 Copier colonne
              </button>
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
                  {LISTE_ACTES.map((label,i)=>{
                    if (label.startsWith('§')) return (
                      <tr key={i}><td colSpan={2} style={{padding:'5px 12px',background:'#37415118',fontSize:10,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:0.5}}>{label.slice(1)}</td></tr>
                    );
                    const v = s[ACTES_KEYS[i]] ?? 0;
                    return <L key={i} l={label} v={v}/>;
                  })}
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

                  {/* ── ENREGISTREMENT vs CONSULTATION ── */}
                  <tr style={{background:'#f3f4f6'}}>
                    <td colSpan={3} style={{padding:'5px 12px',fontWeight:700,color:'#374151',fontSize:10,textTransform:'uppercase',letterSpacing:0.5,border:'1px solid #e5e7eb'}}>Passages PDS</td>
                  </tr>
                  <tr style={{background:'#fff'}}>
                    <td colSpan={2} style={{padding:'6px 12px',border:'1px solid #e5e7eb',color:'#374151'}}>Nombre de patients enregistrés (AS)</td>
                    <td style={{padding:'6px 12px',border:'1px solid #e5e7eb',fontWeight:700,textAlign:'center'}}>{s.nbEnregistresParAS}</td>
                  </tr>
                  <tr style={{background:'#fef2f2'}}>
                    <td colSpan={2} style={{padding:'6px 12px',border:'1px solid #e5e7eb',color:'#374151'}}>Partis sans attendre</td>
                    <td style={{padding:'6px 12px',border:'1px solid #e5e7eb',fontWeight:700,textAlign:'center',color:'#dc2626'}}>{s.nbPartiSansAttendreT3}</td>
                  </tr>
                  <tr style={{background:'#f0fdf4'}}>
                    <td colSpan={2} style={{padding:'6px 12px',border:'1px solid #e5e7eb',color:'#374151',fontWeight:600}}>Patients réellement consultés (IDE/Médecin)</td>
                    <td style={{padding:'6px 12px',border:'1px solid #e5e7eb',fontWeight:800,textAlign:'center',color:'#16a34a'}}>{s.nbEnregistresParAS - s.nbPartiSansAttendreT3}</td>
                  </tr>

                  {/* ── ACTES (duplication) ── */}
                  <tr style={{background:'#f3f4f6'}}>
                    <td colSpan={3} style={{padding:'5px 12px',fontWeight:700,color:'#374151',fontSize:10,textTransform:'uppercase',letterSpacing:0.5,border:'1px solid #e5e7eb'}}>Actes réalisés</td>
                  </tr>
                  {[
                    ['Sutures (toutes confondues)', s.nbSutSup5+s.nbSutInf5+s.nbSutColle+s.nbSutAgraf+s.nbSutSteri],
                    ['Implants posés', s.nbPoseImpl],
                    ['Implants retirés', s.nbRetrImpl],
                    ['Vaccins (tous confondus)', s.nbAutresVaccins+s.nbVaccinsCovid],
                    ['Sondes urinaires posées/retirées', s.nbSondeUrinaire],
                  ].map(([l,v],i)=>(
                    <tr key={i} style={{background:i%2===0?'#fff':'#f9fafb'}}>
                      <td colSpan={2} style={{padding:'5px 12px',border:'1px solid #e5e7eb',color:'#374151'}}>{l}</td>
                      <td style={{padding:'5px 12px',border:'1px solid #e5e7eb',fontWeight:700,textAlign:'center',color:v>0?'#111827':'#d1d5db'}}>{v}</td>
                    </tr>
                  ))}

                  {/* ── TYPES DE SORTIE ── */}
                  <tr style={{background:'#f3f4f6'}}>
                    <td colSpan={3} style={{padding:'5px 12px',fontWeight:700,color:'#374151',fontSize:10,textTransform:'uppercase',letterSpacing:0.5,border:'1px solid #e5e7eb'}}>Types de sortie</td>
                  </tr>
                  {[
                    ['Retour à domicile (RAD)', s.nbRetourDomicile],
                    ['GAV — Réquisition', s.nbGAV],
                    ['Transfert Urgence', s.nbTransfertUrgence],
                    ['Transfert SMUR', s.nbTransfertSMUR],
                    ['Urgence moyen propre', s.nbUrgenceMoyenPropre],
                    ['Parti sans attendre', s.nbPartiSansAttendre],
                    ['Décès', s.nbDecesSurSite],
                  ].map(([l,v],i)=>(
                    <tr key={i} style={{background:i%2===0?'#fff':'#f9fafb'}}>
                      <td colSpan={2} style={{padding:'5px 12px',border:'1px solid #e5e7eb',color:'#374151'}}>{l}</td>
                      <td style={{padding:'5px 12px',border:'1px solid #e5e7eb',fontWeight:700,textAlign:'center',color:v>0?'#111827':'#d1d5db'}}>{v}</td>
                    </tr>
                  ))}

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
