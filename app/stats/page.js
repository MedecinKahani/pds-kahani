'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getCreneauActuel() {
  const h = new Date().getHours();
  const today = new Date().toLocaleDateString('fr-FR');
  if (h >= 7 && h < 19) return { label: 'Journee 7h-19h', debut: 7, fin: 19, date: today, type: 'jour' };
  return { label: 'Nuit 19h-7h', debut: 19, fin: 7, date: today, type: 'nuit' };
}

function getCreneauTimestamps(creneau) {
  const now = new Date();
  const today = new Date(now);
  if (creneau.type === 'jour') {
    const debut = new Date(today); debut.setHours(7,0,0,0);
    const fin = new Date(today); fin.setHours(19,0,0,0);
    return { debut: debut.getTime(), fin: fin.getTime() };
  } else {
    const debut = new Date(today); debut.setDate(debut.getDate()-1); debut.setHours(19,0,0,0);
    const fin = new Date(today); fin.setHours(7,0,0,0);
    return { debut: debut.getTime(), fin: fin.getTime() };
  }
}

const ACTES_LABELS = [
  {k:'dextro', l:'Dextro'},
  {k:'hemocue', l:'Hemocue'},
  {k:'quicktest', l:'Quick test tetanos'},
  {k:'bu', l:'BU (bandelette urinaire)'},
  {k:'bhcg', l:'bHCG urinaire'},
  {k:'crp', l:'CRP rapide'},
  {k:'ecg', l:'ECG'},
  {k:'tdr_dengue', l:'TDR dengue'},
  {k:'tdr_palu', l:'TDR paludisme'},
  {k:'drp', l:'DRP (lavage de nez)'},
  {k:'aerosol', l:'Aerosol'},
  {k:'perf', l:'Perfusion / VVP'},
];

const MOTIFS_LABELS = {
  douleur:'Douleur', fievre:'Fievre', coma:'Coma / Inconscience',
  detresse_respi:'Detresse respiratoire', asthme:'Asthme',
  vertige:'Vertige / Malaise', plaie:'Plaie / Traumatisme',
  bronchiolite:'Bronchiolite', autre:'Autre',
};

export default function StatsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tousPts, setTousPts] = useState([]);
  const [creneau] = useState(getCreneauActuel);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    setUser(JSON.parse(s));
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    const ts = getCreneauTimestamps(creneau);
    const r = await fetch('/api/patients?all=1');
    const d = await r.json();
    const pts = (d.patients||[]).filter(p => {
      const t = parseInt(p.arrivee);
      return t >= ts.debut && t <= ts.fin;
    });
    setTousPts(pts);
    setLoading(false);
  }

  const nbTotal = tousPts.length;

  const motifs = {};
  tousPts.forEach(p => {
    const m = p.symptome || p.motifPrincipal || 'autre';
    motifs[m] = (motifs[m]||0) + 1;
  });

  function moyenne(champ) {
    const vals = tousPts.map(p => parseFloat(p[champ])).filter(v => !isNaN(v));
    if (!vals.length) return null;
    return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
  }

  const compteActes = {};
  ACTES_LABELS.forEach(({k}) => compteActes[k] = 0);
  tousPts.forEach(p => {
    if (p.dextro) compteActes.dextro++;
    if (p.hemocue) compteActes.hemocue++;
    if (p.quicktest) compteActes.quicktest++;
    if (p.bu_fait || p.bu) compteActes.bu++;
    if (p.bhcg_fait || p.bhcg) compteActes.bhcg++;
    if (p.ecg_fait) compteActes.ecg++;
    if (p.tdr_dengue) compteActes.tdr_dengue++;
    if (p.tdr_palu) compteActes.tdr_palu++;
    if (p.drp) compteActes.drp++;
    const actes = p.actes ? (typeof p.actes==='string'?JSON.parse(p.actes):p.actes) : [];
    actes.forEach(a => {
      const l = a.label||'';
      if (l.includes('Aerosol')) compteActes.aerosol++;
      if (l.includes('Perfusion')||l.includes('VVP')) compteActes.perf++;
      if (l.includes('ECG')) compteActes.ecg++;
      if (l.includes('BU')) compteActes.bu++;
      if (l.includes('bHCG')) compteActes.bhcg++;
      if (l.includes('Dextro')) compteActes.dextro++;
      if (l.includes('Hemocue')) compteActes.hemocue++;
      if (l.includes('CRP')) compteActes.crp++;
    });
  });

  const dateStr = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  const maxMotif = Math.max(...Object.values(motifs), 1);
  const maxActe = Math.max(...Object.values(compteActes), 1);

  if (loading) return <div style={{padding:'2rem',textAlign:'center',color:'#6b7280'}}>Chargement...</div>;

  return (
    <div style={{fontFamily:'system-ui',background:'#f3f4f6',minHeight:'100vh'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}} className="no-print">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.back()} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>Retour</button>
          <span style={{fontWeight:700,fontSize:15,color:'#111827'}}>Recap session — {creneau.label}</span>
        </div>
        <button onClick={()=>window.print()} style={{padding:'9px 20px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}>
          Exporter PDF
        </button>
      </nav>

      <div id="print-zone" style={{maxWidth:780,margin:'2rem auto',padding:'0 1rem'}}>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.5rem 2rem',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:'#111827'}}>CMR Kahani — Permanence de Soins</div>
            <div style={{color:'#6b7280',fontSize:13,marginTop:4}}>Recap activite — {creneau.label} — {dateStr}</div>
          </div>
          <div style={{textAlign:'right',fontSize:13,color:'#6b7280'}}>
            <div>Redige par</div>
            <div style={{fontWeight:600,color:'#111827'}}>{user?.nom} ({user?.matricule})</div>
          </div>
        </div>

        <div style={{background:'#0d9488',borderRadius:12,padding:'1.25rem 2rem',marginBottom:16,display:'flex',alignItems:'center',gap:16}}>
          <div>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:12}}>Total passages</div>
            <div style={{color:'#fff',fontWeight:800,fontSize:52,lineHeight:1}}>{nbTotal}</div>
          </div>
          <div style={{width:1,height:60,background:'rgba(255,255,255,0.2)'}}/>
          <div style={{color:'rgba(255,255,255,0.9)',fontSize:13}}>
            <div>Creneau : {creneau.label}</div>
            <div>Date : {dateStr}</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Motifs de consultation</div>
            {Object.entries(motifs).length===0 ? (
              <div style={{color:'#d1d5db',fontSize:13}}>Aucun passage</div>
            ) : Object.entries(motifs).sort((a,b)=>b[1]-a[1]).map(([m,n])=>(
              <div key={m} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f9fafb',gap:8}}>
                <span style={{fontSize:13,color:'#374151',flex:1}}>{MOTIFS_LABELS[m]||m}</span>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  <div style={{height:6,borderRadius:3,background:'#0d9488',width:Math.round((n/maxMotif)*60)+'px'}}/>
                  <span style={{fontWeight:700,color:'#111827',fontSize:15,minWidth:20,textAlign:'right'}}>{n}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Constantes moyennes d'entree</div>
            {[
              {k:'temp',l:'Temperature',u:'°C',icon:'🌡️'},
              {k:'tas',l:'PAS',u:'mmHg',icon:'🩸'},
              {k:'tad',l:'PAD',u:'mmHg',icon:'🩸'},
              {k:'fc',l:'FC',u:'bpm',icon:'❤️'},
              {k:'sat',l:'SpO2',u:'%',icon:'💧'},
            ].map(({k,l,u,icon})=>{
              const moy = moyenne(k);
              return(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #f9fafb'}}>
                  <span style={{fontSize:13,color:'#374151',display:'flex',alignItems:'center',gap:5}}><span>{icon}</span>{l}</span>
                  <span style={{fontWeight:700,color:moy?'#111827':'#d1d5db',fontSize:14}}>{moy||'--'}<span style={{fontWeight:400,fontSize:11,color:'#9ca3af',marginLeft:3}}>{moy?u:''}</span></span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem',marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Actes et examens realises</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            {ACTES_LABELS.map(({k,l},i)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:i%4<2?'#f9fafb':'#fff',borderRadius:6}}>
                <span style={{fontSize:13,color:'#374151'}}>{l}</span>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  <div style={{height:6,borderRadius:3,background:compteActes[k]>0?'#0d9488':'#e5e7eb',width:Math.max(Math.round((compteActes[k]/maxActe)*50),compteActes[k]>0?4:2)+'px'}}/>
                  <span style={{fontWeight:700,color:compteActes[k]>0?'#111827':'#d1d5db',fontSize:15,minWidth:24,textAlign:'right'}}>{compteActes[k]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',padding:'8px'}}>
          Document genere automatiquement — CMR Kahani PDS v1.0 — {dateStr}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          #print-zone { margin: 0 !important; padding: 0.5rem !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
