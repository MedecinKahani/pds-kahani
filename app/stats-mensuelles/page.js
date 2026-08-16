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

function fmtLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const LISTE_ACTES = [
  'Dextro','Hémocue','Test optimal','BU','T grossesse U','Tétanotop','Actim CRP','Bilan sanguin',
  'ECBU','Coprocultures','Sonde urinaire','VVP','IV','IM','Autres vaccins','Vaccins COVID-19','SC',
  'DRP','Oxygène','Tensiomètre','ECG','MEOPA','Lavage CAE','Pansements simple','Pansements complexe',
  'Surveillance','Éducation','Aérosol','Gaz de sang','Décès sur site',
  '§Sorties',
  'Transfert Urgence','Transfert SMUR','Urgence moyen propre','Maternité','Retour à domicile',
];

const ACTES_KEYS = [
  'nbDextro','nbHemocue','nbTestOptimal','nbBU','nbTGrossesse','nbTetanotop','nbActimCRP','nbBilanSanguin',
  'nbECBU','nbCoprocultures','nbSondeUrinaire','nbVVP','nbIV','nbIM','nbAutresVaccins','nbVaccinsCovid','nbSC',
  'nbDRP','nbOxygene','nbTensiometre','nbECG','nbMEOPA','nbLavageCAE','nbPansementSimple','nbPansementComplexe',
  'nbSurveillance','nbEducation','nbAerosol','nbGazSang','nbDecesSurSite',
  null,
  'nbTransfertUrgence','nbTransfertSMUR','nbUrgenceMoyenPropre','nbMaternite','nbRetourDomicile',
];

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
  const [moisIdx, setMoisIdx] = useState(0);
  const [impressions, setImpressions] = useState({});
  const [onglet, setOnglet] = useState('journal');
  const [copieFait, setCopieFait] = useState(false);
  // Onglet passages
  const [jourOffset, setJourOffset] = useState(0); // 0 = aujourd'hui, -1 = hier...
  const moisOptions = getMoisOptions();

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    setUser(u);
    if (u.role === 'secretaire') setOnglet('journal');
    setLoading(false);
    fetch('/api/stats-alerte').then(r=>r.json()).then(d=>{
      if (d.impressions) setImpressions(d.impressions);
    });
  }, []);

  // ── Actes cliniques du mois (compteurs persistants, incrémentés à la sortie) ──
  const [compteursMois, setCompteursMois] = useState({});
  useEffect(() => {
    if (!user) return;
    fetch('/api/stats-compteurs').then(r=>r.json()).then(d=>{
      setCompteursMois(d.compteurs || {});
    }).catch(()=>{});
  }, [user]);

  // ── Bilan du mois (total, tranches horaires, sorties — journal anonyme, TTL 60j) ──
  const [bilanMois, setBilanMois] = useState(null);
  const [bilanLoading, setBilanLoading] = useState(false);
  useEffect(() => {
    if (!user || (onglet !== 'actes' && onglet !== 'tableau')) return;
    const m = moisOptions[moisIdx];
    setBilanLoading(true);
    fetch(`/api/stats-bilan-mois?mois=${m.key}`)
      .then(r => r.json())
      .then(d => setBilanMois(d.bilan || null))
      .catch(() => setBilanMois(null))
      .finally(() => setBilanLoading(false));
  }, [user, onglet, moisIdx]);

  // ── ONGLET SUIVI JOURNALIER ──
  const [jourJournalData, setJourJournalData] = useState(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const jourCible = new Date();
  jourCible.setDate(jourCible.getDate() + jourOffset);
  const jourJournalLabel = jourCible.toLocaleDateString('fr-FR', {weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const jourJournalStr = fmtLocalDate(jourCible);

  const [creneauxMedecin, setCreneauxMedecin] = useState(null);

  useEffect(() => {
    if (!user || onglet !== 'journal') return;
    setJournalLoading(true);
    fetch(`/api/stats-jour?jour=${jourJournalStr}`)
      .then(r => r.json())
      .then(d => { setJourJournalData(d.result || null); setCreneauxMedecin(d.creneauxMedecin || null); })
      .catch(() => {})
      .finally(() => setJournalLoading(false));
  }, [jourOffset, user, onglet]);

  const LABEL_CRENEAU = { '07-13': 'Matin — 7h à 13h', '13-19': 'Après-midi — 13h à 19h', '19-07': 'Nuit — 19h à 7h' };

  // ── Créneaux médecin agrégés sur le mois (avec repli J-7 par créneau vide) ──
  const [creneauxMois, setCreneauxMois] = useState(null);
  const [creneauxMoisLoading, setCreneauxMoisLoading] = useState(false);
  useEffect(() => {
    if (!user || (onglet !== 'actes' && onglet !== 'tableau')) return;
    const m = moisOptions[moisIdx];
    setCreneauxMoisLoading(true);
    fetch(`/api/stats-creneaux-mois?mois=${m.key}`)
      .then(r => r.json())
      .then(d => setCreneauxMois(d.creneaux || null))
      .catch(() => setCreneauxMois(null))
      .finally(() => setCreneauxMoisLoading(false));
  }, [user, onglet, moisIdx]);

  function BlocCreneauxMois() {
    if (creneauxMoisLoading) return <div style={{fontSize:12,color:'#9ca3af',padding:'8px 0'}}>Chargement des créneaux…</div>;
    if (!creneauxMois) return null;
    return (
      <div className="no-print" style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 16px',marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',marginBottom:8}}>Passages par créneau médecin — {mois.label}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
          {['07-13','13-19','19-07'].map(c => {
            const d = creneauxMois[c];
            if (!d) return null;
            return (
              <div key={c} style={{padding:'8px 10px',borderRadius:8,background:'#f9fafb',border:'1px solid #f3f4f6'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase'}}>{LABEL_CRENEAU[c]}</div>
                <div style={{fontSize:20,fontWeight:800,color:'#111827'}}>{d.total}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const SYMBOLE_SORTIE = {
    domicile: '🏠', pse: '🚶', transfert: '🚑', gav: '🔒', deces: '🕊️', soins_ide: '💉',
  };
  const LABEL_SORTIE = {
    domicile: 'Retour à domicile', pse: 'Parti sans attendre', transfert: 'Transfert',
    gav: 'GAV — Réquisition', deces: 'Décès', soins_ide: 'Soins IDE direct',
  };
  function Badge({label, n}) {
    return (
      <div style={{padding:'6px 12px',borderRadius:8,background:n>0?'#f0fdfa':'#f9fafb',border:'1px solid '+(n>0?'#99f6e4':'#e5e7eb'),fontSize:12,fontWeight:600,color:n>0?'#0f766e':'#9ca3af'}}>
        {label} : <strong>{n||0}</strong>
      </div>
    );
  }

  // ── ONGLET ACTES ──
  const mois = moisOptions[moisIdx];
  const BILAN_VIDE = { total:0, parHeure:new Array(24).fill(0), totaux:{domicile:0,pse:0,transfert:0,gav:0,deces:0,soins_ide:0,enCours:0}, moyensTransfert:{ambulance:0,helicoptere:0,personnels:0} };
  const bilan = bilanMois || BILAN_VIDE;
  function permSlice(hDebut, hFin) {
    let n = 0;
    for (let h = hDebut; h < hFin; h++) n += bilan.parHeure[h] || 0;
    return n;
  }
  const s = {
    ...(compteursMois[mois.key] || {}),
    // Total patients et sorties : toujours dérivés du journal (source persistante, pas de TTL 24h)
    nbPatients: bilan.total,
    nbEnregistresParAS: bilan.total,
    nbPartiSansAttendreT3: bilan.totaux.pse,
    nbPartiSansAttendre: bilan.totaux.pse,
    nbGAV: bilan.totaux.gav,
    nbDecesSurSite: bilan.totaux.deces,
    nbRetourDomicile: bilan.totaux.domicile,
    nbTransfertUrgence: bilan.moyensTransfert.ambulance,
    nbTransfertSMUR: bilan.moyensTransfert.helicoptere,
    nbUrgenceMoyenPropre: bilan.moyensTransfert.personnels,
  };
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
          <button style={btnStyle(onglet==='journal')} onClick={()=>setOnglet('journal')}>Suivi journalier</button>
          <button style={btnStyle(onglet==='actes')} onClick={()=>setOnglet('actes')}>Actes du mois</button>
          <button style={btnStyle(onglet==='tableau')} onClick={()=>setOnglet('tableau')}>Tableau secrétaire</button>
        </div>
      </nav>

      <div style={{maxWidth:720,margin:'2rem auto',padding:'0 1rem'}}>

        {loading && <div style={{textAlign:'center',padding:'3rem',color:'#6b7280'}}>Chargement...</div>}

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


            <BlocCreneauxMois/>

            <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',marginBottom:12,gap:10}}>
              <button onClick={()=>{
                const lignes = LISTE_ACTES.map((l,i)=>{
                  if (l.startsWith('§')) return '';
                  const k = ACTES_KEYS[i];
                  return String(s[k] ?? 0);
                });
                navigator.clipboard.writeText(lignes.join('\n'));
                setCopieFait(true);
                setTimeout(()=>setCopieFait(false), 3000);
              }} style={{padding:'9px 14px',borderRadius:8,background:copieFait?'#16a34a':'#374151',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',flexShrink:0,transition:'background 0.2s'}}>
                {copieFait ? '✓ Copié — Coller dans Excel' : '📋 Copier colonne'}
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

            <BlocCreneauxMois/>

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
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:700,textAlign:'center'}}>{permSlice(7,17)}</td>
                  </tr>
                  <tr style={{background:'#fffbeb'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',color:'#374151'}}>Nb passages perm 17h00 à 00h00</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:700,textAlign:'center'}}>{permSlice(17,24)}</td>
                  </tr>
                  <tr style={{background:'#fef3c7'}}>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',color:'#374151'}}>Nb passages perm 00h00 à 07h00</td>
                    <td style={{padding:'6px 12px',border:'1px solid #fde68a',fontWeight:700,textAlign:'center'}}>{permSlice(0,7)}</td>
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

        {/* ── ONGLET SUIVI JOURNALIER ── */}
        {!loading && onglet==='journal' && (
          <div>
            {/* Navigation jour */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'14px 20px',marginBottom:16}}>
              <button onClick={()=>setJourOffset(j=>j-1)}
                style={{width:38,height:38,borderRadius:'50%',border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:20,color:'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>
                ←
              </button>
              <div style={{textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:16,color:'#111827',textTransform:'capitalize'}}>{jourJournalLabel}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{jourJournalData?.total||0} entrée{(jourJournalData?.total||0)>1?'s':''} au total</div>
              </div>
              <button onClick={()=>setJourOffset(j=>Math.min(j+1,0))} disabled={jourOffset>=0}
                style={{width:38,height:38,borderRadius:'50%',border:'1px solid #e5e7eb',background:jourOffset>=0?'#f9fafb':'#fff',cursor:jourOffset>=0?'not-allowed':'pointer',fontSize:20,color:jourOffset>=0?'#d1d5db':'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>
                →
              </button>
            </div>

            <p style={{fontSize:12,color:'#9ca3af',marginBottom:12}}>
              Chaque patient enregistré dans l'appli apparaît à son heure d'arrivée, avec un symbole
              une fois sorti : 🏠 domicile · 🚶 parti sans attendre · 🚑 transfert · 🔒 GAV · 🕊️ décès ·
              💉 soins IDE direct · ⏳ pas encore sorti.
            </p>

            {!journalLoading && creneauxMedecin && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:16}}>
                {['07-13','13-19','19-07'].map(c => {
                  const d = creneauxMedecin[c];
                  if (!d) return null;
                  return (
                    <div key={c} style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 14px'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',marginBottom:4}}>{LABEL_CRENEAU[c]}</div>
                      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                        <span style={{fontSize:26,fontWeight:800,color:'#111827'}}>{d.total}</span>
                        <span style={{fontSize:11,color:'#9ca3af'}}>patient{d.total>1?'s':''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {journalLoading && <div style={{textAlign:'center',padding:'2rem',color:'#6b7280'}}>Chargement...</div>}

            {!journalLoading && (
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden',marginBottom:16}}>
                {Array.from({length:24}).map((_,h)=>{
                  const entrees = jourJournalData?.parHeure?.[h] || [];
                  return (
                    <div key={h} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderBottom:'1px solid #f3f4f6',background:entrees.length>0?'#fff':'#fafafa'}}>
                      <div style={{width:44,fontSize:12,fontWeight:700,color:entrees.length>0?'#111827':'#d1d5db',flexShrink:0}}>{String(h).padStart(2,'0')}h</div>
                      <div style={{width:20,fontSize:12,fontWeight:800,color:entrees.length>0?'#0d9488':'#e5e7eb',flexShrink:0}}>{entrees.length||''}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,flex:1}}>
                        {entrees.map((e,i)=>(
                          <span key={i} title={LABEL_SORTIE[e.sortie]||'en cours'} style={{fontSize:16}}>
                            {SYMBOLE_SORTIE[e.sortie] || '⏳'}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!journalLoading && jourJournalData && (
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'16px 20px'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',marginBottom:10}}>Total du jour par type de sortie</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:jourJournalData.totaux.transfert>0?12:0}}>
                  <Badge label="🏠 Domicile (RAD)" n={jourJournalData.totaux.domicile} />
                  <Badge label="🚶 Parti sans attendre" n={jourJournalData.totaux.pse} />
                  <Badge label="🔒 GAV" n={jourJournalData.totaux.gav} />
                  <Badge label="🚑 Transfert" n={jourJournalData.totaux.transfert} />
                  <Badge label="🕊️ Décès" n={jourJournalData.totaux.deces} />
                  <Badge label="💉 Soins IDE direct" n={jourJournalData.totaux.soins_ide} />
                  <Badge label="⏳ Pas encore sorti" n={jourJournalData.totaux.enCours} />
                </div>
                {jourJournalData.totaux.transfert>0 && (
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',marginBottom:8}}>Dont moyen de transfert</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                      <Badge label="🚑 Ambulance" n={jourJournalData.moyensTransfert.ambulance} />
                      <Badge label="🚁 Hélicoptère" n={jourJournalData.moyensTransfert.helicoptere} />
                      <Badge label="🚗 Moyens personnels" n={jourJournalData.moyensTransfert.personnels} />
                    </div>
                  </div>
                )}
              </div>
            )}
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
