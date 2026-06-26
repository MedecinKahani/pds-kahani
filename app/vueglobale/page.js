'use client';
import { useState, useEffect, useCallback } from 'react';

function safeJSON(val, fallback=[]) {
  if(!val) return fallback;
  if(typeof val === 'string') {
    if(val.includes('[object')) return fallback;
    try { return JSON.parse(val); } catch(e) { return fallback; }
  }
  if(Array.isArray(val)) return val;
  if(typeof val === 'object') return val;
  return fallback;
}
import FichePatient from './fiche';
import { useRouter } from 'next/navigation';

const NORMES = { sat:[94,100], fc:[50,100], ta_sys:[90,150], ta_dia:[60,95], temp:[36,38.4], dextro:[0.7,2.0] };
function isAnormal(val,k){const v=parseFloat(val);if(isNaN(v))return false;const[mn,mx]=NORMES[k]||[0,9999];return v<mn||v>mx;}
function hasAnomalie(p){return['sat','fc','ta_sys','ta_dia','temp'].some(k=>p[k]&&isAnormal(p[k],k));}
function duree(ts){const m=Math.floor((Date.now()-parseInt(ts))/60000);return m<60?m+'min':'H'+Math.floor(m/60)+(m%60>0?'h'+(m%60):'');}

const statutColor = {attente_medecin:'#f59e0b',en_cours:'#0d9488',vu:'#10b981',transfert:'#8b5cf6'};
const LEGENDES = {pansement:'Pansement',obs1:'Lit obs',obs2:'Fauteuil obs',lit1:'Lit 1',lit2:'Lit 2',fauteuil1:'Fauteuil 1',fauteuil2:'Fauteuil 2',brancard1:'Brancard 1',brancard2:'Brancard 2'};

// Couleurs par case
const C = {
  pansement:'#f59e0b', obs1:'#3b82f6', obs2:'#16a34a',
  lit1:'#3b82f6', lit2:'#3b82f6', fauteuil1:'#16a34a', fauteuil2:'#16a34a',
  brancard1:'#ef4444', brancard2:'#ef4444'
};
const C_BG = {
  pansement:'#fffbeb', obs1:'#f8fbff', obs2:'#f8fff9',
  lit1:'#f8fbff', lit2:'#f8fbff', fauteuil1:'#f8fff9', fauteuil2:'#f8fff9',
  brancard1:'#fff8f8', brancard2:'#fff8f8'
};
const C_DIV = {
  pansement:'#fde68a', obs1:'#bfdbfe', obs2:'#bbf7d0',
  lit1:'#bfdbfe', lit2:'#bfdbfe', fauteuil1:'#bbf7d0', fauteuil2:'#bbf7d0',
  brancard1:'#fecaca', brancard2:'#fecaca'
};
const BG = {
  pansement:'#fffbeb', obs1:'#eff6ff', obs2:'#f0fdf4',
  lit1:'#eff6ff', lit2:'#eff6ff', fauteuil1:'#f0fdf4', fauteuil2:'#f0fdf4',
  brancard1:'#fef2f2', brancard2:'#fef2f2'
};

export default function PageVueGlobale() {
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [patients,setPatients] = useState([]);
  const [sel,setSel] = useState(null);
  const [rx,setRx] = useState('');
  const [diag,setDiag] = useState('');
  const [orient,setOrient] = useState('');
  const [ficheOuverte,setFicheOuverte] = useState(null);

  const load = useCallback(async()=>{
    const r=await fetch('/api/patients');
    const d=await r.json();
    const ps=d.patients||[];
    setPatients(ps);
    if(sel){const u=ps.find(p=>p.id===sel.id);if(u)setSel(u);}
  },[sel?.id]);

  useEffect(()=>{
    const s=sessionStorage.getItem('pds_user');
    if(!s){router.push('/login');return;}
    const u=JSON.parse(s);
    // tous les roles acceptes
    setUser(u);load();
    const iv=setInterval(load,8000);
    return()=>clearInterval(iv);
  },[]);

  async function patch(id,data){
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id,patch:data})});
    load();
  }
  async function addRx(id){
    if(!rx.trim())return;
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addPrescription',id,prescription:{texte:rx,auteur:user.matricule}})});
    setRx('');load();
  }
  async function finaliser(id){
    await patch(id,{diagnostic:diag,orientation:orient,statut:orient.startsWith('transfert')?'transfert':'vu'});
    if(orient==='sortie'||orient==='rdv_consultation'){
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discharge',id})});
    }
    setSel(null);setDiag('');setOrient('');load();
  }

  if(!user)return null;
  const preau=patients.filter(p=>p.statut==='dehors');
  const enSalle=patients.filter(p=>p.statut!=='dehors');

  function labelSymptome(p) {
    const map = {
      coma:'Coma / Inconscience', detresse_respi:'Detresse respiratoire',
      asthme:'Asthme', douleur:'Douleur', fievre:'Fievre',
      vertige:'Vertige / Malaise', plaie:'Plaie', autre:'Autre'
    };
    let label = map[p?.symptome] || p?.symptome || '--';
    if(p?.symptome==='douleur') {
      try {
        const zones = typeof p?.douleur_zones==='string' ? JSON.parse(p.douleur_zones) : (p?.douleur_zones||[]);
        if(zones && zones.length>0) label += ' — '+zones.slice(0,2).map(z=>z.replace(/_/g,' ')).join(', ');
      } catch(e){}
    }
    if(p?.symptome_autre) label = p.symptome_autre;
    return label;
  }

  function couleurDuree(ts) {
    const h = (Date.now()-parseInt(ts)) / 3600000;
    if (h < 1) return {color:'#16a34a', label:'<1h'};
    if (h < 2) return {color:'#16a34a', label:'>1h'};
    if (h < 3) return {color:'#f59e0b', label:'>2h'};
    if (h < 4) return {color:'#f59e0b', label:'>3h'};
    if (h < 5) return {color:'#ef4444', label:'>4h'};
    if (h < 6) return {color:'#ef4444', label:'>5h'};
    return {color:'#ef4444', label:'>6h'};
  }

  function couleurConst(val, k) {
    const NORMES = {fc:[50,100],tas:[90,150],tad:[60,95],sat:[94,100],temp:[36,38.4],dextro:[0.7,2.0],hemocue:[8,18]};
    const v = parseFloat(val); if(isNaN(v)) return null;
    const [mn,mx] = NORMES[k]||[0,9999];
    if(v>=mn && v<=mx) return {color:'#16a34a',bg:'#f0fdf4'};
    const marge = (mx-mn)*0.2;
    if(v>=mn-marge && v<=mx+marge) return {color:'#f59e0b',bg:'#fffbeb'};
    return {color:'#ef4444',bg:'#fef2f2'};
  }

  function catPrescriptions(prescriptions) {
    const cats = {examens:[], therapeutique:[], soins:[]};
    prescriptions.filter(rx=>!rx.fait).forEach(rx => {
      const t = (rx.texte||'').toLowerCase();
      if(t.includes('ecg')||t.includes('dextro')||t.includes('hemocue')||t.includes('tdr')||t.includes('bu ')||t.includes('bhcg')||t.includes('biologie')||t.includes('tube')||t.includes('gaz')||t.includes('nfs')||t.includes('crp')) {
        cats.examens.push(rx);
      } else if(t.includes('aerosol')||t.includes('perf')||t.includes('vvp')||t.includes('paracetamol')||t.includes('perfalgan')||t.includes('morphine')||t.includes('ketoprof')||t.includes('ventoline')||t.includes('atrovent')||t.includes('salbutamol')||t.includes('tramadol')||t.includes('ibuprofene')||t.includes('o2')||t.includes('oxygene')) {
        cats.therapeutique.push(rx);
      } else {
        cats.soins.push(rx);
      }
    });
    return cats;
  }

  function imprimerSortie(p) {
    const presc = safeJSON(p?.prescriptions);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sortie ${p.nom} ${p.prenom}</title>
    <style>body{font-family:Arial,sans-serif;padding:2cm;max-width:800px;margin:auto}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{padding:6px 10px;border:1px solid #ddd;font-size:13px}th{background:#f3f4f6;font-weight:600}.sec{margin-top:16px;font-weight:bold;font-size:14px;color:#374151}</style>
    </head><body>
    <h1>Compte-rendu de passage — CMR Kahani</h1>
    <table><tr><th>Nom</th><td>${p.nom} ${p.prenom}</td><th>DDN</th><td>${p.ddn||'--'}</td></tr>
    <tr><th>IPP</th><td>${p.ipp||'--'}</td><th>Sexe</th><td>${p.sexe||'--'}</td></tr>
    <tr><th>Emplacement</th><td>${p.emplacement||'--'}</td><th>Arrivee</th><td>${p.arrivee?new Date(parseInt(p.arrivee)).toLocaleString('fr-FR'):'--'}</td></tr></table>
    <div class="sec">Motif</div><p>${p.symptome||'--'}${p.symptome_autre?' — '+p.symptome_autre:''}</p>
    <div class="sec">Constantes</div>
    <table><tr><th>FC</th><td>${p.fc||'--'} bpm</td><th>PAS/PAD</th><td>${p.tas||'--'}/${p.tad||'--'} mmHg</td></tr>
    <tr><th>Saturation</th><td>${p.sat||'--'} %</td><th>Temperature</th><td>${p.temp||'--'} °C</td></tr>
    <tr><th>Dextro</th><td>${p.dextro||'--'} g/L</td><th>Hemocue</th><td>${p.hemocue||'--'} g/dL</td></tr></table>
    <div class="sec">Anamnese</div><p>${p.anamnese||'--'}</p>
    <div class="sec">Examen clinique</div><p>${p.examen_clinique||'--'}</p>
    <div class="sec">Diagnostic</div><p>${p.diagnostic||'--'}</p>
    <div class="sec">Prescriptions</div>
    <table><tr><th>Prescription</th><th>Statut</th></tr>
    ${presc.map(r=>`<tr><td>${r.texte}</td><td>${r.fait?'Realise':'En attente'}</td></tr>`).join('')||'<tr><td colspan=2>Aucune prescription</td></tr>'}
    </table>
    <div class="sec">Evolution / Prise en charge</div><p>${p.prise_en_charge||'--'}</p>
    <p style="margin-top:2cm;font-size:11px;color:#9ca3af">Document genere le ${new Date().toLocaleString('fr-FR')} — PDS Kahani</p>
    </body></html>`;
    const filename = [p.nom, p.prenom, p.ddn, p.ipp].filter(Boolean).join('_').replace(/\s+/g,'_') + '.pdf';
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.document.title = filename;
      w.print();
    };
  }

  function Case({id,label}){
    const p=enSalle.find(x=>x.emplacement===id);
    const c=C[id]||'#9ca3af';
    const cbg=C_BG[id]||'#fff';
    const isSelected=ficheOuverte?.id===p?.id;
    const prescriptions = safeJSON(p?.prescriptions);
    const cats = catPrescriptions(prescriptions);
    const hasExamens = cats.examens.length > 0;
    const hasThera = cats.therapeutique.length > 0;
    const hasSoins = cats.soins.length > 0;
    const pam = p?.tas && p?.tad ? Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3) : null;
    const sexeSymbol = p?.sexe==='M'||p?.sexe==='Homme'?'♂':p?.sexe==='F'||p?.sexe==='Femme'?'♀':'';

    return(
      <div onClick={()=>{if(!p)return;setFicheOuverte(isSelected?null:p);if(p.statut==='attente_medecin')patch(p.id,{statut:'en_cours'});}}
        style={{background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:16,cursor:p?'pointer':'default',
          position:'relative',overflow:'hidden',flex:1,display:'flex',flexDirection:'column',
          transition:'box-shadow 0.15s, transform 0.15s'
        }}
        onMouseEnter={e=>{if(p){e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.18)';e.currentTarget.style.transform='translateY(-2px)';}}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow=isSelected?'0 2px 12px rgba(0,0,0,0.1)':'none';e.currentTarget.style.transform='none';}}>

        {p ? (
          <div style={{margin:6,borderRadius:12,border:'3px solid '+c,background:cbg,padding:'7px 8px',display:'flex',flexDirection:'column',gap:3,flex:1,overflow:'hidden'}}>

            {/* Haut : [L2 + identité gauche] | [motif + sexe droite] */}
            <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>

              {/* Gauche : label + identité */}
              <div style={{display:'flex',gap:6,alignItems:'flex-start',flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:15,color:c,lineHeight:1,flexShrink:0}}>{label}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,color:'#111827',fontSize:12,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.prenom} {p.nom}</div>
                  <div style={{color:'#6b7280',fontSize:9,marginTop:1}}>{p.ddn?p.ddn+' · ':''}{p.age} ans</div>
                  {p.ipp&&<div style={{color:'#9ca3af',fontSize:8,marginTop:1,display:'flex',alignItems:'center',gap:2}}>
                    {p.ipp}
                    <span onClick={e=>{
                      e.stopPropagation();
                      navigator.clipboard.writeText(p.ipp);
                      const el=e.currentTarget;
                      el.textContent='✓';el.style.color='#16a34a';el.style.background='#f0fdf4';
                      setTimeout(()=>{el.textContent='□';el.style.color='#9ca3af';el.style.background='transparent';},1500);
                    }} style={{cursor:'pointer',color:'#9ca3af',fontSize:10,padding:'0 3px',borderRadius:3,border:'1px solid #e5e7eb',userSelect:'none'}}>□</span>
                  </div>}
                </div>
              </div>

              {/* Droite : motif + sexe */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0,maxWidth:'45%'}}>
                <div style={{fontSize:16,color:c,lineHeight:1}}>{sexeSymbol}</div>
                <div style={{fontSize:12,fontWeight:700,color:'#111827',textAlign:'right',lineHeight:1.2}}>{labelSymptome(p)}</div>
              </div>

            </div>

            {/* Constantes 2 colonnes + prescriptions */}
            <div style={{display:'flex',gap:8,alignItems:'flex-start',flex:1}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 4px',flex:1}}>
                {[
                  {k:'fc',      v:p.fc,                                          l:'FC',  u:'bpm',  icon:'🫀'},
                  {k:'tas',     v:p.tas&&p.tad?p.tas+'/'+p.tad:p.tas||'--',     l:'TA',  u:'mmHg', icon:'🩸'},
                  {k:'sat',     v:p.sat||'--',                                   l:'Sat', u:'%',    icon:'💧'},
                  {k:'temp',    v:p.temp||'--',                                  l:'T°',  u:'°C',   icon:'🌡️'},
                  {k:'dextro',  v:p.dextro||'--',                                l:'Dex', u:'g/L',  icon:'🍬'},
                  {k:'hemocue', v:p.hemocue||'--',                               l:'Hb',  u:'g/dL', icon:'🔴'},
                ].map(({k,v,l,u,icon})=>{
                  const rawV = k==='tas'?p.tas:k==='sat'?p.sat:k==='temp'?p.temp:k==='dextro'?p.dextro:k==='hemocue'?p.hemocue:p.fc;
                  const col = rawV ? couleurConst(rawV, k==='tas'?'tas':k) : null;
                  return(
                    <div key={k} style={{background:'rgba(255,255,255,0.7)',borderRadius:4,padding:'2px 4px',border:'0.5px solid rgba(0,0,0,0.06)'}}>
                      <div style={{fontSize:7,color:'#9ca3af',display:'flex',alignItems:'center',gap:1}}><span style={{fontSize:8}}>{icon}</span>{l}</div>
                      <div style={{fontSize:10,fontWeight:700,color:col?.color||'#374151',whiteSpace:'nowrap'}}>{v} <span style={{fontSize:7,fontWeight:400,color:'#9ca3af'}}>{u}</span></div>
                    </div>
                  );
                })}
              </div>

              {/* Prescriptions + Sortie */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',gap:6,flexShrink:0,alignSelf:'stretch'}}>
                <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'center'}}>
                  {hasExamens&&<span style={{fontSize:16}}>🔬</span>}
                  {hasThera&&<span style={{fontSize:16}}>💊</span>}
                  {hasSoins&&<span style={{fontSize:16}}>🩹</span>}
                </div>
                <button onClick={async e=>{
                  e.stopPropagation();
                  if(!confirm('Confirmer la sortie de '+p.prenom+' '+p.nom+' ?')) return;
                  imprimerSortie(p);
                  await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discharge',id:p.id})});
                  load();
                }} style={{padding:'3px 8px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:10,fontWeight:600,border:'1px solid #e5e7eb',cursor:'pointer'}}>
                  Sortie →
                </button>
              </div>
            </div>

          </div>
        ):(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:120,gap:6}}>
            <span style={{fontSize:11,color:'#d1d5db',fontWeight:600}}>{label}</span>
            <button onClick={e=>{e.stopPropagation();router.push('/nouveau-patient?emplacement='+id);}}
              onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.background=c+'18';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='0.4';e.currentTarget.style.background='transparent';}}
              style={{width:32,height:32,borderRadius:8,background:'transparent',border:'1.5px dashed '+c,color:c,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:0.4,transition:'all 0.15s'}}>+</button>
          </div>
        )}
      </div>
    );
  }

  function Poste({id,label,color}){
    const showNom=(id==='_doc'&&user.role==='medecin')||(id==='_ide'&&user.role==='ide')||(id==='_as'&&user.role==='as');
    return(
      <div style={{flex:1,background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,padding:'8px'}}>
        <div style={{width:9,height:9,borderRadius:'50%',background:color}}/>
        <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{label}</span>
        {showNom&&<span style={{fontSize:11,color:color,fontWeight:500,textAlign:'center'}}>{id==='_doc'?'Dr '+user.nom:user.nom}</span>}
      </div>
    );
  }

  // Salle = un bloc avec bordure colorée, titre discret, cases internes
  function Salle({color, label, children, style={}}){
    return(
      <div style={{border:'2px solid '+color+'99',borderRadius:14,padding:6,display:'flex',flexDirection:'column',gap:6,...style}}>
        <div style={{fontSize:9,fontWeight:700,color:color,textTransform:'uppercase',letterSpacing:1,textAlign:'center',opacity:0.7,lineHeight:1}}>{label}</div>
        {children}
      </div>
    );
  }

  return(
    <div style={{height:'100vh',background:'#f3f4f6',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:52,flexShrink:0}}>
        <div style={{fontWeight:700,fontSize:16,color:'#111827'}}>PDS Kahani</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:12,color:'#9ca3af',marginRight:4}}>{user?.nom}</span>
          <button onClick={()=>router.push('/nouveau-patient')} style={{padding:'7px 16px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>+ Nouveau patient</button>
          <button onClick={()=>router.push('/admin')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'}}>Ajouter agent</button>
          <button onClick={()=>router.push('/stats')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'}}>Export PDF</button>
          <button onClick={()=>{sessionStorage.clear();router.push('/login');}} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>Deconnexion</button>
        </div>
      </nav>

      <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
          <div style={{width:'100%',flexShrink:0,padding:'1rem',display:'flex',flexDirection:'column',minHeight:0}}>

            {/* FICHE OUVERTE AU-DESSUS DU PLAN */}
            {ficheOuverte&&(
              <div style={{marginBottom:12,flexShrink:0}}>
                <FichePatient
                  patient={ficheOuverte}
                  onClose={()=>setFicheOuverte(null)}
                  onUpdate={()=>{load();}}
                  user={user}
                />
              </div>
            )}

            {/* Grid 4 colonnes x 3 rangées avec encadrés span */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'1fr 1fr 1fr 1fr',
              gridTemplateRows:'1fr 1fr 1fr',
              gap:8,
              flex:1,
              minHeight:0,
              position:'relative',
            }}>
              {/* Cases ligne 0 */}
              <div style={{gridColumn:1,gridRow:1,display:'flex'}}>
                <Case id="pansement" label="P1"/>
              </div>
              <div style={{gridColumn:2,gridRow:1,display:'flex'}}>
                <Poste id="_ide" label="IDE" color="#3b82f6"/>
              </div>
              <div style={{gridColumn:3,gridRow:1,display:'flex'}}>
                <Poste id="_med" label="Medecin" color="#0d9488"/>
              </div>
              <div style={{gridColumn:4,gridRow:1,display:'flex'}}>
                <Poste id="_as" label="AS" color="#f59e0b"/>
              </div>

              {/* Encadré Observation - col1 rows 2+3 */}
              <div style={{
                gridColumn:1, gridRow:'2/4',
                border:'2px solid #16a34a99',borderRadius:12,
                display:'flex',flexDirection:'column',gap:6,padding:6
              }}>
                <Case id="obs1" label="O1"/>
                <Case id="obs2" label="O2"/>
              </div>

              {/* Encadré Salle 2 - cols 2+3 rows 2+3 */}
              <div style={{
                gridColumn:'2/4', gridRow:'2/4',
                border:'2px solid #9ca3af99',borderRadius:12,
                display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:6,padding:6
              }}>
                <Case id="lit2" label="L2"/>
                <Case id="fauteuil1" label="F1"/>
                <Case id="fauteuil2" label="F2"/>
                <Case id="lit1" label="L1"/>
              </div>

              {/* Encadré Dechocage - col4 rows 2+3 */}
              <div style={{
                gridColumn:4, gridRow:'2/4',
                border:'2px solid #ef444499',borderRadius:12,
                display:'flex',flexDirection:'column',gap:6,padding:6
              }}>
                <Case id="brancard1" label="B1"/>
                <Case id="brancard2" label="B2"/>
              </div>

            </div>
          </div>

        </div>

        {/* EN ATTENTE */}
        <div style={{width:210,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',padding:'1rem',display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:preau.length>0?'#f59e0b':'#e5e7eb'}}/>
            <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>En attente</span>
            {preau.length>0&&<span style={{background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{preau.length}</span>}
            
          </div>
          <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:6,overflowY:'auto'}}>
            {preau.map(p=>{
              const placesLibres=[
                {id:'brancard1',l:'B1'},{id:'brancard2',l:'B2'},
                {id:'fauteuil1',l:'F1'},{id:'fauteuil2',l:'F2'},
                {id:'obs1',l:'O1'},{id:'obs2',l:'O2'},
                {id:'lit1',l:'L1'},{id:'lit2',l:'L2'},
                {id:'pansement',l:'P1'},
              ].filter(x=>!enSalle.find(pt=>pt.emplacement===x.id));
              return(
              <div key={p.id} style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 12px',flexShrink:0}}>
                <div style={{fontWeight:700,color:'#111827',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nom} {p.prenom}</div>
                <div style={{color:'#6b7280',fontSize:11,marginTop:2}}>{p.symptome||p.motifPrincipal}</div>
                <div style={{color:'#9ca3af',fontSize:10,marginTop:1}}>{duree(p.arrivee)}</div>
                {p.emplacement_suggere&&<div style={{color:'#0d9488',fontSize:10,marginTop:1,fontWeight:600}}>Suggere : {p.emplacement_suggere}</div>}
                <div style={{display:'flex',gap:5,marginTop:8}}>
                  <select onChange={async e=>{
                    if(!e.target.value) return;
                    await patch(p.id,{statut:'attente_medecin',emplacement:e.target.value});
                    load();
                  }} defaultValue="" style={{flex:1,padding:'5px 4px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:10,background:'#fff',cursor:'pointer'}}>
                    <option value="">Installer...</option>
                    {placesLibres.map(x=><option key={x.id} value={x.id}>{x.l}</option>)}
                  </select>
                  <button onClick={()=>{setFicheOuverte(p);}} style={{padding:'4px 8px',borderRadius:6,background:'#0d9488',color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer',border:'none',flexShrink:0}}>
                    Cslt
                  </button>
                </div>
              </div>
            );})}
            {[...Array(Math.max(4-preau.length,1))].map((_,i)=>(
              <div key={'e'+i} onClick={()=>router.push('/nouveau-patient')} style={{flexShrink:0,minHeight:72,borderRadius:10,border:'1.5px dashed #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#0d9488'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}>
                <div style={{width:28,height:28,borderRadius:7,border:'1.5px dashed #d1d5db',display:'flex',alignItems:'center',justifyContent:'center',color:'#d1d5db',fontSize:18}}>+</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
