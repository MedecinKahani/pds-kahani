'use client';
import { useState, useEffect } from 'react';

const PIN_CHEF = '023799';

export default function Admin() {
  const [pin, setPin] = useState('');
  const [debloque, setDebloque] = useState(false);
  const [erreur, setErreur] = useState('');
  const [users, setUsers] = useState([]);
  const [matricule, setMatricule] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState('as');
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await fetch('/api/users');
    const d = await r.json();
    setUsers(d.users || []);
  }

  useEffect(() => { if (debloque) load(); }, [debloque]);

  function verifierPin(e) {
    e.preventDefault();
    if (pin === PIN_CHEF) { setDebloque(true); setErreur(''); }
    else { setErreur('Code incorrect'); setPin(''); }
  }

  async function ajouter() {
    if (!matricule || !nom) return;
    const r = await fetch('/api/users', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'add', matricule, nom, role})
    });
    const d = await r.json();
    if (d.ok) { setMsg('Ajoute !'); setMatricule(''); setNom(''); load(); setTimeout(()=>setMsg(''),2000); }
  }

  async function supprimer(m) {
    if (!confirm('Supprimer '+m+' ?')) return;
    await fetch('/api/users', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'delete', matricule: m})
    });
    load();
  }

  const roleColor = {medecin:'#0d9488', ide:'#3b82f6', as:'#f59e0b'};
  const roleLabel = {medecin:'Medecin', ide:'Infirmier', as:'Aide-soignant'};

  if (!debloque) return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #e5e7eb',padding:'2rem',width:320,textAlign:'center'}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdfa',border:'2px solid #0d9488',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,margin:'0 auto 1rem'}}>🔒</div>
        <h1 style={{fontSize:18,fontWeight:700,color:'#111827',marginBottom:6}}>Acces chef</h1>
        <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Entrez votre code PIN</p>
        <form onSubmit={verifierPin}>
          <input
            type="password" value={pin} onChange={e=>setPin(e.target.value)}
            placeholder="Code PIN" autoFocus
            style={{width:'100%',padding:'12px',borderRadius:10,border:erreur?'2px solid #ef4444':'1.5px solid #e5e7eb',fontSize:20,textAlign:'center',letterSpacing:6,outline:'none',marginBottom:12,boxSizing:'border-box'}}
          />
          {erreur && <div style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{erreur}</div>}
          <button type="submit" style={{width:'100%',padding:'12px',borderRadius:10,background:'#0d9488',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            Valider
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',padding:'2rem',fontFamily:'system-ui'}}>
      <div style={{maxWidth:600,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <h1 style={{fontSize:20,fontWeight:700,color:'#111827'}}>Gestion des agents</h1>
          <button onClick={()=>setDebloque(false)} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>
            Verrouiller
          </button>
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem',marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:12}}>Ajouter un agent</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input value={matricule} onChange={e=>setMatricule(e.target.value.toUpperCase())}
              placeholder="Matricule" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,width:130,boxSizing:'border-box'}}/>
            <input value={nom} onChange={e=>setNom(e.target.value)}
              placeholder="Nom" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,flex:1,minWidth:120}}/>
            <select value={role} onChange={e=>setRole(e.target.value)}
              style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14}}>
              <option value="as">Aide-soignant</option>
              <option value="ide">Infirmier</option>
              <option value="medecin">Medecin</option>
            </select>
            <button onClick={ajouter} disabled={!matricule||!nom}
              style={{padding:'9px 18px',borderRadius:8,background:!matricule||!nom?'#e5e7eb':'#0d9488',color:!matricule||!nom?'#9ca3af':'#fff',fontWeight:600,fontSize:14,cursor:'pointer'}}>
              Ajouter
            </button>
          </div>
          {msg && <div style={{color:'#0d9488',fontSize:13,marginTop:8,fontWeight:600}}>{msg}</div>}
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem'}}>
          <h2 style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:12}}>Agents enregistres ({users.length})</h2>
          {users.length===0 && <div style={{color:'#9ca3af',fontSize:13}}>Aucun agent</div>}
          {users.map(u=>(
            <div key={u.matricule} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f3f4f6'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontWeight:700,color:'#111827',fontSize:14,fontFamily:'monospace'}}>{u.matricule}</span>
                <span style={{color:'#374151',fontSize:14}}>{u.nom}</span>
                <span style={{background:roleColor[u.role]+'22',color:roleColor[u.role],fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99}}>{roleLabel[u.role]||u.role}</span>
              </div>
              <button onClick={()=>supprimer(u.matricule)}
                style={{padding:'5px 12px',borderRadius:6,background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid #fecaca'}}>
                Retirer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
