'use client';
import { useState, useEffect, useMemo } from 'react';

function genId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
}

const FORM_VIDE = { ipp:'', ddn:'', sexe:'', tel:'', ville:'', faitPar:'' };
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function parseDdnParts(ddn) {
  if (!ddn) return null;
  const sep = ddn.includes('-') ? '-' : ddn.includes('/') ? '/' : null;
  if (!sep) return null;
  const parts = ddn.split(sep);
  if (parts.length !== 3) return null;
  // JJ/MM/AAAA ou AAAA-MM-JJ
  const [a,b,c] = parts;
  if (a.length === 4) return { j:c, m:b, a }; // AAAA-MM-JJ
  return { j:a, m:b, a:c }; // JJ/MM/AAAA
}

function formatDdn(ddn) {
  const p = parseDdnParts(ddn);
  if (!p) return ddn || '—';
  return `${p.j.padStart(2,'0')}/${p.m.padStart(2,'0')}/${p.a}`;
}

function calcAge(ddn) {
  const p = parseDdnParts(ddn);
  if (!p) return null;
  const d = new Date(`${p.a}-${p.m}-${p.j}`);
  if (isNaN(d)) return null;
  const age = Math.floor((Date.now()-d.getTime())/(365.25*24*3600*1000));
  return age >= 0 && age < 130 ? age : null;
}

function startOfWeek(offsetWeeks) {
  const now = new Date();
  const day = now.getDay(); // 0=dim..6=sam
  const diffToMonday = day===0 ? -6 : 1-day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate()+diffToMonday+offsetWeeks*7);
  monday.setHours(0,0,0,0);
  return monday;
}

function memeJour(ts, date) {
  const d = new Date(ts);
  return d.getFullYear()===date.getFullYear() && d.getMonth()===date.getMonth() && d.getDate()===date.getDate();
}

export default function PrelevesPage() {
  const [preleves, setPreleves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAjout, setShowAjout] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [offset, setOffset] = useState(0);
  const [copie, setCopie] = useState(null);

  useEffect(() => {
    charger();
    const s = sessionStorage.getItem('pds_user');
    if (s) {
      const u = JSON.parse(s);
      setForm(f=>({...f, faitPar: u.nom || u.matricule || ''}));
    }
  }, []);

  function charger() {
    setLoading(true);
    fetch('/api/prelev').then(r=>r.json()).then(d=>{
      setPreleves(d.preleves||[]);
      setLoading(false);
    });
  }

  async function enregistrerManuel() {
    if (!form.ipp.trim() || !form.tel.trim()) return;
    setEnvoi(true);
    await fetch('/api/prelev', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        id: genId(),
        ts: Date.now(),
        ipp: form.ipp.trim(),
        ddn: form.ddn.trim(),
        sexe: form.sexe,
        tel: form.tel.trim(),
        ville: form.ville.trim(),
        faitPar: form.faitPar.trim() || '?',
        manuel: true,
      })
    });
    setEnvoi(false);
    setShowAjout(false);
    setForm(f=>({...FORM_VIDE, faitPar: f.faitPar}));
    charger();
  }

  function copier(p) {
    const txt = `IPP ${p.ipp||'—'} — ${p.tel||'—'}`;
    navigator.clipboard?.writeText(txt).then(()=>{
      setCopie(p.id);
      setTimeout(()=>setCopie(c=>c===p.id?null:c), 1500);
    });
  }

  const monday = useMemo(()=>startOfWeek(offset), [offset]);
  const jours = useMemo(()=>Array.from({length:7},(_,i)=>{
    const d = new Date(monday);
    d.setDate(monday.getDate()+i);
    return d;
  }), [monday]);

  const rangeLabel = `${jours[0].toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} – ${jours[6].toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}`;

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:1300,margin:'0 auto',padding:'1.5rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>🧪 Patients prélevés</h2>
            <p style={{fontSize:12,color:'#6b7280',margin:'4px 0 0'}}>Prélèvements Mamoudzou — conservés 7 jours</p>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowAjout(true)}
              style={{padding:'8px 16px',borderRadius:8,background:'#ea580c',color:'#fff',fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
              ✍️ + Ajouter (panne)
            </button>
            <button onClick={()=>window.location.href='/vueglobale'}
              style={{padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb',cursor:'pointer'}}>
              ← Retour
            </button>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14,marginBottom:14}}>
          <button onClick={()=>setOffset(o=>o-1)}
            style={{width:32,height:32,borderRadius:8,background:'#fff',border:'1px solid #e5e7eb',cursor:'pointer',fontSize:14,color:'#374151'}}>
            ←
          </button>
          <div style={{fontSize:13,fontWeight:700,color:'#111827',minWidth:180,textAlign:'center'}}>
            {rangeLabel}
            {offset!==0 && (
              <button onClick={()=>setOffset(0)}
                style={{marginLeft:10,fontSize:11,fontWeight:600,color:'#0d9488',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:6,padding:'2px 8px',cursor:'pointer'}}>
                Aujourd'hui
              </button>
            )}
          </div>
          <button onClick={()=>setOffset(o=>Math.min(o+1,0))} disabled={offset>=0}
            style={{width:32,height:32,borderRadius:8,background:'#fff',border:'1px solid #e5e7eb',cursor:offset>=0?'not-allowed':'pointer',fontSize:14,color:offset>=0?'#d1d5db':'#374151'}}>
            →
          </button>
        </div>

        {loading && <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem'}}>Chargement...</div>}

        {!loading && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, minmax(0,1fr))',gap:8}}>
            {jours.map((date,i)=>{
              const aujourdhui = memeJour(Date.now(), date);
              const items = preleves.filter(p=>memeJour(p.ts, date)).sort((a,b)=>a.ts-b.ts);
              return (
                <div key={i} style={{background:'#fff',borderRadius:12,border:aujourdhui?'1.5px solid #0d9488':'1px solid #e5e7eb',display:'flex',flexDirection:'column',minHeight:180}}>
                  <div style={{padding:'8px 10px',borderBottom:'1px solid #e5e7eb',background:aujourdhui?'#f0fdfa':'#fafafa',borderRadius:'12px 12px 0 0',textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:700,color:aujourdhui?'#0d9488':'#374151'}}>{JOURS[i]}</div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>{date.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</div>
                  </div>
                  <div style={{flex:1,padding:6,display:'flex',flexDirection:'column',gap:6}}>
                    {items.length===0 && (
                      <div style={{fontSize:10,color:'#d1d5db',textAlign:'center',padding:'12px 4px'}}>—</div>
                    )}
                    {items.map(p=>{
                      const age = calcAge(p.ddn);
                      return (
                        <div key={p.id} style={{background:'#f9fafb',borderRadius:8,border:p.manuel?'1px solid #fed7aa':'1px solid #e5e7eb',padding:'7px 8px',position:'relative'}}>
                          <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'#111827'}}>
                            <span>{p.sexe==='M'?'♂':p.sexe==='F'?'♀':'—'}</span>
                            <span>{age!=null?age+'a':''}</span>
                          </div>
                          <div style={{fontSize:10,color:'#6b7280',marginTop:1}}>{formatDdn(p.ddn)}</div>
                          <div style={{fontSize:12,fontWeight:700,color:'#111827',marginTop:3}}>IPP {p.ipp||'—'}</div>
                          <div style={{fontSize:11,fontWeight:600,color:'#1e40af',marginTop:2}}>{p.tel||'—'}</div>
                          <div style={{fontSize:10,color:'#166534',marginTop:1}}>{p.ville||'—'}</div>
                          {p.manuel && <div style={{fontSize:9,fontWeight:700,color:'#c2410c',marginTop:3}}>✍️ panne</div>}
                          <button onClick={()=>copier(p)} title="Copier IPP + téléphone"
                            style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:5,border:'none',cursor:'pointer',
                              background:copie===p.id?'#0d9488':'#e5e7eb',color:copie===p.id?'#fff':'#6b7280',fontSize:10,fontWeight:700,lineHeight:'20px',padding:0}}>
                            {copie===p.id?'✓':'⧉'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAjout && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}}>
          <div style={{background:'#fff',borderRadius:14,padding:20,width:'100%',maxWidth:420,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontWeight:700,fontSize:15,color:'#111827',marginBottom:4}}>✍️ Ajouter un patient prélevé (panne)</div>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:14,lineHeight:1.4}}>
              À utiliser quand le système est inaccessible (panne informatique) : notez l'IPP (voir étiquette DxCare), le téléphone et l'adresse du patient prélevé pour pouvoir le recontacter.
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>IPP *</label>
            <input value={form.ipp} onChange={e=>setForm({...form,ipp:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>DDN</label>
                <input value={form.ddn} onChange={e=>setForm({...form,ddn:e.target.value})} placeholder="JJ/MM/AAAA"
                  style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Sexe</label>
                <div style={{display:'flex',gap:6,marginTop:4}}>
                  <button onClick={()=>setForm({...form,sexe:'M'})} type="button"
                    style={{flex:1,padding:'9px',borderRadius:7,border:'1.5px solid '+(form.sexe==='M'?'#3b82f6':'#e5e7eb'),background:form.sexe==='M'?'#eff6ff':'#fff',color:form.sexe==='M'?'#3b82f6':'#374151',fontWeight:600,fontSize:13,cursor:'pointer'}}>♂</button>
                  <button onClick={()=>setForm({...form,sexe:'F'})} type="button"
                    style={{flex:1,padding:'9px',borderRadius:7,border:'1.5px solid '+(form.sexe==='F'?'#ec4899':'#e5e7eb'),background:form.sexe==='F'?'#fdf2f8':'#fff',color:form.sexe==='F'?'#ec4899':'#374151',fontWeight:600,fontSize:13,cursor:'pointer'}}>♀</button>
                </div>
              </div>
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Téléphone *</label>
            <input value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} type="tel"
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Village / Quartier / Adresse</label>
            <input value={form.ville} onChange={e=>setForm({...form,ville:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Enregistré par</label>
            <input value={form.faitPar} onChange={e=>setForm({...form,faitPar:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 14px',boxSizing:'border-box'}}/>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowAjout(false);setForm(f=>({...FORM_VIDE,faitPar:f.faitPar}));}}
                style={{flex:1,padding:'10px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:13,cursor:'pointer'}}>
                Annuler
              </button>
              <button onClick={enregistrerManuel} disabled={envoi||!form.ipp.trim()||!form.tel.trim()}
                style={{flex:1,padding:'10px',borderRadius:8,background:(envoi||!form.ipp.trim()||!form.tel.trim())?'#fdba74':'#ea580c',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:(envoi||!form.ipp.trim()||!form.tel.trim())?'not-allowed':'pointer'}}>
                {envoi?'Enregistrement...':'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
