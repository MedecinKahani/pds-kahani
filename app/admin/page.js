'use client';
import { useState, useEffect } from 'react';

export default function Admin() {
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

  useEffect(() => { load(); }, []);

  async function ajouter() {
    if (!matricule || !nom) return;
    const r = await fetch('/api/users', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'add', matricule, nom, role})
    });
    const d = await r.json();
    if (d.ok) { setMsg('Ajoute !'); setMatricule(''); setNom(''); load(); }
  }

  async function supprimer(m) {
    await fetch('/api/users', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'delete', matricule: m})
    });
    load();
  }

  const roleColor = {medecin:'#0d9488', ide:'#3b82f6', as:'#f59e0b'};

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',padding:'2rem',fontFamily:'system-ui'}}>
      <div style={{maxWidth:600,margin:'0 auto'}}>
        <h1 style={{fontSize:20,fontWeight:700,color:'#111827',marginBottom:24}}>Admin — Gestion des utilisateurs</h1>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem',marginBottom:20}}>
          <h2 style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:12}}>Ajouter un utilisateur</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input value={matricule} onChange={e=>setMatricule(e.target.value.toUpperCase())}
              placeholder="Matricule" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,width:130}}/>
            <input value={nom} onChange={e=>setNom(e.target.value)}
              placeholder="Nom" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,flex:1}}/>
            <select value={role} onChange={e=>setRole(e.target.value)}
              style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14}}>
              <option value="as">Aide-soignant</option>
              <option value="ide">Infirmier</option>
              <option value="medecin">Medecin</option>
            </select>
            <button onClick={ajouter}
              style={{padding:'9px 18px',borderRadius:8,background:'#0d9488',color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer'}}>
              Ajouter
            </button>
          </div>
          {msg && <div style={{color:'#0d9488',fontSize:13,marginTop:8}}>{msg}</div>}
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem'}}>
          <h2 style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:12}}>Utilisateurs ({users.length})</h2>
          {users.map(u => (
            <div key={u.matricule} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f3f4f6'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontWeight:700,color:'#111827',fontSize:14}}>{u.matricule}</span>
                <span style={{color:'#6b7280',fontSize:14}}>{u.nom}</span>
                <span style={{background:roleColor[u.role]+'22',color:roleColor[u.role],fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99}}>{u.role}</span>
              </div>
              <button onClick={()=>supprimer(u.matricule)}
                style={{padding:'5px 12px',borderRadius:6,background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid #fecaca'}}>
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
