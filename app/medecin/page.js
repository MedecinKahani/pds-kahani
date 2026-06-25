'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NORMES = {
  sat:[94,100], fc:[50,100], ta_sys:[90,150], ta_dia:[60,95], temp:[36,38.4], dextro:[0.7,2.0]
};

function isAnormal(val, k) {
  const v = parseFloat(val);
  if (isNaN(v)) return false;
  const [min,max] = NORMES[k]||[0,9999];
  return v<min||v>max;
}

function hasAnomalie(p) {
  return ['sat','fc','ta_sys','ta_dia','temp'].some(k => p[k] && isAnormal(p[k],k));
}

function duree(ts) {
  const m = Math.floor((Date.now()-parseInt(ts))/60000);
  return m<60?`${m}m`:`${Math.floor(m/60)}h${(m%60).toString().padStart(2,'0')}`;
}

const COULEURS = {
  brancard1:'#ef4444', brancard2:'#ef4444',
  lit1:'#3b82f6', lit2:'#3b82f6',
  fauteuil1:'#8b5cf6', fauteuil2:'#8b5cf6',
  obs1:'#10b981', obs2:'#10b981',
  pansement:'#f59e0b', consultation:'#6b7280'
};

const PLAN = [
  [
    {id:'pansement', label:'P1', nom:'Pansement'},
    null,
    null,
    null,
  ],
  [
    {id:'obs1', label:'O1', nom:'Observation 1'},
    {id:'lit2', label:'L2', nom:'Lit 2'},
    {id:'fauteuil1', label:'F1', nom:'Fauteuil 1', o2:true},
    {id:'brancard1', label:'B1', nom:'Brancard 1', urgent:true},
  ],
  [
    {id:'obs2', label:'O2', nom:'Observation 2'},
    {id:'fauteuil2', label:'F2', nom:'Fauteuil 2', o2:true},
    {id:'lit1', label:'L1', nom:'Lit 1'},
    {id:'brancard2', label:'B2', nom:'Brancard 2', urgent:true},
  ],
];

const NAV = {background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, flexShrink:0};

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
    if(!rx.trim())return;
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addPrescription',id,prescription:{texte:rx,auteur:user.matricule}})});
    setRx(''); load();
  }

  async function finaliser(id) {
    await patch(id,{diagnostic:diag,orientation:orient,statut:orient.startsWith('transfert')?'transfert':'vu'});
    if(orient==='sortie'||orient==='rdv_consultation'){
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discharge',id})});
    }
    setSel(null);setDiag('');setOrient('');load();
  }

  if(!user) return null;

  const preau = patients.filter(p=>p.statut==='preau');
  const enSalle = patients.filter(p=>p.statut!=='preau');
  const statutColor = {attente_medecin:'#f59e0b',en_cours:'#0d9488',vu:'#10b981',transfert:'#8b5cf6'};
  const statutLabel = {attente_medecin:'En attente',en_cours:'En cours',vu:'Vu',transfert:'Transfert'};

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',display:'flex',flexDirection:'column'}}>
      {/* NAV */}
      <nav style={NAV}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🩺</div>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:'#111827'}}>PDS Kahani</div>
            <div style={{fontSize:11,color:'#6b7280'}}>Médecin</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:600,color:'#111827',fontSize:14}}>Dr {user.nom}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{user.matricule}</div>
          </div>
          <button onClick={()=>{sessionStorage.clear();router.push('/login');}} style={{padding:'8px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb',fontWeight:500}}>Déconnexion</button>
        </div>
      </nav>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* PLAN + FICHE */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:preau.length>0?'#f59e0b':'#d1d5db'}}/>
            <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>Préau</span>
            {preau.length>0&&<span style={{marginLeft:'auto',background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{preau.length}</span>}
          </div>
          {preau.length===0?(
            <div style={{textAlign:'center',color:'#d1d5db',fontSize:12,padding:'2rem 0'}}>
              <div style={{fontSize:28,marginBottom:6}}>🌙</div>
              Aucun patient en attente
            </div>
          ):(
            preau.map(p=>(
              <div key={p.id} style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px',marginBottom:8}}>
                <div style={{fontWeight:700,color:'#111827',fontSize:13}}>{p.nom} {p.prenom}</div>
                <div style={{color:'#6b7280',fontSize:11,marginTop:2}}>{p.age} ans · {p.motifPrincipal}</div>
                <div style={{color:'#9ca3af',fontSize:11,marginTop:2}}>{duree(p.arrivee)}</div>
                {p.sat&&<div style={{color:parseFloat(p.sat)<94?'#ef4444':'#6b7280',fontSize:11,marginTop:2}}>SpO2 {p.sat}%</div>}
                <button onClick={async()=>{
                  await patch(p.id,{statut:'attente_medecin',emplacement:p.emplacement_suggere||'lit1'});
                  setSel(p);load();
                }} style={{
                  width:'100%',marginTop:10,padding:'7px',borderRadius:8,
                  background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600
                }}>
                  Faire rentrer →
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{width:sel?420:'100%',flexShrink:0,padding:'1.5rem',overflowY:'auto',transition:'width 0.25s'}}>

          {/* POSTE */}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'10px 16px',marginBottom:'1rem',display:'flex',alignItems:'center',gap:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:16}}>🖥️</span><span style={{color:'#6b7280',fontSize:12}}>IDE</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:16}}>🖥️</span><span style={{fontWeight:600,color:'#0d9488',fontSize:12}}>Médecin</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:16}}>🖥️</span><span style={{color:'#6b7280',fontSize:12}}>AS</span>
            </div>
            <div style={{marginLeft:'auto',color:'#9ca3af',fontSize:11}}>← Préau / Entrée</div>
          </div>

          {/* PLAN */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {PLAN.map((row,ri)=>(
              <div key={ri} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
                {row.map((cell,ci)=>{
                  if(!cell) return <div key={ci} style={{borderRadius:12,border:'2px dashed #e5e7eb',minHeight:90,background:'transparent'}}/>;
                  const p = enSalle.find(x=>x.emplacement===cell.id);
                  const c = COULEURS[cell.id]||'#6b7280';
                  const attente = p?.statut==='attente_medecin';
                  const anomalie = p&&hasAnomalie(p);
                  const isSelected = sel?.id===p?.id;

                  return (
                    <div key={ci} onClick={()=>{
                      if(!p)return;
                      setSel(isSelected?null:p);
                      if(p.statut==='attente_medecin') patch(p.id,{statut:'en_cours'});
                    }} style={{
                      background:p?'#fff':'#fafafa',
                      border:`2px solid ${isSelected?c:p?c+'33':'#e5e7eb'}`,
                      borderRadius:12, padding:'12px',
                      cursor:p?'pointer':'default',
                      minHeight:90, transition:'all 0.15s',
                      boxShadow:isSelected?`0 0 0 3px ${c}22`:p?'0 1px 3px rgba(0,0,0,0.06)':'none',
                      animation:attente?'pulse 2s infinite':'none',
                      position:'relative'
                    }}>
                      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 2px #f59e0b33}50%{box-shadow:0 0 0 4px #f59e0b55}}`}</style>

                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <span style={{fontWeight:800,fontSize:15,color:p?c:'#d1d5db'}}>{cell.label}</span>
                        {p&&(
                          <div style={{display:'flex',gap:4,alignItems:'center'}}>
                            {anomalie&&<span style={{fontSize:10,color:'#ef4444'}}>⚠️</span>}
                            <div style={{width:7,height:7,borderRadius:'50%',background:statutColor[p.statut]||'#e5e7eb'}}/>
                          </div>
                        )}
                      </div>

                      {p?(
                        <>
                          <div style={{fontWeight:600,fontSize:12,color:'#111827',lineHeight:1.3}}>
                            {p.nom} {p.prenom}
                          </div>
                          <div style={{color:'#6b7280',fontSize:11,marginTop:2}}>{p.motifPrincipal}</div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                            <span style={{fontSize:10,color:anomalie?'#ef4444':'#9ca3af'}}>
                              {p.sat&&`SpO2 ${p.sat}%`}
                            </span>
                            <span style={{fontSize:10,color:'#9ca3af'}}>{duree(p.arrivee)}</span>
                          </div>
                          {attente&&<div style={{position:'absolute',top:8,right:8,background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:4,padding:'1px 5px',fontSize:9,fontWeight:700,color:'#d97706'}}>ATTEND</div>}
                        </>
                      ):(
                        <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                          <div style={{color:'#d1d5db',fontSize:11}}>{cell.nom}{cell.o2?' · O₂':''}</div>
                          <button
                            onClick={e=>{e.stopPropagation();router.push('/as?emplacement='+cell.id);}}
                            style={{
                              width:28,height:28,borderRadius:'50%',
                              background:'#f3f4f6',border:'1.5px dashed #d1d5db',
                              color:'#9ca3af',fontSize:18,display:'flex',
                              alignItems:'center',justifyContent:'center',
                              alignSelf:'flex-end',cursor:'pointer',
                              transition:'all 0.15s'
                            }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#0d9488';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='#0d9488';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='#f3f4f6';e.currentTarget.style.color='#9ca3af';e.currentTarget.style.borderColor='#d1d5db';}}
                            title="Ajouter un patient ici"
                          >+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* LÉGENDE */}
          <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
            {[['#ef4444','Déchocage'],['#3b82f6','Lits'],['#8b5cf6','Fauteuils O₂'],['#10b981','Observation'],['#f59e0b','Pansement'],['#6b7280','Consultation']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5}}>
                <div style={{width:8,height:8,borderRadius:2,background:c}}/>
                <span style={{color:'#9ca3af',fontSize:11}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FICHE */}
        {sel&&(
          <div style={{flex:1,background:'#fff',borderLeft:'1px solid #e5e7eb',padding:'1.5rem',overflowY:'auto'}}>
            {/* Header patient */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdfa',border:'2px solid #99f6e4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                  {sel.sexe==='F'?'👩':'👨'}
                </div>
                <div>
                  <h2 style={{fontSize:18,fontWeight:700,color:'#111827'}}>{sel.nom} {sel.prenom}</h2>
                  <div style={{fontSize:13,color:'#6b7280',marginTop:1}}>{sel.age} ans · {sel.sexe==='F'?'Femme':'Homme'} · IPP {sel.ipp||'—'}</div>
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{width:32,height:32,borderRadius:'50%',background:'#f3f4f6',color:'#6b7280',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>

            {sel.allergie==='Oui'&&(
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>⚠️</span>
                <span style={{color:'#dc2626',fontWeight:600,fontSize:13}}>Allergie : {sel.allergie_detail}</span>
              </div>
            )}

            {/* CONSTANTES */}
            <div style={{background:'#f9fafb',borderRadius:10,padding:'1rem',marginBottom:'1rem',border:'1px solid #e5e7eb'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Constantes</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[['sat','SpO2','%'],['fc','FC','bpm'],['ta_sys','PAS','mmHg'],['ta_dia','PAD','mmHg'],['temp','T°','°C'],['dextro','Dextro','g/L']].map(([k,l,u])=>{
                  const bad = sel[k]&&isAnormal(sel[k],k);
                  return (
                    <div key={k} style={{background:'#fff',borderRadius:8,padding:'8px 10px',border:`1px solid ${bad?'#fecaca':'#e5e7eb'}`,textAlign:'center'}}>
                      <div style={{fontSize:10,color:'#9ca3af',marginBottom:2}}>{l}</div>
                      <div style={{fontSize:16,fontWeight:700,color:bad?'#ef4444':sel[k]?'#111827':'#d1d5db'}}>
                        {sel[k]||'—'}
                      </div>
                      <div style={{fontSize:10,color:'#9ca3af'}}>{u}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOTIF */}
            <div style={{background:'#f9fafb',borderRadius:10,padding:'1rem',marginBottom:'1rem',border:'1px solid #e5e7eb'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Motif</div>
              <div style={{fontWeight:600,color:'#111827',fontSize:14}}>{sel.motifPrincipal||'—'}</div>
              {sel.douleur_eva&&<div style={{color:'#6b7280',fontSize:13,marginTop:4}}>EVA {sel.douleur_eva}/10</div>}
              {sel.fievre_depuis&&<div style={{color:'#f59e0b',fontSize:13,marginTop:4}}>Fièvre depuis : {sel.fievre_depuis}</div>}
              {sel.plaie_vaccin&&<div style={{color:'#6b7280',fontSize:13,marginTop:4}}>Vaccin : {sel.plaie_vaccin} · Test tétanos : {sel.quicktest_tetanos||'non fait'}</div>}
              {sel.bu_urine&&<div style={{color:'#8b5cf6',fontSize:13,marginTop:4}}>BU · bHCG : {sel.bhcg?'fait':'en attente'}</div>}
              {sel.notes_as&&<div style={{color:'#6b7280',fontSize:13,marginTop:6,fontStyle:'italic',borderTop:'1px solid #e5e7eb',paddingTop:6}}>Note AS : {sel.notes_as}</div>}
            </div>

            {/* ACTES */}
            {sel.actes&&JSON.parse(sel.actes||'[]').length>0&&(
              <div style={{background:'#f0fdfa',borderRadius:10,padding:'1rem',marginBottom:'1rem',border:'1px solid #99f6e4'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#0f766e',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Actes réalisés</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {JSON.parse(sel.actes).map((a,i)=>(
                    <span key={i} style={{background:'#fff',border:'1px solid #99f6e4',color:'#0d9488',fontSize:11,padding:'3px 8px',borderRadius:99,fontWeight:500}}>
                      {a.label} · {new Date(a.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PRESCRIPTIONS */}
            <div style={{background:'#f9fafb',borderRadius:10,padding:'1rem',marginBottom:'1rem',border:'1px solid #e5e7eb'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Prescriptions</div>
              {sel.prescriptions&&JSON.parse(sel.prescriptions||'[]').map((p,i)=>(
                <div key={i} style={{background:'#fff',borderRadius:8,padding:'8px 12px',marginBottom:6,border:'1px solid #e5e7eb'}}>
                  <div style={{color:'#111827',fontSize:13}}>{p.texte}</div>
                  <div style={{color:'#9ca3af',fontSize:11,marginTop:2}}>{new Date(p.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              ))}
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <input value={rx} onChange={e=>setRx(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addRx(sel.id)}
                  placeholder="Prescription (Entrée pour valider)..."
                  style={{flex:1,padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',color:'#111827',fontSize:13,outline:'none'}}
                  onFocus={e=>e.target.style.borderColor='#0d9488'}
                  onBlur={e=>e.target.style.borderColor='#e5e7eb'}
                />
                <button onClick={()=>addRx(sel.id)} style={{padding:'10px 16px',borderRadius:8,background:'#0d9488',color:'#fff',fontWeight:600,fontSize:13}}>+</button>
              </div>
            </div>

            {/* DIAGNOSTIC & ORIENTATION */}
            <div style={{background:'#f9fafb',borderRadius:10,padding:'1rem',marginBottom:'1rem',border:'1px solid #e5e7eb'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Diagnostic & orientation</div>
              <textarea value={diag} onChange={e=>setDiag(e.target.value)}
                placeholder="Diagnostic..."
                style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',color:'#111827',fontSize:13,minHeight:60,resize:'vertical',marginBottom:10,outline:'none'}}
                onFocus={e=>e.target.style.borderColor='#0d9488'}
                onBlur={e=>e.target.style.borderColor='#e5e7eb'}
              />
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[
                  {id:'sortie',label:'Sortie',icon:'✓'},
                  {id:'rdv_consultation',label:'RDV cslt',icon:'📅'},
                  {id:'transfert_CHM',label:'CHM',icon:'🚑'},
                  {id:'transfert_SMUR',label:'SMUR',icon:'🚨'},
                  {id:'hospitalisation',label:'Hospi',icon:'🏥'},
                ].map(o=>(
                  <button key={o.id} onClick={()=>setOrient(o.id)} style={{
                    padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:600,
                    background:orient===o.id?'#0d9488':'#fff',
                    color:orient===o.id?'#fff':'#374151',
                    border:`1.5px solid ${orient===o.id?'#0d9488':'#e5e7eb'}`
                  }}>{o.icon} {o.label}</button>
                ))}
              </div>
            </div>

            <button onClick={()=>finaliser(sel.id)} disabled={!diag||!orient} style={{
              width:'100%',padding:'14px',borderRadius:10,
              background:!diag||!orient?'#e5e7eb':'#0d9488',
              color:!diag||!orient?'#9ca3af':'#fff',
              fontSize:14,fontWeight:700
            }}>
              ✓ Finaliser la prise en charge
            </button>
          </div>
        )}
        </div>

        {/* PRÉAU — colonne droite fixe */}
        <div style={{width:240,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',padding:'1rem',overflowY:'auto',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:preau.length>0?'#f59e0b':'#d1d5db'}}/>
            <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>Préau</span>
            {preau.length>0&&<span style={{marginLeft:'auto',background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{preau.length}</span>}
          </div>
          {preau.length===0?(
            <div style={{textAlign:'center',color:'#d1d5db',fontSize:12,padding:'2rem 0'}}>
              <div style={{fontSize:28,marginBottom:6}}>🌙</div>
              Aucun patient
            </div>
          ):(
            preau.map(p=>(
              <div key={p.id} style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px',marginBottom:8}}>
                <div style={{fontWeight:700,color:'#111827',fontSize:13}}>{p.nom} {p.prenom}</div>
                <div style={{color:'#6b7280',fontSize:11,marginTop:2}}>{p.age} ans · {p.motifPrincipal}</div>
                <div style={{color:'#9ca3af',fontSize:11,marginTop:2}}>{duree(p.arrivee)}</div>
                {p.sat&&<div style={{color:parseFloat(p.sat)<94?'#ef4444':'#6b7280',fontSize:11,marginTop:2}}>SpO2 {p.sat}%</div>}
                <button onClick={async()=>{
                  await patch(p.id,{statut:'attente_medecin',emplacement:p.emplacement_suggere||'lit1'});
                  setSel(p);load();
                }} style={{width:'100%',marginTop:10,padding:'7px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600}}>
                  Faire rentrer →
                </button>
              </div>
            ))
          )}
        </div>

        </div>
      </div>
    </div>
  );
}
