'use client';
import { useState, useEffect } from 'react';

const TYPE_LABEL = { bio:'Biologie', injection:'Injection', autre:'Autre soin' };
const TYPE_COLOR = { bio:'#3b82f6', injection:'#ea580c', autre:'#6b7280' };

export default function ActesIdePage() {
  const [actes, setActes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copie, setCopie] = useState(null);
  const [envoiId, setEnvoiId] = useState(null);
  const [user, setUser] = useState(null);
  const [voirTous, setVoirTous] = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (s) setUser(JSON.parse(s));
    charger();
  }, []);

  function charger() {
    setLoading(true);
    fetch('/api/actes-ide').then(r=>{
      if (r.status===401) { sessionStorage.clear(); window.location.href='/login?expire=1'; return null; }
      return r.json();
    }).then(d=>{
      if (!d) return;
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

  const monNom = user?.nom || user?.matricule || '';
  const affiches = voirTous ? actes : actes.filter(a=>!monNom || a.faitPar===monNom);

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:700,margin:'0 auto',padding:'1.5rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>💉 Actes IDE à coter dans DxCare</h2>
            <p style={{fontSize:12,color:'#6b7280',margin:'4px 0 0'}}>{voirTous?'Tous les actes en attente':'Vos actes en attente'} — cochez une fois saisi dans DxCare</p>
          </div>
          <button onClick={()=>window.location.href='/vueglobale'}
            style={{padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb',cursor:'pointer'}}>
            ← Retour
          </button>
        </div>

        <label style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:'#6b7280',cursor:'pointer'}}>
          <input type="checkbox" checked={voirTous} onChange={e=>setVoirTous(e.target.checked)}/>
          Voir aussi les actes des collègues
        </label>

        {loading && <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem'}}>Chargement...</div>}

        {!loading && affiches.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb'}}>
            Rien à coter — le cahier est vide 🎉
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {affiches.map(a=>(
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
                <span style={{fontSize:11,color:'#9ca3af'}}>{new Date(a.ts).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',',' à')}</span>
                {voirTous && a.faitPar && <span style={{fontSize:11,color:'#9ca3af'}}>· {a.faitPar}</span>}
              </div>
              <button onClick={()=>marquerCode(a.id)} disabled={envoiId===a.id}
                style={{padding:'7px 12px',borderRadius:7,background:'#f0fdf4',color:'#16a34a',fontSize:12,fontWeight:600,border:'1px solid #bbf7d0',cursor:envoiId===a.id?'not-allowed':'pointer',flexShrink:0}}>
                {envoiId===a.id?'...':'✓ Codé'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
