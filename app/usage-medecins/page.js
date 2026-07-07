'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CRENEAUX = [
  { id: '07-13', label: '07h - 13h' },
  { id: '13-19', label: '13h - 19h' },
  { id: '19-07', label: '19h - 07h' },
];

function fmtJour(jourStr) {
  const d = new Date(jourStr + 'T12:00:00Z');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
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
          <span style={{fontWeight:700, fontSize:15, color:'#111827'}}>Usage médecins par créneau — 7 derniers jours</span>
        </div>
        <button onClick={charger} disabled={loading}
          style={{padding:'9px 20px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'default':'pointer',border:'none',opacity:loading?0.6:1}}>
          {loading?'Calcul en cours...':'Calculer'}
        </button>
      </nav>

      <div style={{maxWidth:900, margin:'0 auto', padding:'1.5rem 1rem'}}>
        <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>
          Basé sur le journal d'audit (qui a modifié quoi et quand, identité vérifiée côté serveur).
          Un créneau marqué <strong style={{color:'#ef4444'}}>aucune activité médecin détectée</strong> signifie
          qu'aucune action d'un compte "médecin" n'a été enregistrée sur ce créneau — à recouper avec le planning
          de garde avant d'en tirer une conclusion (garde annulée, médecin ayant travaillé hors-ligne sur DxCare, etc.).
        </p>

        {erreur && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',color:'#dc2626',fontSize:13,marginBottom:14}}>{erreur}</div>}

        {!data && !loading && !erreur && (
          <div style={{textAlign:'center', padding:'3rem 1rem', color:'#9ca3af', fontSize:13}}>
            Cliquez sur "Calculer" — l'analyse parcourt le journal d'audit complet, ça peut prendre quelques secondes.
          </div>
        )}

        {loading && (
          <div style={{textAlign:'center', padding:'3rem 1rem', color:'#9ca3af', fontSize:13}}>Analyse du journal d'audit en cours...</div>
        )}

        {data && data.result && (
          <>
            <div style={{fontSize:11, color:'#9ca3af', marginBottom:10}}>
              {data.meta?.patientsAudites} dossiers audités · {data.meta?.entriesVues} actions sur 7 jours
            </div>
            {data.result.map(({ jour, creneaux }) => (
              <div key={jour} style={{background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', marginBottom:12, overflow:'hidden'}}>
                <div style={{background:'#f9fafb', padding:'8px 14px', borderBottom:'1px solid #e5e7eb', fontWeight:700, fontSize:13, color:'#374151', textTransform:'capitalize'}}>
                  {fmtJour(jour)}
                </div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)'}}>
                  {creneaux.map(c => (
                    <div key={c.id||c.creneau} style={{padding:'10px 14px', borderRight:'1px solid #f3f4f6'}}>
                      <div style={{fontSize:11, fontWeight:700, color:'#9ca3af', marginBottom:6}}>
                        {CRENEAUX.find(x=>x.id===c.creneau)?.label || c.creneau}
                      </div>
                      {c.actifMedecin ? (
                        c.medecins.map(m => (
                          <div key={m.matricule} style={{fontSize:12, color:'#16a34a', fontWeight:600, marginBottom:2}}>
                            ✓ {m.nom} <span style={{color:'#9ca3af', fontWeight:400}}>({m.n})</span>
                          </div>
                        ))
                      ) : (
                        <div style={{fontSize:12, color:'#ef4444', fontWeight:700}}>Aucune activité médecin détectée</div>
                      )}
                      {c.autres.length>0 && (
                        <div style={{fontSize:10, color:'#9ca3af', marginTop:4}}>
                          Autres : {c.autres.map(a=>`${a.nom} (${a.n})`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
