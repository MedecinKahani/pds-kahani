'use client';
import { useState, useEffect, useMemo } from 'react';

const TYPE_LABEL = { bio:'Biologie', injection:'Injection', autre:'Autre soin' };
const TYPE_COLOR = { bio:'#3b82f6', injection:'#ea580c', autre:'#6b7280' };

function creneau(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  const jour = h>=7 && h<19;
  // Le créneau nuit démarre à 19h et se termine à 7h le lendemain : on rattache
  // les heures 0h-6h59 au créneau nuit qui a commencé la veille au soir.
  const debut = new Date(d);
  if (jour) {
    debut.setHours(7,0,0,0);
  } else if (h>=19) {
    debut.setHours(19,0,0,0);
  } else {
    debut.setDate(debut.getDate()-1);
    debut.setHours(19,0,0,0);
  }
  const fin = new Date(debut);
  fin.setHours(debut.getHours()+12);
  const fmt = x=>x.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
  return {
    cle: debut.getTime(),
    jour,
    label: (jour?'☀️ Jour':'🌙 Nuit')+' · '+fmt(debut)+' '+(jour?'7h':'19h')+' → '+fmt(fin)+' '+(jour?'19h':'7h'),
  };
}

export default function ActesIdePage() {
  const [actes, setActes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copie, setCopie] = useState(null);
  const [envoiId, setEnvoiId] = useState(null);

  useEffect(() => { charger(); }, []);

  function charger() {
    setLoading(true);
    fetch('/api/actes-ide').then(r=>r.json()).then(d=>{
      setActes(d.actes||[]);
      setLoading(false);
    });
  }

  function copier(ipp) {
    navigator.clipboard?.writeText(ipp).then(()=>{
      setCopie(ipp);
      setTimeout(()=>setCopie(c=>c===ipp?null:c), 1500);
    });
  }

  async function marquerCode(id) {
    setEnvoiId(id);
    await fetch('/api/actes-ide', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'coder', id })
    });
    setActes(a=>a.filter(x=>x.id!==id));
    setEnvoiId(null);
  }

  const groupes = useMemo(()=>{
    const map = new Map();
    for (const a of actes) {
      const c = creneau(a.ts);
      if (!map.has(c.cle)) map.set(c.cle, {label:c.label, jour:c.jour, items:[]});
      map.get(c.cle).items.push(a);
    }
    return [...map.entries()].sort((x,y)=>y[0]-x[0]).map(([,v])=>v);
  }, [actes]);

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:700,margin:'0 auto',padding:'1.5rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>💉 Actes IDE à coter dans DxCare</h2>
            <p style={{fontSize:12,color:'#6b7280',margin:'4px 0 0'}}>Actes réalisés hors passage médecin — cochez une fois saisi dans DxCare</p>
          </div>
          <button onClick={()=>window.location.href='/vueglobale'}
            style={{padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb',cursor:'pointer'}}>
            ← Retour
          </button>
        </div>

        {loading && <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem'}}>Chargement...</div>}

        {!loading && actes.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb'}}>
            Rien à coter — le cahier est vide 🎉
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {groupes.map(g=>(
            <div key={g.label}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:g.jour?'#b45309':'#4338ca',background:g.jour?'#fffbeb':'#eef2ff',border:'1px solid '+(g.jour?'#fde68a':'#c7d2fe'),borderRadius:7,padding:'4px 10px'}}>
                  {g.label}
                </span>
                <span style={{fontSize:11,color:'#9ca3af'}}>{g.items.length} acte{g.items.length>1?'s':''}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {g.items.map(a=>(
                  <div key={a.id} style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flex:1,minWidth:0}}>
                      <button onClick={()=>copier(a.ipp)} title="Copier l'IPP"
                        style={{padding:'6px 10px',borderRadius:7,border:'1px solid '+(copie===a.ipp?'#0d9488':'#e5e7eb'),
                          background:copie===a.ipp?'#0d9488':'#f9fafb',color:copie===a.ipp?'#fff':'#111827',
                          fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:5}}>
                        {copie===a.ipp?'✓ Copié':'⧉'} IPP {a.ipp||'—'}
                      </button>
                      <span style={{background:TYPE_COLOR[a.type]+'18',color:TYPE_COLOR[a.type]||'#6b7280',fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99}}>
                        {TYPE_LABEL[a.type]||a.type||'—'}
                      </span>
                      {a.sexe && <span style={{fontSize:12,color:'#6b7280'}}>{a.sexe==='M'?'♂':'♀'}</span>}
                      {a.note && <span style={{fontSize:12,color:'#374151'}}>{a.note}</span>}
                      <span style={{fontSize:11,color:'#9ca3af'}}>{new Date(a.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                      {a.faitPar && <span style={{fontSize:11,color:'#9ca3af'}}>· {a.faitPar}</span>}
                    </div>
                    <button onClick={()=>marquerCode(a.id)} disabled={envoiId===a.id}
                      style={{padding:'7px 12px',borderRadius:7,background:'#f0fdf4',color:'#16a34a',fontSize:12,fontWeight:600,border:'1px solid #bbf7d0',cursor:envoiId===a.id?'not-allowed':'pointer',flexShrink:0}}>
                      {envoiId===a.id?'...':'✓ Codé'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

