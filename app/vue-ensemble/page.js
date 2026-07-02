'use client';
import { useState, useEffect } from 'react';

const COULEURS = {
  pansement:'#f59e0b', obs1:'#9ca3af', obs2:'#16a34a',
  lit1:'#9ca3af', lit2:'#9ca3af', fauteuil1:'#16a34a', fauteuil2:'#16a34a',
  brancard1:'#ef4444', brancard2:'#ef4444',
};
const BG_VIDE = {
  pansement:'#fffbeb', obs1:'#f9fafb', obs2:'#f0fdf4',
  lit1:'#f9fafb', lit2:'#f9fafb', fauteuil1:'#f0fdf4', fauteuil2:'#f0fdf4',
  brancard1:'#fef2f2', brancard2:'#fef2f2',
};
const LEGENDES = {pansement:'Pansement',obs1:'Lit obs',obs2:'Fauteuil obs',lit1:'Lit 1',lit2:'Lit 2',fauteuil1:'Fauteuil 1',fauteuil2:'Fauteuil 2',brancard1:'Brancard 1',brancard2:'Brancard 2'};
const statutColor = {attente_medecin:'#f59e0b',en_cours:'#0d9488',vu:'#10b981',transfert:'#8b5cf6'};

function duree(ts) {
  const m = Math.floor((Date.now()-parseInt(ts))/60000);
  return m<60?m+'min':'H'+Math.floor(m/60)+(m%60>0?'h'+(m%60):'');
}

function Case({id, label, p}) {
  const c = COULEURS[id]||'#9ca3af';
  const [copied, setCopied] = useState(false);
  function copierIpp(e) {
    e.stopPropagation();
    if (!p?.ipp) return;
    navigator.clipboard.writeText(p.ipp);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  }
  return (
    <div style={{background:p?'#e2e8f0':BG_VIDE[id]||'#f9fafb',border:'1.5px solid '+(p?c:'#e5e7eb'),borderRadius:10,position:'relative',overflow:'hidden',height:'100%'}}>
      <div style={{padding:'7px 9px 3px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'baseline',gap:5}}>
          <span style={{fontWeight:800,fontSize:13,color:c}}>{label}</span>
          {!p&&<span style={{fontSize:9,color:c,opacity:0.5}}>{LEGENDES[id]}</span>}
        </div>
        {p&&<div style={{width:6,height:6,borderRadius:'50%',background:statutColor[p.statut]||'#e5e7eb'}}/>}
      </div>
      {p&&(
        <div style={{padding:'0 9px 7px'}}>
          <div onClick={copierIpp} title="Copier l'IPP"
            style={{fontWeight:700,color:copied?'#16a34a':'#111827',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',cursor:p.ipp?'pointer':'default',display:'inline-flex',alignItems:'center',gap:4}}>
            {copied ? '✓ Copié' : 'IPP '+(p.ipp||'—')}
          </div>
          <div style={{color:'#6b7280',fontSize:10,marginTop:1}}>{p.age} ans</div>
          <div style={{color:'#374151',fontSize:10,marginTop:2,fontWeight:500}}>{p.symptome||p.motifPrincipal}</div>
          <div style={{position:'absolute',bottom:5,right:7,fontSize:9,color:'#9ca3af',fontWeight:600}}>{duree(p.arrivee)}</div>
        </div>
      )}
    </div>
  );
}

function Poste({label, color}) {
  return (
    <div style={{background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',height:'100%'}}>
      <div style={{width:9,height:9,borderRadius:'50%',background:color}}/>
      <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{label}</span>
    </div>
  );
}

export default function VueEnsemble() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    async function load() {
      const r = await fetch('/api/patients');
      const d = await r.json();
      setPatients(d.patients||[]);
    }
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const enSalle = patients.filter(p=>p.statut!=='preau');
  const preau = patients.filter(p=>p.statut==='preau');
  const P = id => enSalle.find(p=>p.emplacement===id);

  return (
    <div style={{height:'100vh',background:'#f3f4f6',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'system-ui'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:48,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:700}}>P</div>
          <span style={{fontWeight:700,fontSize:14,color:'#111827'}}>PDS Kahani — Vue d'ensemble</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {preau.length>0&&<span style={{background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99}}>{preau.length} en attente</span>}
          <span style={{fontSize:11,color:'#9ca3af'}}>Actualisation auto</span>
        </div>
      </nav>

      <div style={{flex:1,padding:'1rem',display:'flex',flexDirection:'column',gap:10,minHeight:0}}>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,flexShrink:0,height:'28%'}}>
          <Case id="pansement" label="P1" p={P('pansement')}/>
          <Poste label="IDE" color="#6b7280"/>
          <Poste label="Medecin" color="#0d9488"/>
          <Poste label="AS" color="#f59e0b"/>
        </div>

        <div style={{display:'flex',gap:10,flex:1,minHeight:0}}>
          <div style={{border:'2px solid #16a34a66',borderRadius:14,padding:6,display:'flex',flexDirection:'column',gap:6,width:'25%',flexShrink:0}}>
            <Case id="obs1" label="O1" p={P('obs1')}/>
            <Case id="obs2" label="O2" p={P('obs2')}/>
          </div>
          <div style={{border:'2px solid #9ca3af66',borderRadius:14,padding:6,display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:6,flex:1}}>
            <Case id="lit2" label="L2" p={P('lit2')}/>
            <Case id="fauteuil1" label="F1" p={P('fauteuil1')}/>
            <Case id="fauteuil2" label="F2" p={P('fauteuil2')}/>
            <Case id="lit1" label="L1" p={P('lit1')}/>
          </div>
          <div style={{border:'2px solid #ef444466',borderRadius:14,padding:6,display:'flex',flexDirection:'column',gap:6,width:'25%',flexShrink:0}}>
            <Case id="brancard1" label="B1" p={P('brancard1')}/>
            <Case id="brancard2" label="B2" p={P('brancard2')}/>
          </div>
        </div>

      </div>
    </div>
  );
}
