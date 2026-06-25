'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NORMES = { sat:[94,100], fc:[50,100], ta_sys:[90,150], ta_dia:[60,95], temp:[36,38.4], dextro:[0.7,2.0] };
function isAnormal(val,k){const v=parseFloat(val);if(isNaN(v))return false;const[mn,mx]=NORMES[k]||[0,9999];return v<mn||v>mx;}
function hasAnomalie(p){return['sat','fc','ta_sys','ta_dia','temp'].some(k=>p[k]&&isAnormal(p[k],k));}
function duree(ts){const m=Math.floor((Date.now()-parseInt(ts))/60000);return m<60?m+'min':'H'+Math.floor(m/60)+(m%60>0?'h'+(m%60):'');}

const statutColor = {attente_medecin:'#f59e0b',en_cours:'#0d9488',vu:'#10b981',transfert:'#8b5cf6'};
const LEGENDES = {pansement:'Pansement',obs1:'Lit obs',obs2:'Fauteuil obs',lit1:'Lit 1',lit2:'Lit 2',fauteuil1:'Fauteuil 1',fauteuil2:'Fauteuil 2',brancard1:'Brancard 1',brancard2:'Brancard 2'};

// Couleurs par case
const C = {
  pansement:'#f59e0b', obs1:'#9ca3af', obs2:'#16a34a',
  lit1:'#9ca3af', lit2:'#9ca3af', fauteuil1:'#16a34a', fauteuil2:'#16a34a',
  brancard1:'#ef4444', brancard2:'#ef4444'
};
const BG = {
  pansement:'#fffbeb', obs1:'#f9fafb', obs2:'#f0fdf4',
  lit1:'#f9fafb', lit2:'#f9fafb', fauteuil1:'#f0fdf4', fauteuil2:'#f0fdf4',
  brancard1:'#fef2f2', brancard2:'#fef2f2'
};

export default function PageMedecin() {
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [patients,setPatients] = useState([]);
  const [sel,setSel] = useState(null);
  const [rx,setRx] = useState('');
  const [diag,setDiag] = useState('');
  const [orient,setOrient] = useState('');

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
    if(u.role!=='medecin'){router.push('/');return;}
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
  const preau=patients.filter(p=>p.statut==='preau');
  const enSalle=patients.filter(p=>p.statut!=='preau');

  function couleurDuree(ts) {
    const h = (Date.now()-parseInt(ts)) / 3600000;
    if (h < 1) return {color:'#16a34a', bg:'#f0fdf4', label:'<1h'};
    if (h < 2) return {color:'#16a34a', bg:'#f0fdf4', label:'>1h'};
    if (h < 3) return {color:'#f59e0b', bg:'#fffbeb', label:'>2h'};
    if (h < 4) return {color:'#f59e0b', bg:'#fffbeb', label:'>3h'};
    if (h < 5) return {color:'#ef4444', bg:'#fef2f2', label:'>4h'};
    if (h < 6) return {color:'#ef4444', bg:'#fef2f2', label:'>5h'};
    return {color:'#ef4444', bg:'#fef2f2', label:'>6h'};
  }

  function Case({id,label}){
    const p=enSalle.find(x=>x.emplacement===id);
    const c=C[id]||'#9ca3af';
    const attente=p?.statut==='attente_medecin';
    const anomalie=p&&hasAnomalie(p);
    const isSelected=sel?.id===p?.id;
    const dureeInfo = p ? couleurDuree(p.arrivee) : null;
    const actes = p?.actes ? JSON.parse(p.actes) : [];
    const prescriptions = p?.prescriptions ? JSON.parse(p.prescriptions) : [];

    return(
      <div onClick={()=>{if(!p)return;setSel(isSelected?null:p);if(p.statut==='attente_medecin')patch(p.id,{statut:'en_cours'});}}
        style={{background:p?'#fff':BG[id]||'#fafafa',border:'2px solid '+(isSelected?c:p?c+'55':'#efefef'),borderRadius:12,cursor:p?'pointer':'default',transition:'all 0.15s',boxShadow:isSelected?'0 0 0 3px '+c+'22':'0 1px 3px rgba(0,0,0,0.04)',position:'relative',overflow:'hidden',flex:1,display:'flex',flexDirection:'column'}}>

        {/* Bande couleur top */}
        <div style={{height:3,background:p?c:c+'33',flexShrink:0}}/>

        {/* Label emplacement */}
        <div style={{padding:'6px 10px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontWeight:800,fontSize:11,color:c,letterSpacing:0.5}}>{label}</span>
            {!p&&<span style={{fontSize:9,color:'#c4c4c4'}}>{LEGENDES[id]}</span>}
          </div>
          {p&&<div style={{display:'flex',gap:4,alignItems:'center'}}>
            {anomalie&&<span style={{fontSize:10,color:'#ef4444',fontWeight:700}}>!</span>}
            <div style={{width:7,height:7,borderRadius:'50%',background:statutColor[p.statut]||'#e5e7eb',flexShrink:0}}/>
          </div>}
        </div>

        {p ? (
          <div style={{padding:'6px 10px 8px',flex:1,display:'flex',flexDirection:'column',gap:5,overflow:'hidden'}}>

            {/* Identite style Odaiji */}
            <div style={{borderBottom:'1px solid #f3f4f6',paddingBottom:5}}>
              <div style={{fontWeight:700,color:'#111827',fontSize:13,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nom} {p.prenom}</div>
              <div style={{display:'flex',gap:8,marginTop:2}}>
                <span style={{color:'#6b7280',fontSize:10}}>{p.age} ans</span>
                {p.ipp&&<span style={{color:'#9ca3af',fontSize:10}}>{p.ipp}</span>}
              </div>
            </div>

            {/* Motif */}
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontSize:10,color:'#374151',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.symptome||p.motifPrincipal||'--'}</span>
              {p.douleur_eva&&<span style={{fontSize:9,color:'#9ca3af',flexShrink:0}}>· EVA {p.douleur_eva}/10</span>}
            </div>

            {/* Constantes style Odaiji - icone + label + valeur */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
              {[
                {k:'sat',v:p.sat,l:'SpO2',u:'%',icon:'💧'},
                {k:'fc',v:p.fc,l:'FC',u:' bpm',icon:'❤️'},
                {k:'tas',v:p.tas,l:'PAS',u:' mmHg',icon:'🩸'},
                {k:'temp',v:p.temp,l:'T°',u:'°C',icon:'🌡️'},
              ].filter(x=>x.v).map(({k,v,l,u,icon})=>{
                const bad=isAnormal(v,k==='tas'?'ta_sys':k);
                return(
                  <div key={k} style={{background:bad?'#fef2f2':'#f9fafb',borderRadius:6,padding:'3px 6px',display:'flex',alignItems:'center',gap:3,border:'1px solid '+(bad?'#fecaca':'transparent')}}>
                    <span style={{fontSize:9}}>{icon}</span>
                    <div>
                      <div style={{fontSize:8,color:'#9ca3af',lineHeight:1}}>{l}</div>
                      <div style={{fontSize:11,fontWeight:700,color:bad?'#ef4444':'#111827',lineHeight:1.2}}>{v}<span style={{fontSize:8,fontWeight:400,color:'#9ca3af'}}>{u}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actes & prescriptions */}
            {(actes.length>0||prescriptions.length>0)&&(
              <div style={{borderTop:'1px solid #f3f4f6',paddingTop:4}}>
                <div style={{fontSize:8,color:'#9ca3af',marginBottom:2,textTransform:'uppercase',letterSpacing:0.5}}>Soins</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:2}}>
                  {prescriptions.slice(0,2).map((rx,i)=>(
                    <span key={i} style={{fontSize:8,color:'#2563eb',background:'#eff6ff',padding:'1px 5px',borderRadius:3,fontWeight:500,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{rx.texte}</span>
                  ))}
                  {actes.slice(0,3).map((a,i)=>(
                    <span key={i} style={{fontSize:8,color:'#16a34a',background:'#f0fdf4',padding:'1px 5px',borderRadius:3,fontWeight:500}}>✓ {a.label}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Duree */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto'}}>
              {attente&&<span style={{fontSize:8,fontWeight:700,color:'#d97706',background:'#fef3c7',padding:'1px 6px',borderRadius:3}}>EN ATTENTE</span>}
              <div style={{marginLeft:'auto',background:dureeInfo.bg,color:dureeInfo.color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99,border:'1px solid '+dureeInfo.color+'33'}}>{dureeInfo.label}</div>
            </div>

          </div>
        ):(
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <button onClick={e=>{e.stopPropagation();router.push('/as?emplacement='+id);}}
              onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.borderStyle='solid';e.currentTarget.style.background=c+'18';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='0.4';e.currentTarget.style.borderStyle='dashed';e.currentTarget.style.background='transparent';}}
              style={{width:30,height:30,borderRadius:8,background:'transparent',border:'1.5px dashed '+c,color:c,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:0.4,transition:'all 0.15s'}}>+</button>
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
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:56,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:700}}>P</div>
          <div><div style={{fontWeight:700,fontSize:15,color:'#111827'}}>PDS Kahani</div><div style={{fontSize:10,color:'#6b7280'}}>Medecin</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{textAlign:'right'}}><div style={{fontWeight:600,color:'#111827',fontSize:13}}>Dr {user.nom}</div><div style={{fontSize:11,color:'#6b7280'}}>{user.matricule}</div></div>
          <button onClick={()=>router.push('/admin')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#9ca3af',fontSize:12,border:'1px solid #e5e7eb'}}>Admin</button>
          <button onClick={()=>{sessionStorage.clear();router.push('/login');}} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb'}}>Deconnexion</button>
        </div>
      </nav>

      <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
          <div style={{width:sel?420:'100%',flexShrink:0,padding:'1rem',display:'flex',flexDirection:'column',minHeight:0,transition:'width 0.25s'}}>

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
                <Poste id="_ide" label="IDE" color="#6b7280"/>
              </div>
              <div style={{gridColumn:3,gridRow:1,display:'flex'}}>
                <Poste id="_doc" label="Medecin" color="#0d9488"/>
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

          {/* FICHE */}
          {sel&&(
            <div style={{width:380,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',overflowY:'auto',display:'flex',flexDirection:'column'}}>
              <div style={{background:'#f0fdfa',padding:'1.25rem 1.25rem 1rem',borderBottom:'1px solid #e5e7eb'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:'#ccfbf1',border:'2px solid #5eead4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,fontWeight:700,color:'#0d9488'}}>{sel.sexe==='F'?'F':'M'}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:16,color:'#111827'}}>{sel.nom} {sel.prenom}</div>
                      <div style={{fontSize:12,color:'#6b7280',marginTop:3}}>{sel.age} ans · {sel.sexe==='F'?'Femme':'Homme'}</div>
                      {sel.ipp&&<div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>IPP {sel.ipp}</div>}
                    </div>
                  </div>
                  <button onClick={()=>setSel(null)} style={{width:28,height:28,borderRadius:'50%',background:'#e5e7eb',color:'#6b7280',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
                </div>
                {sel.allergie==='Oui'&&<div style={{marginTop:10,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}><span style={{color:'#dc2626',fontWeight:600,fontSize:12}}>Allergie : {sel.allergie_detail}</span></div>}
              </div>
              <div style={{padding:'1rem 1.25rem',flex:1,display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Dernieres mesures</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                    {[['sat','SpO2','%','💧'],['fc','FC','bpm','❤️'],['ta_sys','PAS','mmHg','🩸'],['ta_dia','PAD','mmHg','🩸'],['temp','T','C','🌡️'],['dextro','Glycemie','g/L','💧']].map(([k,l,u,icon])=>{
                      const bad=sel[k]&&isAnormal(sel[k],k);
                      return(<div key={k} style={{background:bad?'#fef2f2':'#f9fafb',borderRadius:10,padding:'8px',border:'1px solid '+(bad?'#fecaca':'#f3f4f6')}}>
                        <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:3}}><span style={{fontSize:11}}>{icon}</span><span style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase'}}>{l}</span></div>
                        <div style={{fontSize:17,fontWeight:700,color:bad?'#ef4444':sel[k]?'#111827':'#d1d5db'}}>{sel[k]||'--'}</div>
                        <div style={{fontSize:9,color:'#9ca3af'}}>{u}</div>
                      </div>);
                    })}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Motif</div>
                  <div style={{background:'#f9fafb',borderRadius:10,padding:'12px',border:'1px solid #f3f4f6'}}>
                    <div style={{fontWeight:600,color:'#111827',fontSize:14}}>{sel.motifPrincipal||'--'}</div>
                    {sel.douleur_eva&&<div style={{color:'#6b7280',fontSize:12,marginTop:4}}>EVA {sel.douleur_eva}/10</div>}
                    {sel.fievre_depuis&&<div style={{color:'#f59e0b',fontSize:12,marginTop:4}}>Fievre depuis : {sel.fievre_depuis}</div>}
                    {sel.notes_as&&<div style={{color:'#6b7280',fontSize:12,marginTop:6,fontStyle:'italic'}}>{sel.notes_as}</div>}
                  </div>
                </div>
                {sel.actes&&JSON.parse(sel.actes||'[]').length>0&&(
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Actes realises</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{JSON.parse(sel.actes).map((a,i)=><span key={i} style={{background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',fontSize:11,padding:'3px 8px',borderRadius:99,fontWeight:500}}>{a.label} {new Date(a.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>)}</div>
                  </div>
                )}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Prescriptions</div>
                  {sel.prescriptions&&JSON.parse(sel.prescriptions||'[]').map((p,i)=>(
                    <div key={i} style={{background:'#f9fafb',borderRadius:8,padding:'8px 10px',marginBottom:6,border:'1px solid #f3f4f6'}}>
                      <div style={{color:'#111827',fontSize:13}}>{p.texte}</div>
                      <div style={{color:'#9ca3af',fontSize:10,marginTop:2}}>{new Date(p.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <input value={rx} onChange={e=>setRx(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addRx(sel.id)} placeholder="Nouvelle prescription..." style={{flex:1,padding:'9px 11px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',color:'#111827',fontSize:13,outline:'none'}}/>
                    <button onClick={()=>addRx(sel.id)} style={{padding:'9px 14px',borderRadius:8,background:'#0d9488',color:'#fff',fontWeight:600,fontSize:13}}>+</button>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Diagnostic et orientation</div>
                  <textarea value={diag} onChange={e=>setDiag(e.target.value)} placeholder="Diagnostic..." style={{width:'100%',padding:'9px 11px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',color:'#111827',fontSize:13,minHeight:55,resize:'vertical',marginBottom:8,outline:'none',fontFamily:'inherit'}}/>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
                    {[{id:'sortie',label:'Sortie'},{id:'rdv_consultation',label:'RDV'},{id:'transfert_CHM',label:'CHM'},{id:'transfert_SMUR',label:'SMUR'},{id:'hospitalisation',label:'Hospi'}].map(o=>(
                      <button key={o.id} onClick={()=>setOrient(o.id)} style={{padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,background:orient===o.id?'#0d9488':'#fff',color:orient===o.id?'#fff':'#374151',border:'1.5px solid '+(orient===o.id?'#0d9488':'#e5e7eb')}}>{o.label}</button>
                    ))}
                  </div>
                  <button onClick={()=>finaliser(sel.id)} disabled={!diag||!orient} style={{width:'100%',padding:'12px',borderRadius:10,background:!diag||!orient?'#f3f4f6':'#0d9488',color:!diag||!orient?'#9ca3af':'#fff',fontSize:14,fontWeight:700}}>Finaliser la prise en charge</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EN ATTENTE */}
        <div style={{width:210,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',padding:'1rem',display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:preau.length>0?'#f59e0b':'#e5e7eb'}}/>
            <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>En attente</span>
            {preau.length>0&&<span style={{marginLeft:'auto',background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{preau.length}</span>}
          </div>
          <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:6,overflowY:'auto'}}>
            {preau.map(p=>(
              <div key={p.id} style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 12px',flexShrink:0}}>
                <div style={{fontWeight:700,color:'#111827',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nom} {p.prenom}</div>
                <div style={{color:'#6b7280',fontSize:11,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.motifPrincipal}</div>
                <div style={{color:'#9ca3af',fontSize:10,marginTop:2}}>{duree(p.arrivee)}</div>
                <button onClick={async()=>{await patch(p.id,{statut:'attente_medecin',emplacement:p.emplacement_suggere||'lit1'});setSel(p);load();}} style={{marginTop:8,padding:'5px',borderRadius:6,background:'#0d9488',color:'#fff',fontSize:11,fontWeight:600,width:'100%'}}>Faire rentrer</button>
              </div>
            ))}
            {[...Array(Math.max(4-preau.length,1))].map((_,i)=>(
              <div key={'e'+i} onClick={()=>router.push('/as')} style={{flexShrink:0,minHeight:72,borderRadius:10,border:'1.5px dashed #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
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
