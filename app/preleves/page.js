'use client';
import { useState, useEffect } from 'react';

function genId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
}

const FORM_VIDE = { nom:'', prenom:'', tel:'', ville:'', note:'', faitPar:'' };

export default function PrelevesPage() {
  const [preleves, setPreleves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAjout, setShowAjout] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);

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

  function dureeDepuis(ts) {
    const diff = Date.now() - ts;
    const h = Math.floor(diff/3600000);
    const j = Math.floor(h/24);
    if (j > 0) return `il y a ${j}j`;
    if (h > 0) return `il y a ${h}h`;
    return 'il y a < 1h';
  }

  async function enregistrerManuel() {
    if (!form.nom.trim() || !form.tel.trim()) return;
    setEnvoi(true);
    await fetch('/api/prelev', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        id: genId(),
        ts: Date.now(),
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        tel: form.tel.trim(),
        ville: form.ville.trim(),
        note: form.note.trim(),
        faitPar: form.faitPar.trim() || '?',
        manuel: true,
      })
    });
    setEnvoi(false);
    setShowAjout(false);
    setForm(f=>({...FORM_VIDE, faitPar: f.faitPar}));
    charger();
  }

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:700,margin:'0 auto',padding:'1.5rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>🧪 Patients prélevés</h2>
            <p style={{fontSize:12,color:'#6b7280',margin:'4px 0 0'}}>Prélèvements Mamoudzou des 7 derniers jours</p>
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

        {loading && <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem'}}>Chargement...</div>}

        {!loading && preleves.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:'3rem',background:'#fff',borderRadius:12,border:'1px solid #e5e7eb'}}>
            Aucun prélèvement enregistré dans les 7 derniers jours
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {preleves.map((p,i) => (
            <div key={i} style={{background:'#fff',borderRadius:12,border:p.manuel?'1px solid #fed7aa':'1px solid #e5e7eb',padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:'#111827'}}>{p.nom} {p.prenom}</div>
                  {(p.age||p.ddn) && <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{p.age?`${p.age} ans`:''}{p.age&&p.ddn?' · ':''}{p.ddn||''}</div>}
                  {p.manuel && <div style={{fontSize:10,fontWeight:700,color:'#c2410c',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:5,padding:'2px 6px',display:'inline-block',marginTop:4}}>✍️ Saisie manuelle (panne)</div>}
                  {p.minimise && <div style={{fontSize:10,fontWeight:700,color:'#6b7280',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:5,padding:'2px 6px',display:'inline-block',marginTop:4}}>🔒 Infos allégées après 24h (seuls tél/adresse conservés)</div>}
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

              {(p.motif||p.diagnostic||p.anamnese||p.note) && (
                <div style={{borderTop:'1px solid #f3f4f6',paddingTop:8,marginTop:4}}>
                  {p.motif && <div style={{fontSize:11,color:'#374151',marginBottom:3}}><span style={{fontWeight:600}}>Motif :</span> {p.motif.replace(/_/g,' ')}</div>}
                  {p.diagnostic && <div style={{fontSize:11,color:'#374151',marginBottom:3}}><span style={{fontWeight:600}}>Diagnostic :</span> {p.diagnostic}</div>}
                  {p.anamnese && <div style={{fontSize:11,color:'#6b7280'}}><span style={{fontWeight:600}}>Motif :</span> {p.anamnese.slice(0,120)}{p.anamnese.length>120?'...':''}</div>}
                  {p.note && <div style={{fontSize:11,color:'#6b7280'}}><span style={{fontWeight:600}}>Note :</span> {p.note}</div>}
                </div>
              )}

              {p.faitPar && <div style={{marginTop:8,fontSize:10,color:'#9ca3af'}}>Prélevé par {p.faitPar}</div>}
            </div>
          ))}
        </div>
      </div>

      {showAjout && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}}>
          <div style={{background:'#fff',borderRadius:14,padding:20,width:'100%',maxWidth:420,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontWeight:700,fontSize:15,color:'#111827',marginBottom:4}}>✍️ Ajouter un patient prélevé (panne)</div>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:14,lineHeight:1.4}}>
              À utiliser quand le système est inaccessible (panne informatique) : notez le nom, le téléphone et l'adresse du patient prélevé pour pouvoir le recontacter.
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Nom *</label>
            <input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Prénom</label>
            <input value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Téléphone *</label>
            <input value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} type="tel"
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Village / Quartier / Adresse</label>
            <input value={form.ville} onChange={e=>setForm({...form,ville:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Note (facultatif)</label>
            <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} rows={2}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box',resize:'vertical'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Enregistré par</label>
            <input value={form.faitPar} onChange={e=>setForm({...form,faitPar:e.target.value})}
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 14px',boxSizing:'border-box'}}/>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowAjout(false);setForm(f=>({...FORM_VIDE,faitPar:f.faitPar}));}}
                style={{flex:1,padding:'10px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:13,cursor:'pointer'}}>
                Annuler
              </button>
              <button onClick={enregistrerManuel} disabled={envoi||!form.nom.trim()||!form.tel.trim()}
                style={{flex:1,padding:'10px',borderRadius:8,background:(envoi||!form.nom.trim()||!form.tel.trim())?'#fdba74':'#ea580c',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:(envoi||!form.nom.trim()||!form.tel.trim())?'not-allowed':'pointer'}}>
                {envoi?'Enregistrement...':'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
