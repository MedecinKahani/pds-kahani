'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CRENEAUX = [
  { id: '07-13', label: '07h-13h' },
  { id: '13-19', label: '13h-19h' },
  { id: '19-07', label: '19h-07h' },
];

function fmtJour(jourStr) {
  const d = new Date(jourStr + 'T12:00:00Z');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' });
}

export default function UsageMedecins() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    if (u.matricule !== '023799') { router.push('/vueglobale'); return; }
    setUser(u);
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    setErreur('');
    try {
      const r = await fetch('/api/stats-usage');
      if (r.status === 401) { sessionStorage.clear(); window.location.href = '/login?expire=1'; return; }
      const d = await r.json();
      if (d.error) { setErreur(d.error); setData(null); }
      else setData(d);
    } catch (e) {
      setErreur('Erreur réseau');
    }
    setLoading(false);
  }

  if (!user) return null;

  return (
    <div style={{fontFamily:'system-ui', background:'#f3f4f6', minHeight:'100vh'}}>
      <nav style={{background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:56}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <button onClick={()=>router.push('/vueglobale')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>← Retour</button>
          <span style={{fontWeight:700, fontSize:15, color:'#111827'}}>Usage médecins — semaine</span>
        </div>
        <button onClick={charger} disabled={loading}
          style={{padding:'9px 20px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'default':'pointer',border:'none',opacity:loading?0.6:1}}>
          {loading?'...':'Actualiser'}
        </button>
      </nav>

      <div style={{maxWidth:640, margin:'0 auto', padding:'1.5rem 1rem'}}>
        <p style={{fontSize:12, color:'#9ca3af', marginBottom:16}}>
          Vert = créneau utilisé (≥5 patients avec prescription demandée et réalisée). Rouge = pas utilisé —
          les stats de passages/transferts de ce créneau sont silencieusement remplacées par la semaine précédente si possible.
        </p>

        {erreur && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',color:'#dc2626',fontSize:13,marginBottom:14}}>{erreur}</div>}

        {loading && !data && (
          <div style={{textAlign:'center', padding:'3rem 1rem', color:'#9ca3af', fontSize:13}}>Chargement...</div>
        )}

        {data && data.result && (
          <div style={{background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden'}}>
            <div style={{display:'grid', gridTemplateColumns:'110px repeat(3,1fr)', borderBottom:'1px solid #e5e7eb', background:'#f9fafb'}}>
              <div style={{padding:'8px 10px'}}/>
              {CRENEAUX.map(c => (
                <div key={c.id} style={{padding:'8px 10px', fontSize:11, fontWeight:700, color:'#6b7280', textAlign:'center'}}>{c.label}</div>
              ))}
            </div>
            {data.result.map(({ jour, creneaux }) => (
              <div key={jour} style={{display:'grid', gridTemplateColumns:'110px repeat(3,1fr)', borderBottom:'1px solid #f3f4f6', alignItems:'center'}}>
                <div style={{padding:'10px', fontSize:12, fontWeight:600, color:'#374151', textTransform:'capitalize'}}>{fmtJour(jour)}</div>
                {creneaux.map(c => (
                  <div key={c.creneau} style={{padding:8, display:'flex', justifyContent:'center'}}>
                    <div title={`${c.qualifies} patient(s) qualifiant(s)`}
                      style={{width:'100%', textAlign:'center', padding:'8px 4px', borderRadius:8, fontSize:12, fontWeight:700,
                        background: c.ok ? '#dcfce7' : '#fee2e2',
                        color: c.ok ? '#16a34a' : '#dc2626',
                        border: '1px solid ' + (c.ok ? '#bbf7d0' : '#fecaca')}}>
                      {c.ok ? '✓' : '✕'} {c.qualifies}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
