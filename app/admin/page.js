'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const roleColor = {medecin:'#0d9488', ide:'#3b82f6', as:'#f59e0b'};
const roleLabel = {medecin:'Médecin', ide:'Infirmier', as:'Aide-soignant'};
const roleOrder = {medecin:0, ide:1, as:2};

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [matricule, setMatricule] = useState('');
  const [role, setRole] = useState('as');
  const [msg, setMsg] = useState('');
  const [userRole, setUserRole] = useState('medecin');

  useEffect(() => {
    try { setUserRole(JSON.parse(localStorage.getItem('pds_user')||'{}').role||'medecin'); } catch {}
  }, []);

  // Rôles créables selon le rôle connecté
  const rolesCreables = userRole === 'medecin'
    ? ['medecin','ide','as']
    : ['ide','as'];

  async function load() {
    const r = await fetch('/api/users');
    const d = await r.json();
    setUsers(d.users || []);
  }

  useEffect(() => { load(); }, []);

  async function ajouter() {
    if (!matricule || !nom || !prenom) return;
    const nomComplet = prenom.trim() + ' ' + nom.trim().toUpperCase();
    const r = await fetch('/api/users', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'add', matricule, nom: nomComplet, role})
    });
    const d = await r.json();
    if (d.ok) { setMsg('Ajouté !'); setMatricule(''); setNom(''); setPrenom(''); load(); setTimeout(()=>setMsg(''),2000); }
  }

  async function supprimer(m) {
    if (!confirm('Retirer '+m+' ?')) return;
    await fetch('/api/users', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'delete', matricule: m})
    });
    load();
  }

  // Tri : par métier puis alphabétique sur le nom de famille (dernier mot)
  const sorted = [...users].sort((a, b) => {
    const ro = (roleOrder[a.role]??9) - (roleOrder[b.role]??9);
    if (ro !== 0) return ro;
    const nomA = (a.nom||'').split(' ').pop().toUpperCase();
    const nomB = (b.nom||'').split(' ').pop().toUpperCase();
    return nomA.localeCompare(nomB, 'fr');
  });

  // Grouper par rôle
  const grouped = {};
  sorted.forEach(u => {
    const r = u.role || 'autre';
    if (!grouped[r]) grouped[r] = [];
    grouped[r].push(u);
  });

  const canAdd = matricule && nom && prenom;

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',padding:'2rem',fontFamily:'system-ui'}}>
      <div style={{maxWidth:600,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <button onClick={()=>router.back()} style={{width:34,height:34,borderRadius:'50%',background:'#fff',border:'1px solid #e5e7eb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#374151'}}>←</button>
          <h1 style={{fontSize:20,fontWeight:700,color:'#111827',margin:0}}>Liste des agents</h1>
        </div>

        {/* Formulaire ajout */}
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem',marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:12}}>Nouvel agent</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <input value={prenom} onChange={e=>setPrenom(e.target.value)}
              placeholder="Prénom" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,boxSizing:'border-box'}}/>
            <input value={nom} onChange={e=>setNom(e.target.value.toUpperCase())}
              placeholder="NOM" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,boxSizing:'border-box',fontWeight:600}}/>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input value={matricule} onChange={e=>setMatricule(e.target.value.toUpperCase())}
              placeholder="Matricule" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,width:140,boxSizing:'border-box',fontFamily:'monospace'}}/>
            <select value={role} onChange={e=>setRole(e.target.value)}
              style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:14,flex:1}}>
              {rolesCreables.map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
            <button onClick={ajouter} disabled={!canAdd}
              style={{padding:'9px 18px',borderRadius:8,background:canAdd?'#0d9488':'#e5e7eb',color:canAdd?'#fff':'#9ca3af',fontWeight:600,fontSize:14,cursor:canAdd?'pointer':'not-allowed',border:'none'}}>
              Ajouter
            </button>
          </div>
          {msg&&<div style={{color:'#0d9488',fontSize:13,marginTop:8,fontWeight:600}}>{msg}</div>}
        </div>

        {/* Liste triée par métier */}
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem'}}>
          <h2 style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:16}}>Agents ({users.length})</h2>
          {users.length===0&&<div style={{color:'#9ca3af',fontSize:13}}>Aucun agent enregistré</div>}
          {['medecin','ide','as'].map(r => {
            const groupe = grouped[r];
            if (!groupe || groupe.length === 0) return null;
            return (
              <div key={r} style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:roleColor[r],textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:roleColor[r]}}/>
                  {roleLabel[r]} ({groupe.length})
                </div>
                {groupe.map(u=>(
                  <div key={u.matricule} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderRadius:8,background:'#f9fafb',marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontWeight:600,color:'#374151',fontSize:14}}>{u.nom}</span>
                      <span style={{color:'#9ca3af',fontSize:12,fontFamily:'monospace'}}>{u.matricule}</span>
                    </div>
                    {userRole==='medecin'&&<button onClick={()=>supprimer(u.matricule)}
                      style={{padding:'4px 10px',borderRadius:6,background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid #fecaca'}}>
                      Retirer
                    </button>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
