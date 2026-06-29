'use client';
import { useState, useEffect } from 'react';

export default function PrelevesPage() {
  const [preleves, setPreleves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prelev').then(r=>r.json()).then(d=>{
      setPreleves(d.preleves||[]);
      setLoading(false);
    });
  }, []);

  function dureeDepuis(ts) {
    const diff = Date.now() - ts;
    const h = Math.floor(diff/3600000);
    const j = Math.floor(h/24);
    if (j > 0) return `il y a ${j}j`;
    if (h > 0) return `il y a ${h}h`;
    return 'il y a < 1h';
  }

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:700,margin:'0 auto',padding:'1.5rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>🧪 Patients prélevés</h2>
            <p style={{fontSize:12,color:'#6b7280',margin:'4px 0 0'}}>Prélèvements Mamoudzou des 7 derniers jours</p>
          </div>
          <button onClick={()=>window.location.href='/vueglobale'}
            style={{padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb',cursor:'pointer'}}>
            ← Retour
          </button>
        </div>

        {loading && <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem'}}>Chargement...</div>}

        {!loading && preleves.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb'}}>
            Aucun prélèvement enregistré dans les 7 derniers jours
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {preleves.map((p,i) => (
            <div key={i} style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:'#111827'}}>{p.nom} {p.prenom}</div>
                  <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{p.age} ans · {p.ddn}</div>
                </div>
                <div style={{fontSize:11,color:'#9ca3af',textAlign:'right'}}>
                  <div>{dureeDepuis(p.ts)}</div>
                  <div style={{marginTop:2}}>{new Date(p.ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div style={{background:'#eff6ff',borderRadius:8,padding:'8px 12px'}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#3b82f6',textTransform:'uppercase',marginBottom:3}}>Téléphone</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#1e40af'}}>{p.tel||'—'}</div>
                </div>
                <div style={{background:'#f0fdf4',borderRadius:8,padding:'8px 12px'}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#16a34a',textTransform:'uppercase',marginBottom:3}}>Village / Quartier</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#166534'}}>{p.ville||'—'}</div>
                </div>
              </div>

              {(p.motif||p.diagnostic||p.anamnese) && (
                <div style={{borderTop:'1px solid #f3f4f6',paddingTop:8,marginTop:4}}>
                  {p.motif && <div style={{fontSize:11,color:'#374151',marginBottom:3}}><span style={{fontWeight:600}}>Motif :</span> {p.motif.replace(/_/g,' ')}</div>}
                  {p.diagnostic && <div style={{fontSize:11,color:'#374151',marginBottom:3}}><span style={{fontWeight:600}}>Diagnostic :</span> {p.diagnostic}</div>}
                  {p.anamnese && <div style={{fontSize:11,color:'#6b7280'}}><span style={{fontWeight:600}}>Motif :</span> {p.anamnese.slice(0,120)}{p.anamnese.length>120?'...':''}</div>}
                </div>
              )}

              <div style={{marginTop:8,fontSize:10,color:'#9ca3af'}}>Prélevé par {p.faitPar}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
