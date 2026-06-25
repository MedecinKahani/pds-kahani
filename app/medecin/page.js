'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NORMES = {
  sat:[94,100], fc:[50,100], ta_sys:[90,150], ta_dia:[60,95], temp:[36,38.4], dextro:[0.7,2.0]
};

function isAnormal(val, k) {
  const v = parseFloat(val);
  if (isNaN(v)) return false;
  const [mn,mx] = NORMES[k]||[0,9999];
  return v<mn||v>mx;
}

function hasAnomalie(p) {
  return ['sat','fc','ta_sys','ta_dia','temp'].some(k => p[k] && isAnormal(p[k],k));
}

function duree(ts) {
  const m = Math.floor((Date.now()-parseInt(ts))/60000);
  return m<60 ? m+'min' : 'H'+Math.floor(m/60)+(m%60>0?'h'+(m%60):'');
}

const COULEURS = {
  pansement:'#f59e0b',
  obs1:'#9ca3af', lit2:'#9ca3af', fauteuil1:'#16a34a', brancard1:'#ef4444',
  obs2:'#16a34a', fauteuil2:'#16a34a', lit1:'#9ca3af',  brancard2:'#ef4444',
};

const BG_VIDE = {
  pansement:'#fffbeb',
  obs1:'#f9fafb', lit2:'#f9fafb', fauteuil1:'#f0fdf4', brancard1:'#fef2f2',
  obs2:'#f0fdf4', fauteuil2:'#f0fdf4', lit1:'#f9fafb',  brancard2:'#fef2f2',
};

// 3 lignes : postes puis 2 lignes de cases
const LIGNE0 = [
  {id:'pansement', label:'P1', nom:'Pansement'},
  {id:'_ide',  label:'IDE',     poste:true, color:'#6b7280'},
  {id:'_doc',  label:'Medecin', poste:true, color:'#0d9488'},
  {id:'_as',   label:'AS',      poste:true, color:'#f59e0b'},
];
const LIGNE1 = [
  {id:'obs1',      label:'O1', nom:'Observation 1'},
  {id:'lit2',      label:'L2', nom:'Lit 2'},
  {id:'fauteuil1', label:'F1', nom:'Fauteuil 1'},
  {id:'brancard1', label:'B1', nom:'Brancard 1'},
];
const LIGNE2 = [
  {id:'obs2',      label:'O2', nom:'Observation 2'},
  {id:'fauteuil2', label:'F2', nom:'Fauteuil 2'},
  {id:'lit1',      label:'L1', nom:'Lit 1'},
  {id:'brancard2', label:'B2', nom:'Brancard 2'},
];

const statutColor = {attente_medecin:'#f59e0b', en_cours:'#0d9488', vu:'#10b981', transfert:'#8b5cf6'};

export default function PageMedecin() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [sel, setSel] = useState(null);
  const [rx, setRx] = useState('');
  const [diag, setDiag] = useState('');
  const [orient, setOrient] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/patients');
    const d = await r.json();
    const ps = d.patients||[];
    setPatients(ps);
    if (sel) { const u=ps.find(p=>p.id===sel.id); if(u) setSel(u); }
  }, [sel?.id]);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    if (u.role!=='medecin') { router.push('/'); return; }
    setUser(u);
    load();
    const iv = setInterval(load, 8000);
    return ()=>clearInterval(iv);
  }, []);

  async function patch(id, data) {
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id,patch:data})});
    load();
  }

  async function addRx(id) {
    if(!rx.trim()) return;
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addPrescription',id,prescription:{texte:rx,auteur:user.matricule}})});
    setRx(''); load();
  }

  async function finaliser(id) {
    await patch(id,{diagnostic:diag,orientation:orient,statut:orient.startsWith('transfert')?'transfert':'vu'});
    if(orient==='sortie'||orient==='rdv_consultation'){
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discharge',id})});
    }
    setSel(null); setDiag(''); setOrient(''); load();
  }

  if(!user) return null;

  const preau = patients.filter(p=>p.statut==='preau');
  const enSalle = patients.filter(p=>p.statut!=='preau');

  function renderPoste(cell) {
    const isMedecin = cell.id === '_doc';
    const sessionNom = user?.nom || '';
    const sessionRole = user?.role || '';
    const showNom = (isMedecin && sessionRole==='medecin') ||
                    (cell.id==='_ide' && sessionRole==='ide') ||
                    (cell.id==='_as' && sessionRole==='as');
    return (
      <div key={cell.id} style={{
        flex:1, minHeight:0, borderRadius:10,
        background:'#fff', border:'1.5px solid '+(showNom?cell.color+'55':'#e5e7eb'),
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:5,
        padding:'0 8px'
      }}>
        <div style={{width:10,height:10,borderRadius:'50%',background:cell.color, flexShrink:0}}/>
        <span style={{fontSize:12,fontWeight:600,color:'#374151',textAlign:'center'}}>{cell.label}</span>
        {showNom && (
          <span style={{fontSize:11,color:cell.color,fontWeight:500,textAlign:'center',lineHeight:1.3}}>
            {isMedecin ? 'Dr '+sessionNom : sessionNom}
          </span>
        )}
      </div>
    );
  }

  function renderCase(cell) {
    const p = enSalle.find(x=>x.emplacement===cell.id);
    const c = COULEURS[cell.id]||'#9ca3af';
    const bgVide = BG_VIDE[cell.id]||'#f9fafb';
    const attente = p?.statut==='attente_medecin';
    const anomalie = p&&hasAnomalie(p);
    const isSelected = sel?.id===p?.id;

    return (
      <div key={cell.id} onClick={()=>{
        if(!p) return;
        setSel(isSelected?null:p);
        if(p.statut==='attente_medecin') patch(p.id,{statut:'en_cours'});
      }} style={{
        flex:1, minHeight:0,
        background: p ? '#fff' : bgVide,
        border: '2px solid '+(isSelected?c:p?c:c+'66'),
        borderRadius:10,
        cursor:p?'pointer':'default',
        transition:'all 0.15s',
        boxShadow:isSelected?'0 0 0 3px '+c+'22':'none',
        position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{padding:'7px 10px 3px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:800,fontSize:13,color:c}}>{cell.label}</span>
          {p&&(
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              {anomalie&&<span style={{fontSize:10,color:'#ef4444',fontWeight:700}}>!</span>}
              <div style={{width:6,height:6,borderRadius:'50%',background:statutColor[p.statut]||'#e5e7eb'}}/>
            </div>
          )}
        </div>

        {p ? (
          <div style={{padding:'0 10px 7px',flex:1,overflow:'hidden'}}>
            <div style={{fontWeight:700,color:'#111827',fontSize:12,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {p.nom} {p.prenom}
            </div>
            <div style={{color:'#6b7280',fontSize:10,marginTop:1}}>{p.age} ans{p.ipp?' - IPP '+p.ipp:''}</div>
            <div style={{color:'#374151',fontSize:10,marginTop:2,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.motifPrincipal}</div>
            <div style={{display:'flex',gap:3,marginTop:4,flexWrap:'wrap'}}>
              {p.sat&&<span style={{fontSize:9,fontWeight:600,color:isAnormal(p.sat,'sat')?'#ef4444':'#6b7280',background:isAnormal(p.sat,'sat')?'#fef2f2':'#f3f4f6',padding:'1px 4px',borderRadius:3}}>SpO2 {p.sat}%</span>}
              {p.fc&&<span style={{fontSize:9,fontWeight:600,color:isAnormal(p.fc,'fc')?'#ef4444':'#6b7280',background:isAnormal(p.fc,'fc')?'#fef2f2':'#f3f4f6',padding:'1px 4px',borderRadius:3}}>FC {p.fc}</span>}
              {p.temp&&<span style={{fontSize:9,fontWeight:600,color:isAnormal(p.temp,'temp')?'#ef4444':'#6b7280',background:isAnormal(p.temp,'temp')?'#fef2f2':'#f3f4f6',padding:'1px 4px',borderRadius:3}}>T {p.temp}</span>}
            </div>
            <div style={{position:'absolute',bottom:5,right:8,fontSize:9,color:'#9ca3af',fontWeight:600}}>{duree(p.arrivee)}</div>
            {attente&&<div style={{position:'absolute',bottom:5,left:8,background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:3,padding:'1px 4px',fontSize:8,fontWeight:700,color:'#d97706'}}>ATTEND</div>}
          </div>
        ) : (
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <button
              onClick={e=>{e.stopPropagation();router.push('/as?emplacement='+cell.id);}}
              onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.background=c+'20';e.currentTarget.style.borderStyle='solid';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='0.55';e.currentTarget.style.background='transparent';e.currentTarget.style.borderStyle='dashed';}}
              style={{
                width:32,height:32,borderRadius:8,
                background:'transparent',
                border:'1.5px dashed '+c,
                color:c,fontSize:18,fontWeight:300,
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',opacity:0.55,padding:0,
                transition:'opacity 0.15s, background 0.15s',
                lineHeight:1,
              }}
              title="Ajouter un patient"
            >+</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{height:'100vh',background:'#f3f4f6',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:56,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:700}}>P</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'#111827'}}>PDS Kahani</div>
            <div style={{fontSize:10,color:'#6b7280'}}>Medecin</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:600,color:'#111827',fontSize:13}}>Dr {user.nom}</div>
            <div style={{fontSize:11,color:'#6b7280'}}>{user.matricule}</div>
          </div>
          <button onClick={()=>{sessionStorage.clear();router.push('/login');}} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb'}}>Deconnexion</button>
        </div>
      </nav>

      <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

        {/* CENTRE : grille + fiche */}
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

          <div style={{width:sel?440:'100%',flexShrink:0,padding:'1.25rem',overflowY:'auto',transition:'width 0.25s',display:'flex',flexDirection:'column',minHeight:0}}>

            {/* GRILLE UNIQUE 4x3 avec contours salles */}
            <div style={{position:'relative',flex:1,minHeight:0}}>

              {/* Contours salles - positionnés absolument par dessus */}
              {/* P1 seul - col1, rows 1 */}
              <div style={{position:'absolute',pointerEvents:'none',zIndex:10,
                top:0, left:0,
                width:'calc(25% - 4px)',
                height:'calc(33.33% - 4px)',
                border:'2px solid #f59e0b66', borderRadius:14
              }}/>
              {/* Observation - col1, rows 2+3 */}
              <div style={{position:'absolute',pointerEvents:'none',zIndex:10,
                top:'calc(33.33% + 4px)', left:0,
                width:'calc(25% - 4px)',
                height:'calc(66.66% - 4px)',
                border:'2px solid #16a34a55', borderRadius:14
              }}/>
              {/* Salle 2 - cols 2+3, rows 2+3 */}
              <div style={{position:'absolute',pointerEvents:'none',zIndex:10,
                top:'calc(33.33% + 4px)', left:'calc(25% + 4px)',
                width:'calc(50% - 8px)',
                height:'calc(66.66% - 4px)',
                border:'2px solid #9ca3af55', borderRadius:14
              }}/>
              {/* Dechocage - col4, rows 2+3 */}
              <div style={{position:'absolute',pointerEvents:'none',zIndex:10,
                top:'calc(33.33% + 4px)', right:0,
                width:'calc(25% - 4px)',
                height:'calc(66.66% - 4px)',
                border:'2px solid #ef444455', borderRadius:14
              }}/>

              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(4,1fr)',
                gridTemplateRows:'repeat(3,1fr)',
                gap:8,
                height:'100%'
              }}>
                {LIGNE0.map(cell => cell.poste ? renderPoste(cell) : renderCase(cell))}
                {LIGNE1.map(cell => renderCase(cell))}
                {LIGNE2.map(cell => renderCase(cell))}
              </div>
            </div>

          </div>

          {/* FICHE PATIENT */}
          {sel&&(
            <div style={{width:380,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',overflowY:'auto',display:'flex',flexDirection:'column'}}>

              {/* Header patient style Odaiji */}
              <div style={{background:'#f0fdfa',padding:'1.25rem 1.25rem 1rem',borderBottom:'1px solid #e5e7eb'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:'#ccfbf1',border:'2px solid #5eead4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                      {sel.sexe==='F'?'F':'M'}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:16,color:'#111827',lineHeight:1.2}}>{sel.nom} {sel.prenom}</div>
                      <div style={{fontSize:12,color:'#6b7280',marginTop:3}}>{sel.age} ans - {sel.sexe==='F'?'Femme':'Homme'}</div>
                      {sel.ipp&&<div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>IPP {sel.ipp}</div>}
                    </div>
                  </div>
                  <button onClick={()=>setSel(null)} style={{width:28,height:28,borderRadius:'50%',background:'#e5e7eb',color:'#6b7280',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>x</button>
                </div>
                {sel.allergie==='Oui'&&(
                  <div style={{marginTop:10,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:14}}>!</span>
                    <span style={{color:'#dc2626',fontWeight:600,fontSize:12}}>Allergie : {sel.allergie_detail}</span>
                  </div>
                )}
              </div>

              <div style={{padding:'1rem 1.25rem',flex:1,display:'flex',flexDirection:'column',gap:16}}>

                {/* CONSTANTES */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Dernieres mesures</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                    {[
                      {k:'sat',  l:'Saturation', u:'%',    icon:'💧'},
                      {k:'fc',   l:'Freq. card.', u:'bpm', icon:'❤️'},
                      {k:'ta_sys',l:'PAS',        u:'mmHg',icon:'🩸'},
                      {k:'ta_dia',l:'PAD',        u:'mmHg',icon:'🩸'},
                      {k:'temp', l:'Temperature', u:'C',   icon:'🌡️'},
                      {k:'dextro',l:'Glycemie',   u:'g/L', icon:'💧'},
                    ].map(({k,l,u,icon})=>{
                      const bad = sel[k]&&isAnormal(sel[k],k);
                      return (
                        <div key={k} style={{background:bad?'#fef2f2':'#f9fafb',borderRadius:10,padding:'10px 8px',border:'1px solid '+(bad?'#fecaca':'#f3f4f6')}}>
                          <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                            <span style={{fontSize:12}}>{icon}</span>
                            <span style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>{l}</span>
                          </div>
                          <div style={{fontSize:18,fontWeight:700,color:bad?'#ef4444':sel[k]?'#111827':'#d1d5db',lineHeight:1}}>{sel[k]||'--'}</div>
                          <div style={{fontSize:9,color:'#9ca3af',marginTop:2}}>{u}{bad?' - Anormal':''}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* MOTIF */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Motif de consultation</div>
                  <div style={{background:'#f9fafb',borderRadius:10,padding:'12px',border:'1px solid #f3f4f6'}}>
                    <div style={{fontWeight:600,color:'#111827',fontSize:14}}>{sel.motifPrincipal||'--'}</div>
                    {sel.douleur_eva&&<div style={{color:'#6b7280',fontSize:12,marginTop:4}}>Douleur EVA {sel.douleur_eva}/10</div>}
                    {sel.fievre_depuis&&<div style={{color:'#f59e0b',fontSize:12,marginTop:4}}>Fievre depuis : {sel.fievre_depuis}</div>}
                    {sel.plaie_vaccin&&<div style={{color:'#6b7280',fontSize:12,marginTop:4}}>Vaccin : {sel.plaie_vaccin}</div>}
                    {sel.quicktest_tetanos&&<div style={{color:'#6b7280',fontSize:12,marginTop:2}}>Test tetanos : {sel.quicktest_tetanos}</div>}
                    {sel.bu_urine&&<div style={{color:'#8b5cf6',fontSize:12,marginTop:4}}>BU / bHCG : {sel.bhcg?'realise':'en attente'}</div>}
                    {sel.notes_as&&<div style={{color:'#6b7280',fontSize:12,marginTop:8,paddingTop:8,borderTop:'1px solid #e5e7eb',fontStyle:'italic'}}>Note AS : {sel.notes_as}</div>}
                  </div>
                </div>

                {/* ACTES */}
                {sel.actes&&JSON.parse(sel.actes||'[]').length>0&&(
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Actes realises</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {JSON.parse(sel.actes).map((a,i)=>(
                        <span key={i} style={{background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',fontSize:11,padding:'4px 10px',borderRadius:99,fontWeight:500}}>
                          {a.label} {new Date(a.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRESCRIPTIONS */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Prescriptions</div>
                  {sel.prescriptions&&JSON.parse(sel.prescriptions||'[]').map((p,i)=>(
                    <div key={i} style={{background:'#f9fafb',borderRadius:8,padding:'10px 12px',marginBottom:6,border:'1px solid #f3f4f6'}}>
                      <div style={{color:'#111827',fontSize:13}}>{p.texte}</div>
                      <div style={{color:'#9ca3af',fontSize:10,marginTop:3}}>{new Date(p.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <input value={rx} onChange={e=>setRx(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&addRx(sel.id)}
                      placeholder="Ajouter une prescription..."
                      style={{flex:1,padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',color:'#111827',fontSize:13,outline:'none'}}
                    />
                    <button onClick={()=>addRx(sel.id)} style={{padding:'10px 16px',borderRadius:8,background:'#0d9488',color:'#fff',fontWeight:600,fontSize:14}}>+</button>
                  </div>
                </div>

                {/* DIAGNOSTIC */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>Diagnostic et orientation</div>
                  <textarea value={diag} onChange={e=>setDiag(e.target.value)}
                    placeholder="Diagnostic..."
                    style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',color:'#111827',fontSize:13,minHeight:60,resize:'vertical',marginBottom:10,outline:'none',fontFamily:'inherit'}}
                  />
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
                    {[
                      {id:'sortie',        label:'Sortie',   icon:'✓'},
                      {id:'rdv_consultation',label:'RDV',    icon:'📅'},
                      {id:'transfert_CHM', label:'CHM',      icon:'🚑'},
                      {id:'transfert_SMUR',label:'SMUR',     icon:'🚨'},
                      {id:'hospitalisation',label:'Hospi',   icon:'🏥'},
                    ].map(o=>(
                      <button key={o.id} onClick={()=>setOrient(o.id)} style={{
                        padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,
                        background:orient===o.id?'#0d9488':'#fff',
                        color:orient===o.id?'#fff':'#374151',
                        border:'1.5px solid '+(orient===o.id?'#0d9488':'#e5e7eb'),
                        display:'flex',alignItems:'center',gap:4
                      }}><span>{o.icon}</span>{o.label}</button>
                    ))}
                  </div>
                  <button onClick={()=>finaliser(sel.id)} disabled={!diag||!orient} style={{
                    width:'100%',padding:'13px',borderRadius:10,
                    background:!diag||!orient?'#f3f4f6':'#0d9488',
                    color:!diag||!orient?'#9ca3af':'#fff',
                    fontSize:14,fontWeight:700,
                    border:'none',cursor:!diag||!orient?'default':'pointer'
                  }}>
                    Finaliser la prise en charge
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* PREAU colonne droite */}
        <div style={{width:220,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',padding:'1rem',overflowY:'auto',display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:preau.length>0?'#f59e0b':'#e5e7eb'}}/>
            <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>En attente</span>
            {preau.length>0&&<span style={{marginLeft:'auto',background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{preau.length}</span>}
          </div>
          {/* Slots fixes en attente - toujours 4 visibles */}
          <div style={{display:'flex',flexDirection:'column',gap:6,flex:1,minHeight:0}}>
            {[0,1,2,3].map(i => {
              const p = preau[i];
              return p ? (
                <div key={p.id} style={{
                  background:'#fffbeb',border:'1px solid #fde68a',
                  borderRadius:10,padding:'10px 12px',flex:1,
                  display:'flex',flexDirection:'column',justifyContent:'space-between'
                }}>
                  <div>
                    <div style={{fontWeight:700,color:'#111827',fontSize:12,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nom} {p.prenom}</div>
                    <div style={{color:'#6b7280',fontSize:11,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.motifPrincipal}</div>
                    <div style={{color:'#9ca3af',fontSize:10,marginTop:2}}>{duree(p.arrivee)}</div>
                  </div>
                  <button onClick={async()=>{
                    await patch(p.id,{statut:'attente_medecin',emplacement:p.emplacement_suggere||'lit1'});
                    setSel(p); load();
                  }} style={{marginTop:6,padding:'5px',borderRadius:6,background:'#0d9488',color:'#fff',fontSize:11,fontWeight:600,width:'100%'}}>
                    Faire rentrer
                  </button>
                </div>
              ) : (
                <div key={i} style={{
                  flex:1,borderRadius:10,
                  border:'1.5px dashed #e5e7eb',
                  background:'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center'
                }}>
                  <span style={{color:'#e5e7eb',fontSize:11}}>--</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
